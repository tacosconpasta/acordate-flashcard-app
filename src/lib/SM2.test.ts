/**
 * Pruebas unitarias de la clase SM2.
 *
 * Solo se prueba la lógica del algoritmo, sin base de datos ni interfaz.
 * Todas las pruebas usan la misma fecha fija, así los intervalos y las
 * fechas de vencimiento son siempre iguales sin importar cuándo se corran.
 */

import { describe, expect, it } from "vitest";
import { SM2 } from "./SM2";

// Fecha fija que hace de "ahora" en todas las pruebas, a media tarde para
// comprobar que el vencimiento se recorta a la medianoche y no suma 24 horas
const NOW = new Date("2026-03-10T15:00:00");

//Un día en milisegundos, para simular que pasó el tiempo
const DAY = 86_400_000;

// Instancia compartida: el constructor recibe NOW en vez de usar el reloj real
const sm2 = new SM2(NOW);

describe("tarjeta nueva", () => {
  it("nace sin repasos, con facilidad 2.5 y pendiente", () => {
    const card = SM2.fresh();

    // Toda tarjeta empieza con la facilidad inicial del algoritmo
    expect(card.ease_factor).toBe(SM2.INITIAL_EASE);

    //Nunca se ha practicado, así que es nueva y por lo tanto pendiente
    expect(sm2.isNew(card)).toBe(true);
    expect(sm2.isDue(card)).toBe(true);
  });

  it("al recordarla vence al día siguiente", () => {
    const next = sm2.rate(SM2.fresh(), true);

    // Primer acierto: intervalo de 1 día y racha de 1
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);

    //Con calidad 4 la facilidad no cambia
    expect(next.ease_factor).toBe(SM2.INITIAL_EASE);

    // Queda registrado el momento del repaso, a partir de aquí deja de ser nueva
    expect(next.last_practiced).toBe(NOW.toISOString());

    // Vence a la medianoche siguiente, no 24 horas después
    const due = new Date(next.due!);
    expect(due.getDate()).toBe(NOW.getDate() + 1);
    expect(due.getHours()).toBe(0);

    //Hoy ya no está pendiente, pero un día después sí
    expect(sm2.isDue(next)).toBe(false);
    expect(new SM2(new Date(NOW.getTime() + DAY)).isDue(next)).toBe(true);
  });

  it("al olvidarla sigue pendiente y baja la facilidad", () => {
    const next = sm2.rate(SM2.fresh(), false);

    // Al olvidar el intervalo y la racha vuelven a 0
    expect(next.interval).toBe(0);
    expect(next.repetitions).toBe(0);

    //Con calidad 1 la fórmula resta 0.54 a la facilidad
    expect(next.ease_factor).toBeCloseTo(2.5 - 0.54, 5);

    // Ya se practicó, así que no es nueva, pero sigue pendiente para repetirla en la sesión
    expect(sm2.isNew(next)).toBe(false);
    expect(sm2.isDue(next)).toBe(true);
  });

  it("no modifica la tarjeta original", () => {
    const original = SM2.fresh();

    //Se descarta el resultado a propósito, solo interesa el efecto sobre la entrada
    sm2.rate(original, true);

    // La tarjeta recibida debe seguir igual que una recién creada
    expect(original).toEqual(SM2.fresh());
  });
});

describe("secuencia de aciertos", () => {
  it("sigue la progresión 1, 6, 15, 38 días", () => {
    let card = SM2.fresh();
    const intervals: number[] = [];

    // Se recuerda cuatro veces seguidas y se anota el intervalo de cada acierto
    for (let i = 0; i < 4; i++) {
      card = sm2.rate(card, true);
      intervals.push(card.interval);
    }

    // 1 y 6 son fijos, después se multiplica por la facilidad 2.5: 6 * 2.5 = 15, 15 * 2.5 = 37.5 que redondea a 38
    expect(intervals).toEqual([1, 6, 15, 38]);

    //La racha cuenta los cuatro aciertos
    expect(card.repetitions).toBe(4);
  });

  it("nunca supera el intervalo máximo", () => {
    let card = SM2.fresh();

    // Con 40 aciertos el intervalo crecería a siglos si no hubiera tope
    for (let i = 0; i < 40; i++) card = sm2.rate(card, true);

    //El intervalo se queda clavado en el máximo de 10 años
    expect(card.interval).toBe(SM2.MAX_INTERVAL);
  });
});

