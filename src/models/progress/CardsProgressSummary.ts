// Resumen del progreso de un grupo de tarjetas, para mostrar en los listados
export interface CardsProgressSummary {
  total: number;
  due: number; //pendientes ahora, incluye las nuevas
  fresh: number; //nuevas, nunca repasadas
}
