/**
 * Pruebas de la capa de base de datos.
 *
 * No se abre una base real: el plugin de SQLite se reemplaza por una conexión
 * simulada que anota cada sentencia y sus parámetros. Así se comprueba qué SQL
 * se ejecuta y con qué valores, que es lo que importa de esta capa.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { SM2 } from "./SM2";
import type { Card, NewCard } from "../models/Card";

//Registro de lo que la conexión simulada recibe, compartido con el mock
type Call = { kind: "execute" | "query" | "run"; sql: string; params?: unknown[] };
const state = vi.hoisted(() => ({
  calls: [] as Call[],
  tables: {} as Record<string, unknown[]>,
}));

// El mock se declara con vi.mock para que reemplace al plugin antes de importar Database
vi.mock("@capacitor-community/sqlite", () => {
  const conn = {
    open: async () => {},
    execute: async (sql: string) => {
      state.calls.push({ kind: "execute", sql });
      return { changes: { changes: 0 } };
    },
    query: async (sql: string, params?: unknown[]) => {
      state.calls.push({ kind: "query", sql, params });

      //Los SELECT devuelven las filas que cada prueba haya preparado para esa tabla
      const table = /FROM (\w+)/.exec(sql)?.[1];
      return { values: table ? state.tables[table] ?? [] : [] };
    },
    run: async (sql: string, params?: unknown[]) => {
      state.calls.push({ kind: "run", sql, params });
      return { changes: { changes: 1, lastId: 7 } };
    },
  };

  class SQLiteConnection {
    async checkConnectionsConsistency() {
      return { result: false };
    }
    async isConnection() {
      return { result: false };
    }
    async createConnection() {
      return conn;
    }
    async retrieveConnection() {
      return conn;
    }
  }

  return { CapacitorSQLite: {}, SQLiteConnection, SQLiteDBConnection: class {} };
});

//Database guarda la conexión en una variable de módulo, así que se reimporta en cada prueba
type Database = typeof import("./Database");
let db: Database;

beforeEach(async () => {
  state.calls = [];
  state.tables = {};
  vi.resetModules();
  db = await import("./Database");
});

//Sentencias run ejecutadas hasta el momento, en orden
function runs(): Call[] {
  return state.calls.filter((c) => c.kind === "run");
}

// Última sentencia run, que es la que cada función de escritura ejecuta
function lastRun(): Call {
  return runs()[runs().length - 1];
}

//Última consulta query, para revisar el SELECT que se armó
function lastQuery(): Call {
  const queries = state.calls.filter((c) => c.kind === "query");
  return queries[queries.length - 1];
}

// Fecha fija para las pruebas que dependen del reloj
const NOW = new Date("2026-03-10T15:00:00");

//Tarjeta ya practicada una vez, punto de partida para calificarla de nuevo
const PRACTICED: Card = {
  id: 12,
  front: "perro",
  back: "dog",
  description: "",
  deck_id: 4,
  interval: 1,
  repetitions: 1,
  ease_factor: 2.5,
  due: "2026-03-11T00:00:00.000Z",
  last_practiced: "2026-03-10T15:00:00.000Z",
};

describe("insertCard", () => {
  it("guarda el progreso inicial cuando solo recibe contenido", async () => {
    const card: NewCard = { front: "hola", back: "hello", description: "", deck_id: 3 };
    const id = await db.insertCard(card);

    // El id viene del resultado de la conexión
    expect(id).toBe(7);

    //Sin progreso recibido, se persisten los valores de una tarjeta nueva
    const fresh = SM2.fresh();
    expect(lastRun().sql).toMatch(/INSERT INTO card/);
    expect(lastRun().params).toEqual([
      "hola",
      "hello",
      "",
      null,
      3,
      fresh.interval,
      fresh.repetitions,
      fresh.ease_factor,
      null,
    ]);
  });

  it("respeta el progreso cuando lo recibe", async () => {
    const card: NewCard = {
      front: "gato",
      back: "cat",
      description: "animal",
      deck_id: 1,
      interval: 6,
      repetitions: 2,
      ease_factor: 2.36,
      due: "2026-03-16T00:00:00.000Z",
      last_practiced: "2026-03-10T15:00:00.000Z",
    };
    await db.insertCard(card);

    // Una tarjeta importada con historial conserva su programación
    expect(lastRun().params).toEqual([
      "gato",
      "cat",
      "animal",
      "2026-03-10T15:00:00.000Z",
      1,
      6,
      2,
      2.36,
      "2026-03-16T00:00:00.000Z",
    ]);
  });
});

describe("updateCard", () => {
  it("escribe el contenido y los campos de progreso", async () => {
    const card: Card = {
      id: 12,
      front: "perro",
      back: "dog",
      description: "",
      deck_id: 1,
      interval: 1,
      repetitions: 1,
      ease_factor: 2.5,
      due: "2026-03-11T00:00:00.000Z",
      last_practiced: "2026-03-10T15:00:00.000Z",
    };
    await db.updateCard(card);

    //Editar el contenido no debe pisar el progreso, por eso se escriben los cuatro campos
    expect(lastRun().sql).toMatch(/UPDATE card/);
    expect(lastRun().params).toEqual([
      "perro",
      "dog",
      "",
      "2026-03-10T15:00:00.000Z",
      1,
      1,
      2.5,
      "2026-03-11T00:00:00.000Z",
      12,
    ]);
  });
});

describe("getDueCards", () => {
  it("pide las vencidas y las nuevas del mazo, ordenadas", async () => {
    state.tables = { card: [{ id: 1 }, { id: 2 }] };
    const cards = await db.getDueCards(4, NOW);

    // Se devuelven tal cual las filas que entregó la base
    expect(cards).toEqual([{ id: 1 }, { id: 2 }]);

    //El filtro incluye las nuevas (due NULL) y las que ya vencieron respecto a now
    const q = lastQuery();
    expect(q.sql).toMatch(/WHERE deck_id = \?/);
    expect(q.sql).toMatch(/due IS NULL OR due <= \?/);
    expect(q.params).toEqual([4, NOW.toISOString()]);

    // Primero las vencidas por fecha, después las nuevas por orden de creación
    expect(q.sql).toMatch(/ORDER BY \(due IS NULL\) ASC, due ASC, id ASC/);
  });
});

describe("reviewCard", () => {
  it("guarda el resultado de SM-2 y registra la práctica en el mazo", async () => {
    const next = await db.reviewCard(PRACTICED, true, NOW);

    //Los campos nuevos son exactamente los que calcula SM2.rate con la misma fecha
    const expected = new SM2(NOW).rate(PRACTICED, true);
    expect(next).toEqual({ ...PRACTICED, ...expected });

    // Primera escritura: la tarjeta con su progreso nuevo
    const [cardRun, deckRun] = runs();
    expect(cardRun.sql).toMatch(/UPDATE card/);
    expect(cardRun.params).toEqual([
      expected.last_practiced,
      expected.interval,
      expected.repetitions,
      expected.ease_factor,
      expected.due,
      PRACTICED.id,
    ]);

    //Segunda escritura: el mazo queda marcado como practicado ahora
    expect(deckRun.sql).toMatch(/UPDATE deck SET last_practiced/);
    expect(deckRun.params).toEqual([NOW.toISOString(), PRACTICED.deck_id]);
  });

  it("al olvidar deja la tarjeta pendiente para la misma sesión", async () => {
    const next = await db.reviewCard(PRACTICED, false, NOW);

    // Intervalo 0 y racha 0, con la fecha de vencimiento igual a now
    expect(next.interval).toBe(0);
    expect(next.repetitions).toBe(0);
    expect(next.due).toBe(NOW.toISOString());

    //La tarjeta recibida no se modifica, reviewCard devuelve una copia
    expect(PRACTICED.interval).toBe(1);
  });
});

describe("resetCardProgress", () => {
  it("vuelve a escribir los valores de una tarjeta nueva", async () => {
    await db.resetCardProgress(12);

    //Mismos valores que SM2.fresh(), así la tarjeta vuelve a contar como nueva
    const fresh = SM2.fresh();
    expect(lastRun().sql).toMatch(/UPDATE card/);
    expect(lastRun().params).toEqual([
      fresh.last_practiced,
      fresh.interval,
      fresh.repetitions,
      fresh.ease_factor,
      fresh.due,
      12,
    ]);
  });
});

describe("getDecksWithStats", () => {
  it("arma cada mazo con sus tarjetas, el resumen y el próximo vencimiento", async () => {
    // Dos mazos del usuario; la base simulada devuelve las mismas tarjetas para ambos
    state.tables = {
      deck: [
        { id: 1, name: "Español", user_id: 9 },
        { id: 2, name: "Japonés", user_id: 9 },
      ],
      card: [SM2.fresh(), PRACTICED],
    };
    const decks = await db.getDecksWithStats(9, NOW);

    expect(decks).toHaveLength(2);
    expect(decks.map((d) => d.name)).toEqual(["Español", "Japonés"]);

    //Una nueva (pendiente) y una que vence mañana: total 2, pendientes 1, nuevas 1
    expect(decks[0].cards).toHaveLength(2);
    expect(decks[0].stats).toEqual({ total: 2, due: 1, fresh: 1 });

    // El próximo vencimiento es el de la tarjeta ya practicada
    expect(decks[0].nextDue?.toISOString()).toBe(PRACTICED.due);
  });

  it("devuelve un mazo vacío sin próximo vencimiento", async () => {
    state.tables = { deck: [{ id: 1, name: "Vacío", user_id: 9 }], card: [] };
    const [deck] = await db.getDecksWithStats(9, NOW);

    expect(deck.stats).toEqual({ total: 0, due: 0, fresh: 0 });
    expect(deck.nextDue).toBeNull();
  });
});
