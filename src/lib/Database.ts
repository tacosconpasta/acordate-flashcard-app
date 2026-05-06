import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import type { NewUser, User } from "../models/User";
import type { NewDeck, Deck, DeckWithCards } from "../models/Deck";
import type { NewCard, Card } from "../models/Card";

const DB_NAME = "acordate";

const CREATE_TABLES = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS user (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    image       TEXT
  );

  CREATE TABLE IF NOT EXISTS deck (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    image          TEXT,
    description    TEXT    NOT NULL DEFAULT '',
    last_practiced TEXT,
    user_id        INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS card (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    front          TEXT    NOT NULL,
    back           TEXT    NOT NULL,
    description    TEXT    NOT NULL DEFAULT '',
    last_practiced TEXT,
    deck_id        INTEGER NOT NULL REFERENCES deck(id) ON DELETE CASCADE
  );
`;

const sqlite = new SQLiteConnection(CapacitorSQLite);
let dbPromise: Promise<SQLiteDBConnection> | null = null;

async function openDb(): Promise<SQLiteDBConnection> {
  const consistency = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

  let conn: SQLiteDBConnection;
  if (consistency.result && isConn) {
    conn = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    conn = await sqlite.createConnection(
      DB_NAME,
      false,
      "no-encryption",
      1,
      false
    );
  }

  await conn.open();
  await conn.execute(CREATE_TABLES);
  return conn;
}

function getDb(): Promise<SQLiteDBConnection> {
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  await getDb();
}

// User queries

export async function insertUser(user: NewUser): Promise<number> {
  const conn = await getDb();
  const result = await conn.run(
    "INSERT INTO user (name, image) VALUES (?, ?)",
    [user.name, user.image ?? null]
  );
  return result.changes?.lastId ?? -1;
}

export async function getUsers(): Promise<User[]> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM user");
  return (result.values ?? []) as User[];
}

export async function getUserById(id: number): Promise<User | null> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM user WHERE id = ?", [id]);
  return ((result.values ?? [])[0] as User) ?? null;
}

// Deck queries

export async function insertDeck(deck: NewDeck): Promise<number> {
  const conn = await getDb();
  const result = await conn.run(
    "INSERT INTO deck (name, image, description, last_practiced, user_id) VALUES (?, ?, ?, ?, ?)",
    [
      deck.name,
      deck.image ?? null,
      deck.description,
      deck.last_practiced ?? null,
      deck.user_id,
    ]
  );
  return result.changes?.lastId ?? -1;
}

export async function getDecks(userId: number): Promise<Deck[]> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM deck WHERE user_id = ?", [
    userId,
  ]);
  return (result.values ?? []) as Deck[];
}

export async function getDeckById(deckId: number): Promise<Deck | null> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM deck WHERE id = ?", [deckId]);
  return ((result.values ?? [])[0] as Deck) ?? null;
}

export async function updateDeck(deck: Deck): Promise<void> {
  const conn = await getDb();
  await conn.run(
    "UPDATE deck SET name = ?, image = ?, description = ?, last_practiced = ? WHERE id = ?",
    [
      deck.name,
      deck.image ?? null,
      deck.description,
      deck.last_practiced ?? null,
      deck.id,
    ]
  );
}

export async function deleteDeck(deckId: number): Promise<void> {
  const conn = await getDb();
  await conn.run("DELETE FROM deck WHERE id = ?", [deckId]);
}

export async function getDeckWithCards(
  deckId: number
): Promise<DeckWithCards | null> {
  const conn = await getDb();

  const deckResult = await conn.query("SELECT * FROM deck WHERE id = ?", [
    deckId,
  ]);
  const deck = ((deckResult.values ?? [])[0] as Deck) ?? null;
  if (!deck) return null;

  const cardResult = await conn.query("SELECT * FROM card WHERE deck_id = ?", [
    deckId,
  ]);
  const cards = (cardResult.values ?? []) as Card[];

  return { ...deck, cards };
}

// Card queries

export async function insertCard(card: NewCard): Promise<number> {
  const conn = await getDb();
  const result = await conn.run(
    "INSERT INTO card (front, back, description, last_practiced, deck_id) VALUES (?, ?, ?, ?, ?)",
    [
      card.front,
      card.back,
      card.description,
      card.last_practiced ?? null,
      card.deck_id,
    ]
  );
  return result.changes?.lastId ?? -1;
}

export async function getCards(deckId: number): Promise<Card[]> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM card WHERE deck_id = ?", [
    deckId,
  ]);
  return (result.values ?? []) as Card[];
}

export async function getCardById(cardId: number): Promise<Card | null> {
  const conn = await getDb();
  const result = await conn.query("SELECT * FROM card WHERE id = ?", [cardId]);
  return ((result.values ?? [])[0] as Card) ?? null;
}

export async function updateCard(card: Card): Promise<void> {
  const conn = await getDb();
  await conn.run(
    "UPDATE card SET front = ?, back = ?, description = ?, last_practiced = ? WHERE id = ?",
    [
      card.front,
      card.back,
      card.description,
      card.last_practiced ?? null,
      card.id,
    ]
  );
}

export async function deleteCard(cardId: number): Promise<void> {
  const conn = await getDb();
  await conn.run("DELETE FROM card WHERE id = ?", [cardId]);
}

export async function seedExampleData(userId: number): Promise<void> {
  const conn = await getDb();

  const existing = await conn.query(
    "SELECT id FROM deck WHERE user_id = ? LIMIT 1",
    [userId]
  );
  if ((existing.values ?? []).length > 0) return;

  const spanishDeckId = await insertDeck({
    name: "Vocabulario en Español",
    image: null,
    description: "Palabras y frases comunes en español",
    last_practiced: null,
    user_id: userId,
  });

  const japaneseDeckId = await insertDeck({
    name: "Vocabulario en Japonés",
    image: null,
    description: "Palabras y frases básicas en japonés",
    last_practiced: null,
    user_id: userId,
  });

  const spanishCards: NewCard[] = [
    {
      front: "Hello",
      back: "Hola",
      description: "Saludo básico",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Thank you",
      back: "Gracias",
      description: "Expresar gratitud",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Goodbye",
      back: "Adiós",
      description: "Despedida",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Please",
      back: "Por favor",
      description: "Pedir algo amablemente",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Yes",
      back: "Sí",
      description: "Afirmación",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "No",
      back: "No",
      description: "Negación",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Water",
      back: "Agua",
      description: "Bebida esencial",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Friend",
      back: "Amigo",
      description: "Persona cercana",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "Good morning",
      back: "Buenos días",
      description: "Saludo matutino",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
    {
      front: "House",
      back: "Casa",
      description: "Lugar donde se vive",
      last_practiced: null,
      deck_id: spanishDeckId,
    },
  ];

  const japaneseCards: NewCard[] = [
    {
      front: "こんにちは",
      back: "Hola!",
      description: "Saludo de día",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "ありがとう",
      back: "Gracias",
      description: "Gracias",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "さようなら",
      back: "Adiós",
      description: "Despedida formal",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "はい",
      back: "Sí",
      description: "Afirmación",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "いいえ",
      back: "No",
      description: "Negación",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "水",
      back: "Water",
      description: "Agua",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "友達",
      back: "Amigo",
      description: "Persona cercana",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "おはよう",
      back: "Buenos días",
      description: "Saludo matutino informal",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "家",
      back: "House",
      description: "Casa",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
    {
      front: "頭",
      back: "Cabeza",
      description: "Parte del cuerpo",
      last_practiced: null,
      deck_id: japaneseDeckId,
    },
  ];

  for (const card of [...spanishCards, ...japaneseCards]) {
    await insertCard(card);
  }
}
