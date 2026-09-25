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
const state = vi.hoisted(() => ({ calls: [] as Call[] }));

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
      return { values: [] };
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
  vi.resetModules();
  db = await import("./Database");
});

// Última sentencia run, que es la que cada función de escritura ejecuta
function lastRun(): Call {
  const runs = state.calls.filter((c) => c.kind === "run");
  return runs[runs.length - 1];
}

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
