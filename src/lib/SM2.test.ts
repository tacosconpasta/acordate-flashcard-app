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
