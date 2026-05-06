## Project

Acordate — Anki-clone made in Ionic and Capacitor

## Stack

- Language: JavaScript (React)
- Framework: Ionic + Capacitor
- Database: SQLite
- Key Libraries: @capacitor-community/sqlite, jeep-sqlite, sql.js
- Platforms: iOS and Android

## Status

Current Status of the Project: SQLite configured, models created, example data seeded. Ready to build views.

## Milestones

1. Configure project - [X]
2. Setup SQLite DB - [X]
3. Create the Models - [X]
4. Build the Views - [X]

Update "Status" everytime a milestone is reached.

## Structure

- [src/] — Source files
- [src/components] - Wrapper components
- [src/pages] - Views
- [src/theme] - future possible themes for the app
- [src/lib] - Libraries and utility classes. `Database.ts` lives here — it owns the SQLiteConnection, runs migrations, and exports typed query functions.
- [src/models] - `User.ts`, `Deck.ts`, `Card.ts` — each exports a base interface and a `New*` variant (without `id`) for inserts. `DeckWithCards` is the rendering model for a deck and its cards together.
- [public/sql-wasm.wasm] - WASM binary required by `jeep-sqlite` for the web platform. Copied from `sql.js/dist` at install time.

## Database

### Setup

SQLite is provided by `@capacitor-community/sqlite`. On native (iOS/Android) it delegates to the platform plugin. On web it uses `jeep-sqlite` (a custom element) backed by `sql.js` (WASM).

Initialization flow in `src/main.tsx`:
1. `defineCustomElements(window)` — registers the `<jeep-sqlite>` element.
2. On web: appends `<jeep-sqlite>` to `document.body`, waits for it to be defined, then calls `sqlite.initWebStore()`.
3. React mounts only after this resolves.

`src/lib/Database.ts` holds the single `SQLiteDBConnection`. Call `initDatabase()` once (e.g. in the first page's `useEffect`) — subsequent calls return the cached connection. All tables are created via `CREATE TABLE IF NOT EXISTS` in `CREATE_TABLES`, so migrations are idempotent.

`seedExampleData()` inserts 1 user, 2 decks, and 5 cards. It is a no-op if a user row already exists.

### Exported query functions

| Function | Description |
|---|---|
| `initDatabase()` | Opens connection and runs migrations |
| `seedExampleData()` | Inserts example data (idempotent) |
| `insertUser(user)` | Inserts a user, returns new `id` |
| `getUsers()` | Returns all users |
| `getUserById(id)` | Returns a single user or `null` |
| `insertDeck(deck)` | Inserts a deck, returns new `id` |
| `getDecks(userId)` | Returns all decks for a user |
| `getDeckWithCards(deckId)` | Returns a deck with its cards as `DeckWithCards` |
| `insertCard(card)` | Inserts a card, returns new `id` |
| `getCards(deckId)` | Returns all cards for a deck |

## Views

- Home: Let’s you see your current Anki-like decks.

Feel free to update the Views and take creative liberties if there are interesting options on the current market; but dont make anything overly complicated.

### Decks

- AddDeck: Let’s you add a new deck. A deck has a name, a description, and image and a list of cards.
- ViewDeck: Shows a deck’s name, image and description, a blurred list of the cards inside the deck, a button which lets you start practicing the cards of a deck, and a button to add cards to the deck. The list of cards can be un-blurred if the user swipes the blur to the left of the screen. This would let you modify and delete cards.
- ModifyDeck: Let’s you modify a deck’s name, description and image.

### Cards

- AddCard: Let’s you add a new card, from ViewDeck.
- ModifyCard: Let’s you modify a card. Can be accessed from ViewDeck, or, from ViewCard
- ViewCard: Let’s you view a card. If you tap, or tilt your phone backwards, it should show the answer of the card.

## Development Patterns

- Components: Try to utilize ionic components for everything. You can create wrapper components with many ionic components inside, but keep atomicity with ionic components.
- Modals: Include modals to confirm deleting information.
- Validation: Validate every possible common edge-case for every input on the program.
- Images: Look for the best, and most simple, way to save images in Ionic and with SQLite and use that local image saving pattern.

### Models

#### Relational Models

Models that should be created in SQLite

User {
id: int
name: string,
image: image
}

User -> Deck (1:N)

Deck {
id: int
name: string,
image: image,
description: string,
last_practiced: date,
user_id: int FK
}

Deck -> Card (1:N)

Card {
front: string,
back: string,
description: string,
last_practiced: date,
deck_id: int FK
}

#### Rendering Models

Create an appropiate model, based on the relational Models, for rendering the information without having SQL queries everywhere.

### Comments

- Don't decorate in-method comments with "---" or any other types of decorations, just use text
