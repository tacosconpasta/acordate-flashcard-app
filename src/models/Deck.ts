import type { Card } from "./Card";
import type { CardsProgressSummary } from "./progress";

export interface Deck {
  id: number;
  name: string;
  image: string | null;
  description: string;
  last_practiced: string | null;
  user_id: number;
}

export type NewDeck = Omit<Deck, "id">;

export interface DeckWithCards extends Deck {
  cards: Card[];
}

// Mazo con el resumen de repaso de sus tarjetas, para los listados
export interface DeckWithStats extends Deck {
  cards: Card[];
  stats: CardsProgressSummary;
  nextDue: Date | null; //próximo vencimiento cuando no hay pendientes
}
