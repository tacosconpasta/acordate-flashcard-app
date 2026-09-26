/**
 * Matemática del gesto de deslizar en la vista de práctica.
 *
 * Vive fuera del componente para poder probarla con números: cuánto
 * resplandor mostrar según el arrastre, si un gesto cuenta como toque, y si
 * al soltar la tarjeta se califica o vuelve a su sitio.
 */

// Píxeles de arrastre a partir de los cuales soltar califica la tarjeta
export const SWIPE_DISTANCE = 120;

//Velocidad en px/ms a partir de la cual un lanzamiento califica aunque sea corto
export const SWIPE_SPEED = 0.45;

// Píxeles iniciales sin respuesta visual, para que un toque torpe no encienda nada
export const DEAD_ZONE = 12;

//Un gesto más corto y más lento que esto es un toque, no un arrastre
export const TAP_DISTANCE = 10;
export const TAP_SPEED = 0.3;

export type SwipeDirection = "right" | "left" | "none";

export interface Sample {
  x: number;
  y: number;
  t: number;
}

/**
 * Cuánto se acerca la tarjeta a un lado, de -1 (izquierda) a 1 (derecha).
 * Dentro de la zona muerta es 0. Después crece con una curva cuadrática, así
 * los primeros milímetros casi no se notan y el resplandor se vuelve evidente
 * solo cerca del umbral de calificar.
 */
export function swipeProgress(dx: number): number {
  const distance = Math.abs(dx) - DEAD_ZONE;
  if (distance <= 0) return 0;

  // Fracción del recorrido entre la zona muerta y el umbral, con tope en 1
  const linear = Math.min(distance / (SWIPE_DISTANCE - DEAD_ZONE), 1);

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

/**
 * Decide qué pasa al soltar la tarjeta con la respuesta visible.
 * Se califica si el gesto es más horizontal que vertical y además llegó al
 * umbral de distancia o fue un lanzamiento rápido en horizontal.
 */
export function decideSwipe(dx: number, dy: number, vx: number, vy: number): SwipeDirection {
  //Un arrastre que se fue más hacia arriba o abajo que hacia un lado no califica
  const horizontal = Math.abs(dx) > Math.abs(dy);
  if (!horizontal) return "none";

  const speed = Math.sqrt(vx * vx + vy * vy);

  // Dos formas de confirmar: arrastrar lejos, o lanzar rápido en horizontal
  const farEnough = Math.abs(dx) > SWIPE_DISTANCE;
  const fastEnough = speed > SWIPE_SPEED && Math.abs(vx) > Math.abs(vy);
  if (!farEnough && !fastEnough) return "none";

  return dx > 0 ? "right" : "left";
}
