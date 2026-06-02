import type { GameState, Meteo } from "@/types/game";
import { METEO_PROBA } from "@/data/meteos";
import { PERIODE_TENDANCES_JOURS } from "@/lib/tendances";
import { indexJourSemaineReel } from "@/lib/calendrier";

export function tirerMeteo(): Meteo {
  const r = Math.random();
  let cum = 0;
  for (const [m, p] of METEO_PROBA) {
    cum += p;
    if (r <= cum) return m;
  }
  return "ensoleille";
}

/** Tire une semaine de météo : 7 météos indépendantes, indexées lundi → dimanche. */
export function tirerMeteoSemaine(): Meteo[] {
  return Array.from({ length: PERIODE_TENDANCES_JOURS }, () => tirerMeteo());
}

/**
 * Index du jour dans la semaine calendaire (0 = lundi, 6 = dimanche).
 * Aligné sur le calendrier réel (Jour 1 = vendredi 6 juin 1924 → index 4).
 */
export function indexJourSemaine(jour: number): number {
  return indexJourSemaineReel(jour);
}

/** Météo du jour courant, lue dans `meteoSemaine`. */
export function meteoDuJour(state: GameState): Meteo {
  const idx = indexJourSemaine(state.jourActuel);
  return state.meteoSemaine[idx] ?? "nuageux";
}

/** Labels jours de la semaine (lundi-dimanche). */
export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
