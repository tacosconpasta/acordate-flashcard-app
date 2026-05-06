import type { Card } from "./Card";

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
