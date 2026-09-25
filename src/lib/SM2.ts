/**
 * Implementación del algoritmo SM-2 (SuperMemo 2) para repaso espaciado.
 *
 * La idea del algoritmo es simple: cada vez que el usuario recuerda una
 * tarjeta, el tiempo hasta el próximo repaso crece multiplicándolo por un
 * "factor de facilidad". Si la olvida, el conteo se reinicia y la tarjeta se
 * vuelve a estudiar desde cero.
 *
 * SM-2 original usa una calidad de respuesta de 0 a 5. En esta app solo hay
 * dos gestos (deslizar a la derecha o a la izquierda), así que se fijan dos
 * valores de calidad: 4 para "recordada" y 1 para "olvidada".
 *
 * Referencia: https://super-memory.com/english/ol/sm2.htm
 */

//Campos de programación que se guardan en cada tarjeta
export interface ScheduleFields {
  interval: number; //días hasta el próximo repaso (0 = hoy mismo)
  repetitions: number; //aciertos seguidos desde el último olvido
  ease_factor: number; //facilidad de la tarjeta, empieza en 2.5 y nunca baja de 1.3
  due: string | null; //fecha ISO del próximo repaso, null si nunca se ha estudiado
  last_practiced: string | null; //fecha ISO del último repaso
}

// Resumen de un grupo de tarjetas, para mostrar en los listados
export interface ScheduleStats {
  total: number;
  due: number; //pendientes ahora, incluye las nuevas
  fresh: number; //nuevas, nunca repasadas
}

const MS_PER_DAY = 86_400_000;

export class SM2 {
  // Constantes del algoritmo
  static readonly INITIAL_EASE = 2.5;
  static readonly MIN_EASE = 1.3;
  static readonly MAX_INTERVAL = 365 * 10; //tope de 10 años para no generar fechas absurdas

  // Calidad de respuesta que se le asigna a cada gesto.
  // 4 = "respuesta correcta después de dudar", 1 = "respuesta incorrecta,
  // pero al ver la respuesta la recordaba". Son los valores intermedios de
  // la escala 0 a 5 de SM-2 y dan un comportamiento equilibrado con solo dos posibilidades.
  static readonly QUALITY_REMEMBERED = 4;
  static readonly QUALITY_FORGOT = 1;

  //El momento "actual" se recibe en el constructor para poder probar la clase con fechas fijas
  constructor(private readonly now: Date = new Date()) {}

  // Campos con los que nace una tarjeta que nunca se ha estudiado.
  static fresh(): ScheduleFields {
    return {
      interval: 0, //sin intervalo todavía, se estudia hoy
      repetitions: 0, //ningún acierto acumulado
      ease_factor: SM2.INITIAL_EASE, //todas las tarjetas empiezan con la misma facilidad
      due: null, // sin fecha: null marca que nunca se ha visto
      last_practiced: null,
    };
  }

  /* Una tarjeta es nueva si nunca se ha repasado. */
  isNew(card: ScheduleFields): boolean {
    //Basta con revisar si alguna vez se practicó, no hace falta un campo de estado aparte
    return card.last_practiced === null;
  }

  /**
   * Una tarjeta está pendiente si es nueva o si su fecha de repaso ya llegó.
   * Si la fecha guardada no se puede leer, se trata como pendiente para no
   * "perder" tarjetas por un dato corrupto.
   */
  isDue(card: ScheduleFields): boolean {
    // Las nuevas siempre están pendientes, igual que una tarjeta sin fecha
    if (this.isNew(card) || card.due === null) return true;

    //Se convierte el texto ISO a milisegundos para poder compararlo
    const due = new Date(card.due).getTime();
    if (Number.isNaN(due)) return true; //fecha ilegible, mejor mostrarla que ocultarla

    // Pendiente si la fecha de repaso es ahora o ya pasó
    return due <= this.now.getTime();
  }

  /**
   * Calcula los nuevos campos de una tarjeta después de calificarla.
   * No modifica la tarjeta recibida, devuelve una copia actualizada.
   *
   * Pasos del algoritmo:
   * 1. Se ajusta la facilidad según la calidad de la respuesta.
   * 2. Si se recordó, el intervalo crece: 1 día, luego 6, luego el intervalo
   *    anterior multiplicado por la facilidad. El conteo de aciertos sube.
   * 3. Si se olvidó, el conteo vuelve a 0 y el intervalo a 0 días, así la
   *    tarjeta se repite en la misma sesión hasta que se recuerde.
   * 4. Se calcula la fecha de vencimiento a partir del intervalo.
   */
  rate(card: ScheduleFields, remembered: boolean): ScheduleFields {
    // Se traduce el gesto a la escala 0 a 5 que espera SM-2
    const quality = remembered ? SM2.QUALITY_REMEMBERED : SM2.QUALITY_FORGOT;

    //La facilidad se recalcula siempre, se haya acertado o no
    const ease = this.nextEase(card.ease_factor, quality);

    let repetitions: number;
    let interval: number;

    if (remembered) {
      repetitions = card.repetitions + 1; //un acierto más en la racha

      // El intervalo se calcula con el conteo anterior, por eso se pasa card.repetitions y no repetitions
      interval = this.nextInterval(card.repetitions, card.interval, ease);
    } else {
      //Al olvidar se empieza de nuevo, pero la facilidad ya bajó, así que los
      //próximos intervalos crecerán más lento que la primera vez
      repetitions = 0;
      interval = 0; //0 días = se repite hoy mismo
    }

    return {
      interval,
      repetitions,
      ease_factor: ease,
      due: this.dueDateFor(interval), // la fecha sale del intervalo recién calculado
      last_practiced: this.now.toISOString(), //a partir de aquí la tarjeta deja de ser nueva
    };
  }

