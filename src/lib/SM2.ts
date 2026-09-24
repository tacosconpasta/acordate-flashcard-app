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
}
