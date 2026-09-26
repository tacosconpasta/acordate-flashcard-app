import { SM2 } from "./SM2";
import type { CardProgress } from "../models/progress";

const MS_PER_DAY = 86_400_000;

// Texto corto para un intervalo en días: "hoy", "1 d", "3 sem", "2 m"
export function formatInterval(days: number): string {
  //Intervalo 0 es una tarjeta que se repite en la misma sesión
  if (days <= 0) return "hoy";

  // Cada escala se usa hasta donde empieza la siguiente: días, semanas, meses, años
  if (days < 7) return `${days} d`;
  if (days < 30) return `${Math.round(days / 7)} sem`;
  if (days < 365) return `${Math.round(days / 30)} m`;

  //Con pocos años un decimal ayuda ("1.5 a"); con muchos ya no aporta nada
  const years = days / 365;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} a`;
}

//Días de calendario entre hoy y una fecha, negativo si ya pasó
function calendarDaysUntil(date: Date, now: Date): number {
  // Se recortan las horas de ambas fechas para comparar solo el día
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(date);
  b.setHours(0, 0, 0, 0);

  //Se redondea por si un cambio de horario deja el día con 23 o 25 horas
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

// Describe cuándo cae una fecha: "ahora", "mañana", "en 3 días", "hace 2 días"
export function describeDate(date: Date, now: Date): string {
  const days = calendarDaysUntil(date, now);

  //Fecha ya cumplida: si fue hoy es "ahora", si no se cuentan los días atrás
  if (date.getTime() <= now.getTime()) {
    if (days >= 0) return "ahora";
    if (days === -1) return "hace 1 día";
    return `hace ${-days} días`;
  }

  //Fecha futura: primero los casos con palabra propia, luego las escalas
  if (days <= 0) return "hoy";
  if (days === 1) return "mañana";
  if (days < 30) return `en ${days} días`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "en 1 mes" : `en ${months} meses`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? "en 1 año" : `en ${years} años`;
}

// Texto para mostrar junto a una tarjeta en un listado
export function describeCardDue(card: CardProgress, now: Date): string {
  const sm2 = new SM2(now);

  //Los estados van de más urgente a menos: nueva, pendiente, programada
  if (sm2.isNew(card)) return "Nueva";
  if (sm2.isDue(card) || card.due === null) return "Pendiente";

  // Una fecha que no se puede leer se muestra como pendiente antes que ocultarla
  const due = new Date(card.due);
  if (Number.isNaN(due.getTime())) return "Pendiente";

  return `Vence ${describeDate(due, now)}`;
}

// Resumen de pendientes de un mazo: "5 pendientes · 2 nuevas" o "Al día"
export function describePending(due: number, fresh: number): string {
  //Sin pendientes no hay nada que repasar, aunque haya nuevas
  if (due === 0) return "Al día";

  // Las nuevas se agregan como segunda parte solo si hay alguna
  const parts = [`${due} ${due === 1 ? "pendiente" : "pendientes"}`];
  if (fresh > 0) parts.push(`${fresh} ${fresh === 1 ? "nueva" : "nuevas"}`);
  return parts.join(" · ");
}
