import type { CardProgress } from "./progress";

//Tarjeta de un mazo: el contenido que se estudia más su progreso de repaso
export interface Card extends CardProgress {
  id: number;
  front: string;
  back: string;
  description: string;
  deck_id: number;
}

// Datos para crear una tarjeta. El progreso es opcional porque una tarjeta
// recién creada empieza con los valores de SM2.fresh()
export type NewCard = Omit<Card, "id" | keyof CardProgress> & Partial<CardProgress>;
