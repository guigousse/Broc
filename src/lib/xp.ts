import type { BrocanteurState, Rarete } from "@/types/game";
import { COUT_TOTAL_COMPETENCES } from "@/data/competences";

export type { BrocanteurState };

/* === Niveau de Brocanteur (global) ==================================== */

/**
 * ΔXP(N) = PENTE·N + PALIER_1 − PENTE  (N=1 → 100, N=2 → 101, …).
 *
 * Courbe recalibrée le 2026-07-10 pour l'échelle 100 niveaux : pente 34 → 1
 * (palier 1 inchangé à 100). Au revenu mesuré par niveauSim (croisière
 * ≈ 21 XP/j régulier · 14 casual · 36 hardcore) : N30 (dernier atout)
 * ≈ 6-8 h de jeu, puis la QUEUE quadratique (+C·(N−30)² par niveau après
 * le coude N30) fait grimper la facture jusqu'à ~689 XP pour N99→100
 * (≈ 2 journées d'énergie pleines). Avec le multiplicateur de rareté
 * (rare ×2, légendaire/unique ×5 sur achat/vente/restauration), la sonde
 * mesure N100 ≈ 272 h de jeu hardcore (~1,3 an calendaire) / 399 h
 * régulier — objectif de prestige, validé le 2026-07-10.
 * Sonde : calibration.probe.test.ts (describe.skip).
 */
export const XP_BROCANTEUR_PALIER_1 = 100;
export const XP_BROCANTEUR_PENTE = 1;
/** Coude de la courbe : la queue quadratique démarre après le dernier atout (N30). */
export const XP_COUDE_NIVEAU = 30;
/** Intensité de la queue : ΔXP gagne C·(N−30)² par niveau au-delà du coude. */
export const XP_QUEUE_C = 0.1;
/** Niveau plafond : la progression s'arrête à 100 (l'XP au-delà est ignorée). */
export const NIVEAU_BROCANTEUR_MAX = 100;

/**
 * Seuil CUMULÉ pour atteindre `niveau` :
 * Σ ΔXP = 0,5·N² + 99,5·N + C·Σ_{i=1..N−30} i²  (dernier terme nul si N ≤ 30).
 * Σ i² = k(k+1)(2k+1)/6 — forme fermée, arrondie à l'entier.
 */
export function xpRequisPourNiveauBrocanteur(niveau: number): number {
  const n = Math.max(0, niveau);
  const a = XP_BROCANTEUR_PENTE / 2; // 0,5
  const b = XP_BROCANTEUR_PALIER_1 - XP_BROCANTEUR_PENTE / 2; // 99,5
  const k = Math.max(0, n - XP_COUDE_NIVEAU);
  const queue = (XP_QUEUE_C * k * (k + 1) * (2 * k + 1)) / 6;
  return Math.round(a * n * n + b * n + queue);
}

/** Points de compétence gagnés par niveau de Brocanteur. */
export const POINTS_PAR_NIVEAU = 1;
/** Points bonus à la livraison d'un chapitre de mission principale (D4). */
export const POINTS_BONUS_CHAPITRE = 2;

/**
 * Points encore octroyables avant le plafond « à vie » : la somme
 * disponibles + dépensés ne dépasse jamais le coût total de l'arbre —
 * une fois tout payable, on ne gagne plus rien (le niveau, lui, continue).
 */
export function pointsOctroyables(
  b: BrocanteurState,
  pointsDepenses: number,
  demande: number,
): number {
  const gagnesAVie = b.pointsDisponibles + pointsDepenses;
  return Math.max(0, Math.min(demande, COUT_TOTAL_COMPETENCES - gagnesAVie));
}

export function appliquerGainXPBrocanteur(
  b: BrocanteurState,
  gain: number,
  /** Points déjà dépensés (Σ coûts des compétences débloquées) — sert au plafond à vie. */
  pointsDepenses = 0,
): BrocanteurState {
  if (gain <= 0) return b;
  const nouveauXP = b.xp + gain;
  let niveau = b.niveau;
  let pointsDisponibles = b.pointsDisponibles;
  while (
    niveau < NIVEAU_BROCANTEUR_MAX &&
    nouveauXP >= xpRequisPourNiveauBrocanteur(niveau + 1)
  ) {
    niveau += 1;
    pointsDisponibles += pointsOctroyables(
      { xp: nouveauXP, niveau, pointsDisponibles },
      pointsDepenses,
      POINTS_PAR_NIVEAU,
    );
  }
  return { xp: nouveauXP, niveau, pointsDisponibles };
}

/** Progression vers le prochain niveau de Brocanteur (0..1). */
export function progressionNiveauBrocanteur(b: BrocanteurState): number {
  if (b.niveau >= NIVEAU_BROCANTEUR_MAX) return 1;
  const seuilCourant = xpRequisPourNiveauBrocanteur(b.niveau);
  const seuilProchain = xpRequisPourNiveauBrocanteur(b.niveau + 1);
  const span = seuilProchain - seuilCourant;
  if (span <= 0) return 0;
  return Math.min(1, (b.xp - seuilCourant) / span);
}

/** Détail chiffré de la progression vers le prochain niveau de Brocanteur. */
export function detailProgressionBrocanteur(b: BrocanteurState): {
  dansNiveau: number;
  requisNiveau: number;
  manquant: number;
} {
  if (b.niveau >= NIVEAU_BROCANTEUR_MAX) {
    // Au plafond : barre pleine, plus rien à grimper.
    return { dansNiveau: 0, requisNiveau: 0, manquant: 0 };
  }
  const seuilCourant = xpRequisPourNiveauBrocanteur(b.niveau);
  const seuilProchain = xpRequisPourNiveauBrocanteur(b.niveau + 1);
  const requisNiveau = seuilProchain - seuilCourant;
  const dansNiveau = Math.max(0, b.xp - seuilCourant);
  const manquant = Math.max(0, requisNiveau - dansNiveau);
  return { dansNiveau, requisNiveau, manquant };
}

/**
 * Multiplicateur d'XP selon la rareté de l'objet manipulé (achat, vente,
 * restauration) : commun ×1, rare ×2, légendaire ×5 — un unique vaut
 * toujours ×5 quelle que soit sa rareté nominale. Décision 2026-07-10.
 */
export function multiplicateurXPRarete(rarete: Rarete, unique = false): number {
  if (unique || rarete === "legendaire") return 5;
  if (rarete === "rare") return 2;
  return 1;
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
