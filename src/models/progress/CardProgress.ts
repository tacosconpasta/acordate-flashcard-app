//Progreso de repaso de una tarjeta, lo que SM-2 necesita para programar el próximo repaso
export interface CardProgress {
  interval: number; //días hasta el próximo repaso (0 = hoy mismo)
  repetitions: number; //aciertos seguidos desde el último olvido
  ease_factor: number; //facilidad de la tarjeta, empieza en 2.5 y nunca baja de 1.3
  due: string | null; //fecha ISO del próximo repaso, null si nunca se ha estudiado
  last_practiced: string | null; //fecha ISO del último repaso
}
