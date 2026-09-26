/**
 * Pruebas de la matemática del gesto de deslizar.
 * Son números puros: no hay puntero, tarjeta ni DOM.
 */

import { describe, expect, it } from "vitest";
import {
  DEAD_ZONE,
  SWIPE_DISTANCE,
  decideSwipe,
  isTap,
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
    expect(swipeProgress(SWIPE_DISTANCE)).toBe(1);
    expect(swipeProgress(SWIPE_DISTANCE * 3)).toBe(1);
  });

  it("es negativo hacia la izquierda y simétrico", () => {
    expect(swipeProgress(-SWIPE_DISTANCE)).toBe(-1);

    // Misma magnitud a ambos lados para cualquier distancia
    expect(swipeProgress(-70)).toBeCloseTo(-swipeProgress(70), 10);
  });

  it("crece despacio al principio y rápido cerca del umbral", () => {
    //A mitad del recorrido la curva cuadrática da 0.25, no 0.5
    const half = DEAD_ZONE + (SWIPE_DISTANCE - DEAD_ZONE) / 2;
    expect(swipeProgress(half)).toBeCloseTo(0.25, 10);

    // Y siempre va en aumento
    expect(swipeProgress(40)).toBeLessThan(swipeProgress(80));
    expect(swipeProgress(80)).toBeLessThan(swipeProgress(110));
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

describe("decideSwipe", () => {
  it("califica al soltar más allá del umbral", () => {
    expect(decideSwipe(SWIPE_DISTANCE + 1, 10, 0, 0)).toBe("right");
    expect(decideSwipe(-(SWIPE_DISTANCE + 1), 10, 0, 0)).toBe("left");
  });

  it("vuelve a su sitio si el arrastre fue corto", () => {
    expect(decideSwipe(60, 5, 0.1, 0)).toBe("none");
  });

  it("califica con un lanzamiento rápido aunque sea corto", () => {
    // 30 px de arrastre pero soltada a 0.8 px/ms hacia la derecha
    expect(decideSwipe(30, 5, 0.8, 0.1)).toBe("right");
    expect(decideSwipe(-30, 5, -0.8, 0.1)).toBe("left");
  });

  it("ignora gestos más verticales que horizontales", () => {
    //Arrastre lejano pero hacia abajo
    expect(decideSwipe(80, 200, 0, 0)).toBe("none");

    // Lanzamiento rápido pero en diagonal hacia arriba
    expect(decideSwipe(60, 70, 0.4, -0.6)).toBe("none");
  });
});
