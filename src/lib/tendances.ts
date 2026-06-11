import type { CategorieObjet, Tendance } from "@/types/game";
import { CATEGORIES } from "@/data/categories";

export const PERIODE_TENDANCES_JOURS = 7;
export const NB_TENDANCES = 5;
/** Prix d'une édition de la Gazette (à racheter à chaque refresh). */
export const PRIX_GAZETTE = 10;
const DELTA_MIN = -25;
const DELTA_MAX = 25;

function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function genererTendances(
  options: { garantirPositifFort?: boolean } = {},
): Tendance[] {
  const tendances = pickN(CATEGORIES, NB_TENDANCES).map((categorie) => {
    let delta = Math.round(DELTA_MIN + Math.random() * (DELTA_MAX - DELTA_MIN));
    if (delta === 0) delta = Math.random() > 0.5 ? 5 : -5;
    return { categorie, delta };
  });
  // Devin : garantit au moins une catégorie tendance ≥ +15 %
  if (options.garantirPositifFort) {
    const max = Math.max(...tendances.map((t) => t.delta));
    if (max < 15) {
      const idx = Math.floor(Math.random() * tendances.length);
      tendances[idx] = {
        ...tendances[idx],
        delta: 15 + Math.floor(Math.random() * 10),
      };
    }
  }
  return tendances;
}

export function modificateurTendance(
  categorie: CategorieObjet,
  tendances: readonly Tendance[],
): number {
  const t = tendances.find((x) => x.categorie === categorie);
  return t ? 1 + t.delta / 100 : 1;
}

/** Numéro d'édition (hebdomadaire) affiché sur la Gazette. */
export function numeroEdition(jour: number): string {
  const n = Math.floor((jour - 1) / PERIODE_TENDANCES_JOURS) + 47;
  return String(n).padStart(3, "0");
}

/** Numéro de la semaine en cours (1-indexed). */
export function numeroSemaine(jour: number): number {
  return Math.floor((jour - 1) / PERIODE_TENDANCES_JOURS) + 1;
}
