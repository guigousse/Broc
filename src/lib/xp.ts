import { CATEGORIES } from "@/data/categories";
import type { BrocanteurState, CategorieObjet } from "@/types/game";

export type { BrocanteurState };

/* === Niveau de Brocanteur (global) ==================================== */

/**
 * ΔXP(N) = PENTE·N + PALIER_1 − PENTE  (N=1 → 100, N=2 → 134, …).
 *
 * Courbe aplatie le 2026-07-06 : la simulation mesure un revenu d'XP réel
 * 2,5-4× sous les hypothèses du rapport initial (pente 60), ce qui créait
 * un plateau de 44-57 j après N14. La pente est ramenée à 34 (palier 1
 * inchangé à 100) pour ramener ce gap tardif à ~7-9 j au revenu mesuré,
 * sans toucher au tout début de la progression.
 */
export const XP_BROCANTEUR_PALIER_1 = 100;
export const XP_BROCANTEUR_PENTE = 34;

/** Seuil CUMULÉ pour atteindre `niveau` : Σ ΔXP = 17·N² + 83·N. */
export function xpRequisPourNiveauBrocanteur(niveau: number): number {
  const n = Math.max(0, niveau);
  const a = XP_BROCANTEUR_PENTE / 2; // 17
  const b = XP_BROCANTEUR_PALIER_1 - XP_BROCANTEUR_PENTE / 2; // 83
  return a * n * n + b * n;
}

/** Points de compétence gagnés par niveau de Brocanteur. */
export const POINTS_PAR_NIVEAU = 1;
/** Points bonus à la livraison d'un chapitre de mission principale (D4). */
export const POINTS_BONUS_CHAPITRE = 2;

export function appliquerGainXPBrocanteur(
  b: BrocanteurState,
  gain: number,
): BrocanteurState {
  if (gain <= 0) return b;
  const nouveauXP = b.xp + gain;
  let niveau = b.niveau;
  let pointsDisponibles = b.pointsDisponibles;
  while (nouveauXP >= xpRequisPourNiveauBrocanteur(niveau + 1)) {
    niveau += 1;
    pointsDisponibles += POINTS_PAR_NIVEAU;
  }
  return { xp: nouveauXP, niveau, pointsDisponibles };
}

/** Progression vers le prochain niveau de Brocanteur (0..1). */
export function progressionNiveauBrocanteur(b: BrocanteurState): number {
  const seuilCourant = xpRequisPourNiveauBrocanteur(b.niveau);
  const seuilProchain = xpRequisPourNiveauBrocanteur(b.niveau + 1);
  const span = seuilProchain - seuilCourant;
  if (span <= 0) return 0;
  return Math.min(1, (b.xp - seuilCourant) / span);
}

/* === Gains d'XP Brocanteur par action (rapport §07) ==================== */
export const XP_ACHAT_BROCANTEUR = 10;
export const XP_VENTE_BROCANTEUR = 20;
export const XP_NEGO_BROCANTEUR = 5;
/** Vente conclue au premier prix (achat direct du client). */
export const XP_JUSTE_PRIX = 10;
/** Une étape de restauration récupérée à l'atelier. */
export const XP_RESTAURATION_ETAPE = 15;
export const XP_QUETE_QUOTIDIENNE = 25;
export const XP_QUETE_HEBDO = 75;
export const XP_QUETE_PRINCIPALE = 100;
/** Premier exemplaire d'un template ajouté à la collection. */
export const XP_DECOUVERTE_COLLECTION = 10;

export function emptyBrocanteur(): BrocanteurState {
  return { xp: 0, niveau: 0, pointsDisponibles: 0 };
}

export function emptyAffinites(): Record<CategorieObjet, number> {
  const out = {} as Record<CategorieObjet, number>;
  for (const c of CATEGORIES) out[c] = 0;
  return out;
}
