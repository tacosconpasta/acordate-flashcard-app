/**
 * Pruebas de la matemática del gesto de lanzar.
 * Son números puros: no hay puntero, tarjeta ni DOM.
 */

import { describe, expect, it } from "vitest";
import {
  DEAD_ZONE,
  FLY_DURATION,
  THROW_DISTANCE,
  THROW_SPEED,
  flightEnd,
  isTap,
  isThrow,
  landingSide,
  swipeProgress,
  velocity,
} from "./Swipe";

describe("swipeProgress", () => {
  it("es 0 en reposo y dentro de la zona muerta", () => {
    expect(swipeProgress(0)).toBe(0);
    expect(swipeProgress(DEAD_ZONE - 1)).toBe(0);

    //Hacia la izquierda también, y sin devolver -0
    expect(swipeProgress(-(DEAD_ZONE - 1))).toBe(0);
  });

  it("llega a 1 en el umbral y no pasa de ahí", () => {
    expect(swipeProgress(THROW_DISTANCE)).toBe(1);
    expect(swipeProgress(THROW_DISTANCE * 3)).toBe(1);
  });

  it("es negativo hacia la izquierda y simétrico", () => {
    expect(swipeProgress(-THROW_DISTANCE)).toBe(-1);

    // Misma magnitud a ambos lados para cualquier distancia
    expect(swipeProgress(-70)).toBeCloseTo(-swipeProgress(70), 10);
  });

  it("crece despacio al principio y rápido cerca del umbral", () => {
    //A mitad del recorrido la curva cuadrática da 0.25, no 0.5
    const half = DEAD_ZONE + (THROW_DISTANCE - DEAD_ZONE) / 2;
    expect(swipeProgress(half)).toBeCloseTo(0.25, 10);

    // Y siempre va en aumento
    expect(swipeProgress(40)).toBeLessThan(swipeProgress(80));
    expect(swipeProgress(80)).toBeLessThan(swipeProgress(110));
  });

  it("acepta otro rango para medirlo respecto a la pantalla", () => {
    //Con un rango de 300 px, a 120 px todavía no llega ni a la mitad
    expect(swipeProgress(120, 300)).toBeLessThan(0.25);
    expect(swipeProgress(300, 300)).toBe(1);
    expect(swipeProgress(-300, 300)).toBe(-1);
  });
});

describe("velocity", () => {
  it("promedia entre la primera y la última muestra", () => {
    const v = velocity([
      { x: 0, y: 0, t: 1000 },
      { x: 50, y: 10, t: 1100 },
      { x: 100, y: -20, t: 1200 },
    ]);

    //100 px en 200 ms hacia la derecha, -20 px en 200 ms hacia arriba
    expect(v.vx).toBeCloseTo(0.5, 10);
    expect(v.vy).toBeCloseTo(-0.1, 10);
  });

  it("es 0 sin muestras suficientes o sin tiempo transcurrido", () => {
    expect(velocity([])).toEqual({ vx: 0, vy: 0 });
    expect(velocity([{ x: 5, y: 5, t: 1000 }])).toEqual({ vx: 0, vy: 0 });

    // Dos eventos con el mismo timestamp no permiten dividir
    expect(velocity([{ x: 0, y: 0, t: 1000 }, { x: 30, y: 0, t: 1000 }])).toEqual({ vx: 0, vy: 0 });
  });
});

describe("isTap", () => {
  it("acepta un gesto corto y lento", () => {
    expect(isTap(3, 0.05)).toBe(true);
  });

  it("rechaza un gesto largo o rápido", () => {
    //Un golpe seco casi sin desplazamiento tampoco cuenta como toque
    expect(isTap(3, 0.6)).toBe(false);
    expect(isTap(25, 0.05)).toBe(false);
  });
});

describe("isThrow", () => {
  it("acepta un arrastre largo aunque se suelte despacio", () => {
    expect(isThrow(THROW_DISTANCE + 1, 0)).toBe(true);
  });

  it("acepta un gesto corto si fue rápido", () => {
    expect(isThrow(30, THROW_SPEED + 0.1)).toBe(true);
  });

  it("rechaza un arrastre corto y lento, que vuelve a su sitio", () => {
    expect(isThrow(60, 0.1)).toBe(false);
  });
});

describe("flightEnd", () => {
  it("prolonga el gesto en la dirección de la velocidad", () => {
    const end = flightEnd(100, -20, 1, 0.5);

    // Cada componente suma velocidad por duración, con el factor de empuje 1.4
    expect(end.x).toBeCloseTo(100 + 1 * FLY_DURATION * 1.4, 10);
    expect(end.y).toBeCloseTo(-20 + 0.5 * FLY_DURATION * 1.4, 10);
  });

  it("sin velocidad empuja 700 px en la dirección del arrastre", () => {
    //Arrastre puro hacia la izquierda: termina 700 px a la izquierda
    expect(flightEnd(-150, 0, 0, 0)).toEqual({ x: -700, y: 0 });

    // En diagonal se conserva la proporción entre ejes
    const end = flightEnd(30, 40, 0, 0);
    expect(end.x).toBeCloseTo(420, 10);
    expect(end.y).toBeCloseTo(560, 10);
  });
});

describe("landingSide", () => {
  it("es derecha cuando el centro pasa la mitad de la pantalla", () => {
    expect(landingSide(201, 400)).toBe("right");
    expect(landingSide(900, 400)).toBe("right");
  });

  it("es izquierda en la mitad exacta o antes", () => {
    //Caer justo en el centro no cuenta como acierto
    expect(landingSide(200, 400)).toBe("left");
    expect(landingSide(-300, 400)).toBe("left");
  });
});