//Simular olvidos
describe("olvidos", () => {
  //Tarjeta con tres aciertos seguidos: intervalo 15 y facilidad todavía en 2.5
  const learned = sm2.rate(sm2.rate(sm2.rate(SM2.fresh(), true), true), true);

  it("reinician el conteo pero conservan la facilidad reducida", () => {
    const forgot = sm2.rate(learned, false);

    // La racha y el intervalo vuelven a 0, la tarjeta se repite hoy
    expect(forgot.repetitions).toBe(0);
    expect(forgot.interval).toBe(0);

    //La facilidad no se reinicia, queda más baja como castigo por el olvido
    expect(forgot.ease_factor).toBeLessThan(learned.ease_factor);
  });

  it("después de olvidar se vuelve a empezar en 1 y 6 días", () => {
    const forgot = sm2.rate(learned, false);
    const again = sm2.rate(forgot, true);

    // Como la racha volvió a 0, los dos primeros aciertos usan los intervalos fijos otra vez
    expect(again.interval).toBe(1);
    expect(sm2.rate(again, true).interval).toBe(6);
  });

  it("los intervalos crecen más lento tras varios olvidos", () => {
    let hard = SM2.fresh();

    // Cinco olvidos seguidos bajan la facilidad hasta el piso de 1.3
    for (let i = 0; i < 5; i++) hard = sm2.rate(hard, false);
    expect(hard.ease_factor).toBe(SM2.MIN_EASE);

    //Después se recuerda tres veces, igual que una tarjeta que nunca falló
    for (let i = 0; i < 3; i++) hard = sm2.rate(hard, true);
    const third = sm2.rate(sm2.rate(sm2.rate(SM2.fresh(), true), true), true);

    // Al tercer acierto la difícil llega a 6 * 1.3 = 8 días, la fácil a 6 * 2.5 = 15
    expect(hard.interval).toBeLessThan(third.interval);
  });
});

describe("utilidades", () => {
  it("preview muestra el intervalo de cada gesto", () => {
    const p = sm2.preview(SM2.fresh());

    //Para una tarjeta nueva, recordar da 1 día y olvidar la deja para hoy
    expect(p).toEqual({ remembered: 1, forgot: 0 });
  });

  it("stats y nextDueDate resumen un mazo", () => {
    // Mazo de prueba: una nueva, una que vence mañana, una en seis días y una olvidada hoy
    const fresh = SM2.fresh();
    const tomorrow = sm2.rate(SM2.fresh(), true);
    const inSixDays = sm2.rate(tomorrow, true);
    const forgot = sm2.rate(SM2.fresh(), false);

    // Pendientes son la nueva y la olvidada, nueva solo la que nunca se practicó
    const stats = sm2.stats([fresh, tomorrow, inSixDays, forgot]);
    expect(stats).toEqual({ total: 4, due: 2, fresh: 1 });

    // De las que aún no vencen, la más cercana es la de mañana
    expect(
      sm2.nextDueDate([fresh, tomorrow, inSixDays, forgot])?.toISOString()
    ).toBe(tomorrow.due);

    //Si todas están pendientes no hay próxima fecha que mostrar
    expect(sm2.nextDueDate([fresh, forgot])).toBeNull();
  });

  it("una fecha inválida se trata como pendiente", () => {
    // Se simula un dato corrupto en la base de datos sobre una tarjeta ya practicada
    const broken = { ...sm2.rate(SM2.fresh(), true), due: "no-es-fecha" };

    //Mejor mostrarla de más que perderla por un dato ilegible
    expect(sm2.isDue(broken)).toBe(true);
  });
});
