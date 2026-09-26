/**
 * Matemática del gesto de lanzar en la vista de práctica.
 *
 * Vive fuera del componente para poder probarla con números: si un gesto es
 * un toque, si cuenta como lanzamiento, hasta dónde vuela la tarjeta y de qué
 * lado de la pantalla cae. El lanzamiento es libre: cualquier dirección vale,
 * y solo importa si la tarjeta termina a la derecha o a la izquierda de la
 * mitad de la pantalla.
 */

// Píxeles de arrastre a partir de los cuales soltar cuenta como lanzamiento
export const THROW_DISTANCE = 120;

//Velocidad en px/ms a partir de la cual un gesto corto también cuenta como lanzamiento
export const THROW_SPEED = 0.45;

// Píxeles iniciales sin respuesta visual, para que un toque torpe no encienda nada
export const DEAD_ZONE = 12;

//Un gesto más corto y más lento que esto es un toque, no un arrastre
export const TAP_DISTANCE = 10;
export const TAP_SPEED = 0.3;

// Duración del vuelo en ms, la misma que usa la transición CSS de la tarjeta
export const FLY_DURATION = 400;

export type Side = "right" | "left";

export interface Sample {
  x: number;
  y: number;
  t: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Cuánto se acerca la tarjeta a un lado, de -1 (izquierda) a 1 (derecha).
 * Dentro de la zona muerta es 0. Después crece con una curva cuadrática, así
 * los primeros milímetros casi no se notan y el resplandor se vuelve evidente
 * solo cerca del umbral de lanzamiento.
 */
export function swipeProgress(dx: number): number {
  const distance = Math.abs(dx) - DEAD_ZONE;
  if (distance <= 0) return 0;

  // Fracción del recorrido entre la zona muerta y el umbral, con tope en 1
  const linear = Math.min(distance / (THROW_DISTANCE - DEAD_ZONE), 1);

  //Elevar al cuadrado suaviza la entrada sin cambiar los extremos 0 y 1
  return Math.sign(dx) * linear * linear;
}

//Velocidad media en px/ms de las últimas muestras del puntero
export function velocity(samples: Sample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };

  // Se compara la primera y la última muestra del buffer, no cada par
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };

  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

// Un toque es un gesto que casi no se movió y que no fue un golpe rápido
export function isTap(distance: number, speed: number): boolean {
  return distance < TAP_DISTANCE && speed < TAP_SPEED;
}

//Un lanzamiento es un gesto largo, o uno corto pero rápido; lo demás vuelve a su sitio
export function isThrow(distance: number, speed: number): boolean {
  return distance > THROW_DISTANCE || speed > THROW_SPEED;
}

/**
 * Punto donde termina la tarjeta después del vuelo, relativo a donde empezó.
 * Con velocidad se prolonga el gesto en esa dirección; sin velocidad se
 * empuja lejos en la dirección del arrastre para que salga de pantalla.
 */
export function flightEnd(dx: number, dy: number, vx: number, vy: number): Point {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > 0.05) {
    return { x: dx + vx * FLY_DURATION * 1.4, y: dy + vy * FLY_DURATION * 1.4 };
  }

  // Sin velocidad: 700 px en la dirección del arrastre bastan para cualquier pantalla
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: (dx / len) * 700, y: (dy / len) * 700 };
}

// De qué lado cae la tarjeta: derecha si su centro queda más allá de la mitad de la pantalla
export function landingSide(centerX: number, screenWidth: number): Side {
  return centerX > screenWidth / 2 ? "right" : "left";
}
