import type { BrocanteurState, GameState, Rarete } from "@/types/game";
import { COUT_TOTAL_COMPETENCES, pointsDepensesCompetences } from "@/data/competences";

export type { BrocanteurState };

/* === Niveau de Brocanteur (global) ==================================== */

/**
 * ΔXP(N) = PALIER_1 + PENTE_LOG·ln(N) + C·max(0, N−30)².
 *
 * Courbe recalibrée le 2026-07-26. La précédente (quasi plate, ΔXP = N + 99)
 * partait d'un revenu estimé à ≈ 14-36 XP par journée de jeu ; le simulateur
 * en mesure aujourd'hui 48 à 94 selon le profil — le triple — parce que la
 * restauration, les découvertes de collection et les quêtes sont arrivées
 * après la calibration. Résultat : une seule journée de vente (5 objets à
 * 20 XP) passait un niveau entier.
 *
 * La partie logarithmique va de 100 XP au niveau 1 à 250 au niveau 30, où
 * tombe le dernier déblocage : chaque niveau coûte sensiblement plus que le
 * précédent, mais l'accélération s'amortit — le début reste franc, ce qui
 * compte pendant le tutoriel. Au-delà de N30, la QUEUE quadratique reprend la
 * main pour les niveaux de prestige (≈ 793 XP au niveau 100) : sans elle le
 * coût stagnerait alors que les revenus, eux, montent avec la rareté des
 * objets et l'énergie — les derniers niveaux tomberaient plus vite que les
 * premiers.
 *
 * Sonde : calibration.probe.test.ts (describe.skip). Mesures :
 * docs/equilibrage/simulation-niveau-2026-07-26*.md.
 */
export const XP_BROCANTEUR_PALIER_1 = 100;
/** Coude de la courbe : la queue quadratique démarre après le dernier atout (N30). */
export const XP_COUDE_NIVEAU = 30;
/** Coût visé au coude — cale la pente logarithmique. */
export const XP_CIBLE_AU_COUDE = 250;
/**
 * Pente logarithmique, déduite des deux ancres : ΔXP(1) = PALIER_1 (ln 1 = 0)
 * et ΔXP(30) = CIBLE_AU_COUDE. ≈ 44,1.
 */
export const XP_PENTE_LOG =
  (XP_CIBLE_AU_COUDE - XP_BROCANTEUR_PALIER_1) / Math.log(XP_COUDE_NIVEAU);
/** Intensité de la queue : ΔXP gagne C·(N−30)² par niveau au-delà du coude. */
export const XP_QUEUE_C = 0.1;
/** Niveau plafond : la progression s'arrête à 100 (l'XP au-delà est ignorée). */
export const NIVEAU_BROCANTEUR_MAX = 100;

/** Coût du seul niveau `n` (n ≥ 1), arrondi à l'entier. */
export function xpDuNiveauBrocanteur(n: number): number {
  if (n < 1) return 0;
  const k = Math.max(0, n - XP_COUDE_NIVEAU);
  return Math.round(
    XP_BROCANTEUR_PALIER_1 + XP_PENTE_LOG * Math.log(n) + XP_QUEUE_C * k * k,
  );
}

/**
 * Seuil CUMULÉ pour atteindre `niveau` : Σ des coûts de 1 à N. Le logarithme
 * n'a pas de somme fermée simple — la table est donc calculée une fois pour
 * les 100 niveaux, puis lue. Les seuils restent des entiers exacts, ce dont
 * dépendent l'affichage de la barre et les comparaisons de palier.
 */
const SEUILS_CUMULES: readonly number[] = (() => {
  const table = [0];
  let cumul = 0;
  for (let n = 1; n <= NIVEAU_BROCANTEUR_MAX; n++) {
    cumul += xpDuNiveauBrocanteur(n);
    table.push(cumul);
  }
  return table;
})();

export function xpRequisPourNiveauBrocanteur(niveau: number): number {
  const n = Math.max(0, Math.floor(niveau));
  if (n >= NIVEAU_BROCANTEUR_MAX) return SEUILS_CUMULES[NIVEAU_BROCANTEUR_MAX];
  return SEUILS_CUMULES[n];
}

/**
 * Points de compétence gagnés par niveau de Brocanteur — et c'est la SEULE
 * source du jeu depuis le 2026-08-28 : exactement un point par niveau, ni
 * plus ni moins. Toute autre distribution (l'ancien bonus de chapitre) rendait
 * fausse la promesse « +1 point de compétence » de la fiche de célébration,
 * seul endroit où le joueur voit passer ses points.
 */
export const POINTS_PAR_NIVEAU = 1;
/**
 * LEGACY — ancien bonus de points à la livraison d'un chapitre de la trame
 * (D4), supprimé du jeu vivant le 2026-08-28. La constante survit pour la
 * seule migration des saves < v9 (`lib/migrations.ts`), qui RECALCULE leur
 * pool à chaque chargement (`niveau + bonus × chapitres − dépenses`) : la
 * retirer de ce calcul retirerait rétroactivement des points déjà acquis,
 * ce que la décision « sans reprise » exclut.
 */
export const POINTS_BONUS_CHAPITRE = 2;

/**
 * Le brocanteur est-il au plafond de niveau ? Au-delà, l'XP gagnée continue
 * de s'accumuler dans la save mais ne produit plus rien : ni niveau, ni point.
 * Les cérémonies qui la mettent en scène (décompte du bilan de session) s'en
 * servent pour se taire — une animation qui n'a aucun effet ne fait
 * qu'égarer le joueur.
 */
export function auPlafondNiveau(b: Pick<BrocanteurState, "niveau">): boolean {
  return b.niveau >= NIVEAU_BROCANTEUR_MAX;
}

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

/**
 * Ce que le niveau 100 rapporte : des Bazarcoins, pas un point de compétence
 * (l'arbre est payé depuis N96). Décidé le 2026-08-28 à la place d'une
 * tapisserie rouge et or du bureau, jugée peu convaincante à l'image.
 */
export const JETONS_NIVEAU_MAX = 50;

/**
 * Le SEUL robinet d'XP de la partie : verse l'XP au brocanteur (niveaux et
 * points) et, si le niveau 100 vient d'être franchi, ses Bazarcoins. Les
 * appelants (vente, restauration, découverte, mission) ne touchent plus à
 * `brocanteur` directement — sinon le franchissement du plafond se jouerait
 * à quatre endroits et l'un d'eux finirait par l'oublier.
 */
export function crediterXPBrocanteur<
  S extends Pick<GameState, "brocanteur" | "jetons" | "competencesDebloquees">,
>(state: S, gain: number): S {
  if (gain <= 0) return state;
  const brocanteur = appliquerGainXPBrocanteur(
    state.brocanteur,
    gain,
    pointsDepensesCompetences(state.competencesDebloquees),
  );
  const franchitPlafond =
    state.brocanteur.niveau < NIVEAU_BROCANTEUR_MAX &&
    brocanteur.niveau >= NIVEAU_BROCANTEUR_MAX;
  return {
    ...state,
    brocanteur,
    jetons: franchitPlafond ? state.jetons + JETONS_NIVEAU_MAX : state.jetons,
  };
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
/** Premier exemplaire d'un template ajouté à la collection. */
export const XP_DECOUVERTE_COLLECTION = 10;

export function emptyBrocanteur(): BrocanteurState {
  return { xp: 0, niveau: 0, pointsDisponibles: 0 };
}
