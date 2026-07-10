import type { CategorieObjet, EtatObjet, GameState } from "@/types/game";
import { aMaitreReparer } from "@/lib/competences";

/** Durée totale par état de DÉPART (plus l'objet est bon, plus c'est long). */
export const DUREE_RESTAURATION_MS: Record<EtatObjet, number> = {
  Mauvais: 1 * 60 * 60 * 1000,
  Bon: 2 * 60 * 60 * 1000,
  "Très bon": 4 * 60 * 60 * 1000,
  "Pristin état": 0, // non restaurable
};

/** Réduction plate (ms) si la catégorie a le palier « Maître Réparer ». */
export const MAITRE_REPARER_REDUCTION_MS = 30 * 60 * 1000;

/** Fenêtre (avant la fin) pendant laquelle on peut terminer via pub. */
export const FENETRE_PUB_MS = 30 * 60 * 1000;

/** Sous-ensemble temporel d'`enRestauration` manipulé par les fonctions pures. */
type Timer = { debutMs: number; finMs: number };

/** Durée totale (ms) pour restaurer un objet de `etatDepart`, compétence incluse. */
export function dureeRestaurationMs(
  state: GameState,
  cat: CategorieObjet,
  etatDepart: EtatObjet,
): number {
  const base = DUREE_RESTAURATION_MS[etatDepart];
  return aMaitreReparer(state, cat)
    ? Math.max(0, base - MAITRE_REPARER_REDUCTION_MS)
    : base;
}

/** Millisecondes restantes (plancher 0). `now` = temps de confiance. */
export function restantMs(enRest: Timer, now: number): number {
  return Math.max(0, enRest.finMs - now);
}

/** Progression 0→1. Renvoie 1 si la fenêtre est nulle/négative. */
export function progression(enRest: Timer, now: number): number {
  const total = enRest.finMs - enRest.debutMs;
  if (total <= 0) return 1;
  const p = (now - enRest.debutMs) / total;
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Restauration terminée (récupérable). */
export function estPret(enRest: Timer, now: number): boolean {
  return now >= enRest.finMs;
}

/** Vrai si on est dans la fenêtre pub : 0 < restant <= 30 min. */
export function peutTerminerImmediat(enRest: Timer, now: number): boolean {
  const r = enRest.finMs - now;
  return r > 0 && r <= FENETRE_PUB_MS;
}

/** Formate une durée (ms) en « 1 h », « 1 h 30 » ou « 45 min » (granularité minute). */
export function formatDuree(ms: number): string {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }
  if (totalMin >= 1) return `${totalMin} min`;
  return `${Math.ceil(ms / 1000)} s`;
}