  /**
   * Intervalo en días que obtendría la tarjeta con cada gesto.
   * Sirve para mostrar una pista debajo de la tarjeta antes de calificar.
   */
  preview(card: ScheduleFields): { remembered: number; forgot: number } {
    //Como rate no modifica la tarjeta, se puede "simular" cada gesto sin guardar nada
    return {
      remembered: this.rate(card, true).interval,
      forgot: this.rate(card, false).interval, // siempre 0, la tarjeta se repite hoy
    };
  }

  /** Cuenta cuántas tarjetas hay en total, cuántas están pendientes y cuántas son nuevas. */
  stats(cards: ScheduleFields[]): ScheduleStats {
    const stats: ScheduleStats = { total: cards.length, due: 0, fresh: 0 };

    for (const card of cards) {
      if (this.isDue(card)) stats.due++; // las nuevas también cuentan como pendientes
      if (this.isNew(card)) stats.fresh++; //y además se cuentan aparte para mostrar "N nuevas"
    }

    return stats;
  }

  /**
   * Fecha del próximo repaso más cercano entre las tarjetas que todavía no
   * están pendientes. Devuelve null si no hay ninguna programada.
   */
  nextDueDate(cards: ScheduleFields[]): Date | null {
    let closest: number | null = null; //se guarda en milisegundos para comparar fácil

    for (const card of cards) {
      // Las pendientes no interesan aquí, se busca la próxima que vencerá
      if (this.isDue(card) || card.due === null) continue;

      const time = new Date(card.due).getTime();
      if (Number.isNaN(time)) continue; //fecha corrupta, se ignora

      //Se queda con la fecha más pequeña, es decir la más cercana
      if (closest === null || time < closest) closest = time;
    }

    return closest === null ? null : new Date(closest);
  }

  /**
   * Fórmula original de SM-2 para la facilidad:
   *   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   * Con q = 4 la facilidad no cambia, con q = 1 baja 0.54.
   * Como el constraint original de la fórmula lo específica: bunca se deja bajar EF de 1.3 porque los intervalos crecerían demasiado lento.
   */
  private nextEase(ease: number, quality: number): number {
    const diff = 5 - quality; //qué tan lejos quedó la respuesta de "perfecta"

    // Respuestas perfectas suman 0.1, cada punto por debajo resta cada vez más
    const next = ease + (0.1 - diff * (0.08 + diff * 0.02));

    return Math.max(next, SM2.MIN_EASE); //Maximo entre el EF y la constante de 1.3
  }

  /**
   * Intervalo siguiente cuando la respuesta fue correcta:
   *   primer acierto -> 1 día
   *   segundo acierto -> 6 días
   *   después -> intervalo anterior * facilidad, redondeado
   */
  private nextInterval(
    repetitions: number,
    interval: number,
    ease: number
  ): number {
    /*Valores de intervalos recomendados por el algoritmo original*/
    if (repetitions === 0) return 1; //primer acierto: se ve mañana
    if (repetitions === 1) return 6; //segundo acierto: se ve en una semana aprox.

    // A partir del tercero el intervalo crece multiplicando por la facilidad;
    // se redondea porque los intervalos se manejan en días enteros
    return Math.min(Math.round(interval * ease), SM2.MAX_INTERVAL);
  }

  /**
   * Convierte un intervalo en días a una fecha de vencimiento.
   * Un intervalo de 0 vence ahora mismo (la tarjeta se repite en la sesión).
   * Para intervalos en días la fecha se fija a la medianoche, así una tarjeta
   * de 1 día aparece a la mañana siguiente y no 24 horas después.
   */
  private dueDateFor(interval: number): string {
    if (interval <= 0) return this.now.toISOString(); //vence ya, sigue pendiente en la sesión

    // Se suman los días en milisegundos a la fecha actual
    const due = new Date(this.now.getTime() + interval * MS_PER_DAY);
    due.setHours(0, 0, 0, 0); //se recorta la hora para que venza al empezar ese día

    return due.toISOString(); // se guarda como texto ISO, que SQLite puede ordenar y comparar
  }
}
