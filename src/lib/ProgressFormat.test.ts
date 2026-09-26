/**
 * Pruebas de los textos de progreso que muestran las vistas.
 *
 * Todas usan la misma fecha fija como "ahora", así los textos relativos
 * ("mañana", "hace 2 días") no dependen del día en que se corran.
 */

import { describe, expect, it } from "vitest";
import { SM2 } from "./SM2";
import {
  describeCardDue,
  describeDate,
  describePending,
  formatInterval,
} from "./ProgressFormat";

// Martes 10 de marzo a media tarde, la misma fecha que usan las pruebas de SM2
const NOW = new Date("2026-03-10T15:00:00");

//Un día en milisegundos, para desplazar fechas desde NOW
const DAY = 86_400_000;

// Fecha a tantos días de NOW, a la misma hora
function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY);
}

describe("formatInterval", () => {
  it("usa 'hoy' para un intervalo de 0 días", () => {
    expect(formatInterval(0)).toBe("hoy");
  });

  it("muestra días hasta la semana", () => {
    expect(formatInterval(1)).toBe("1 d");
    expect(formatInterval(6)).toBe("6 d");
  });

  it("muestra semanas hasta el mes", () => {
    //7 días es una semana, 15 días se redondea a dos
    expect(formatInterval(7)).toBe("1 sem");
    expect(formatInterval(15)).toBe("2 sem");
  });

  it("muestra meses hasta el año", () => {
    expect(formatInterval(30)).toBe("1 m");
    expect(formatInterval(100)).toBe("3 m");
  });

  it("muestra años con un decimal, y sin decimal a partir de diez", () => {
    // Intervalos largos se leen mejor con un decimal, salvo cuando ya son muchos años
    expect(formatInterval(365)).toBe("1.0 a");
    expect(formatInterval(730)).toBe("2.0 a");
    expect(formatInterval(SM2.MAX_INTERVAL)).toBe("10 a");
  });
});

describe("describeDate", () => {
  it("dice 'ahora' para una fecha de hoy que ya pasó", () => {
    expect(describeDate(daysFromNow(-0.1), NOW)).toBe("ahora");
  });

  it("cuenta los días hacia atrás", () => {
    expect(describeDate(daysFromNow(-1), NOW)).toBe("hace 1 día");
    expect(describeDate(daysFromNow(-3), NOW)).toBe("hace 3 días");
  });

  it("dice 'hoy' para más tarde el mismo día", () => {
    //Faltan horas pero el día de calendario es el mismo
    expect(describeDate(daysFromNow(0.1), NOW)).toBe("hoy");
  });

  it("cuenta los días hacia adelante", () => {
    expect(describeDate(daysFromNow(1), NOW)).toBe("mañana");
    expect(describeDate(daysFromNow(3), NOW)).toBe("en 3 días");
  });

  it("pasa a meses y años cuando falta mucho", () => {
    // 30 días es un mes, 45 se redondea a dos
    expect(describeDate(daysFromNow(30), NOW)).toBe("en 1 mes");
    expect(describeDate(daysFromNow(45), NOW)).toBe("en 2 meses");
    expect(describeDate(daysFromNow(365), NOW)).toBe("en 1 año");
    expect(describeDate(daysFromNow(800), NOW)).toBe("en 2 años");
  });

  it("cuenta días de calendario, no bloques de 24 horas", () => {
    //Las 00:30 de mañana están a menos de 24 horas pero ya es otro día
    const earlyTomorrow = new Date("2026-03-11T00:30:00");
    expect(describeDate(earlyTomorrow, NOW)).toBe("mañana");
  });
});

describe("describeCardDue", () => {
  const sm2 = new SM2(NOW);

  //Si una tarjeta es fresca, esperar "Nueva"
  it("marca como nueva una tarjeta sin repasos", () => {
    expect(describeCardDue(SM2.fresh(), NOW)).toBe("Nueva");
  });

  it("marca como pendiente una tarjeta olvidada", () => {
    // Al olvidar el vencimiento es ahora mismo, así que ya está pendiente
    expect(describeCardDue(sm2.rate(SM2.fresh(), false), NOW)).toBe(
      "Pendiente"
    );
  });

  it("dice cuándo vence una tarjeta recordada", () => {
    //Un acierto la programa para la medianoche siguiente
    expect(describeCardDue(sm2.rate(SM2.fresh(), true), NOW)).toBe(
      "Vence mañana"
    );
  });

  it("trata una fecha inválida como pendiente", () => {
    const broken = { ...sm2.rate(SM2.fresh(), true), due: "no-es-fecha" };
    expect(describeCardDue(broken, NOW)).toBe("Pendiente");
  });
});

describe("describePending", () => {
  it("dice 'Al día' sin pendientes", () => {
    // Aunque haya nuevas, si due es 0 no hay nada que repasar
    expect(describePending(0, 0)).toBe("Al día");
  });

  it("concuerda en singular y plural", () => {
    expect(describePending(1, 0)).toBe("1 pendiente");
    expect(describePending(3, 1)).toBe("3 pendientes · 1 nueva");
    expect(describePending(5, 2)).toBe("5 pendientes · 2 nuevas");
  });
});
