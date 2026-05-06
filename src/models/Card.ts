export interface Card {
  id: number;
  front: string;
  back: string;
  description: string;
  last_practiced: string | null;
  deck_id: number;
}

export type NewCard = Omit<Card, "id">;
