import { ALL_PERSONNAGES, type ClientPersonnage } from "@/data/clients";
import type { EtatObjet, NegoPersona, TutorielEtape } from "@/types/game";

/**
 * Le script de la première brocante (tutoriel v2). Tout est FIXE — mêmes
 * objets, mêmes prix, mêmes vendeurs pour tous les joueurs — afin que les
 * trois scénarios (échec de négo, achat direct, négos réussies) se jouent
 * à coup sûr. Les personas sont des valeurs figées (pas de jitter) : la
 * trajectoire du vendeur en négo est déterministe.
 * Spec : docs/superpowers/specs/2026-08-08-tutoriel-brocante-scriptee-design.md
 */
export type RoleScenario = "nego-echec" | "achat-direct" | "nego-reussie" | "decor";

export interface ObjetScenario {
  templateId: string;
  etat: EtatObjet;
  /** Prix affiché du vendeur (prixAffiche est toujours vrai dans le script). */
  prixVendeur: number;
  role: RoleScenario;
  /** Persona figé — prixMinAccept en découle via calculerPrixMinAcceptDepuisPersona. */
  persona: NegoPersona;
  /** Bornes du curseur d'offre pendant l'étape scriptée (négo uniquement). */
  bornesOffre?: { min: number; max: number };
}

const PERSONA_DECOR: NegoPersona = {
  archetype: "bonhomme", margePct: 0.4, elanPct: 0.55, patience: 5,
  tolerancePct: 0.7, sangFroid: 0.85,
};

export const PELUCHE_TEMPLATE_ID = "jx.ours_en_peluche_mohair_recent";

export const SESSION_TUTORIEL: readonly ObjetScenario[] = [
  {
    // Le bel objet qu'on perd : offre bornée sous le seuil de colère
    // (90 × (1 − 0.30) = 63 > max 40) → « fâché » garanti au tour 1.
    templateId: "mus.tourne_disque_a_courroie_vintage",
    etat: "Très bon", prixVendeur: 90, role: "nego-echec",
    persona: { archetype: "grincheux", margePct: 0.10, elanPct: 0.25, patience: 3, tolerancePct: 0.30, sangFroid: 0.25 },
    bornesOffre: { min: 5, max: 40 },
  },
  {
    // Bonne affaire sous la cote (réf. 21 en état Bon) : on achète direct.
    templateId: "ma.carafe_cristal_taille",
    etat: "Bon", prixVendeur: 18, role: "achat-direct",
    persona: PERSONA_DECOR,
  },
  {
    // Négo garantie : plancher 24 × (1 − 0.5) = 12 = borne min ; élan 0.9 →
    // le vendeur rejoint la borne min en 2 contre-offres (24 → 13 → 12).
    templateId: "jx.manette_vibraduo",
    etat: "Très bon", prixVendeur: 24, role: "nego-reussie",
    persona: { archetype: "naif", margePct: 0.50, elanPct: 0.90, patience: 5, tolerancePct: 0.95, sangFroid: 0.95 },
    bornesOffre: { min: 12, max: 20 },
  },
  {
    // La peluche (future donation) : plancher round(58 × 0.7) = 41 = borne min.
    templateId: PELUCHE_TEMPLATE_ID,
    etat: "Très bon", prixVendeur: 58, role: "nego-reussie",
    persona: { archetype: "mamie", margePct: 0.30, elanPct: 0.85, patience: 4, tolerancePct: 0.55, sangFroid: 0.50 },
    bornesOffre: { min: 41, max: 52 },
  },
  { templateId: "mus.radio_cassette_annees_80", etat: "Bon", prixVendeur: 21, role: "decor", persona: PERSONA_DECOR },
  { templateId: "br.lampe_baladeuse_atelier", etat: "Mauvais", prixVendeur: 6, role: "decor", persona: PERSONA_DECOR },
];

/* === Coffre à traces ==================================================== */

export interface TraceScenario {
  templateId: string;
  /** Centre visé, coordonnées normalisées du conteneur coffre (0..1). */
  posX: number;
  posY: number;
  /** Rotation visée en degrés (0..360). */
  rotation: number;
}

/* Traces v3 : la manette est PIVOTÉE (c'est la démo du grand-père qui
 * la tourne), la carafe remonte (posY ≤ 0.45, exigence spec).
 *
 * Positions PROUVÉES au pixel (oracle sharp, cf. `tutorielScenario.test.ts`) :
 * aux valeurs d'origine (0.47/0.5 et 0.62/0.38), manette et carafe se
 * chevauchaient réellement (88/864 px opaques) — corrigé en écartant la
 * carafe (posX 0.62→0.66, posY 0.38→0.33), loin aussi du préfill. */
export const TRACES_TUTORIEL: readonly TraceScenario[] = [
  { templateId: "jx.manette_vibraduo", posX: 0.47, posY: 0.49, rotation: 25 },
  { templateId: "ma.carafe_cristal_taille", posX: 0.66, posY: 0.33, rotation: 40 },
];

/** Tolérance de pose : distance (normalisée) et angle (degrés). */
export const TOLERANCE_TRACE_POS = 0.08;
export const TOLERANCE_TRACE_ROT = 10;

/* === Colis du grand-père (fixe) ======================================== */

export interface ObjetColisScenario { templateId: string; etat: EtatObjet; }

/** 4 communs + 1 rare, le rare en DERNIER (final de cérémonie). Petites
 *  tailles : les 3 premiers pré-remplissent le coffre (pièces du Tetris). */
export const COLIS_TUTORIEL_SCRIPTE: readonly ObjetColisScenario[] = [
  { templateId: "mus.ukulele_soprano", etat: "Bon" },
  { templateId: "br.boite_outils_complete", etat: "Bon" },
  { templateId: "ma.lampe_globe_opaline", etat: "Bon" },
  { templateId: "art.boite_marqueterie_florentine", etat: "Très bon" },
  { templateId: "mus.boite_musique_mecanique", etat: "Très bon" },
];

/* === Coffre Tetris ====================================================== */

export interface PrefillCoffre {
  templateId: string; posX: number; posY: number; rotation: number; prixVente: number;
}

/** Le grand-père a déjà chargé 3 pièces du colis : elles dessinent deux
 *  « trous » — la manette et la carafe. Verrouillées pendant le tutoriel,
 *  prix déjà étiquetés.
 *
 *  Positions PROUVÉES au pixel (oracle sharp, cf. `tutorielScenario.test.ts`,
 *  suite au coffre "rogers" (N1, 9 places) qui est nettement plus petit que
 *  ses silhouettes : le contenant réel (masque `rogers-mask.webp`) est
 *  saturé par ce triplet — la boîte à outils en particulier n'a de marge
 *  quasi nulle. NE JAMAIS modifier ces positions sans repasser par l'oracle. */
export const PREFILL_COFFRE_TUTORIEL: readonly PrefillCoffre[] = [
  { templateId: "mus.ukulele_soprano", posX: 0.33, posY: 0.66, rotation: 105, prixVente: 24 },
  { templateId: "br.boite_outils_complete", posX: 0.39, posY: 0.26, rotation: 0, prixVente: 30 },
  { templateId: "ma.lampe_globe_opaline", posX: 0.69, posY: 0.62, rotation: 0, prixVente: 36 },
];

/* === Pricing guidé ====================================================== */

export const PRIX_CONSEILLES_TUTORIEL: Readonly<Record<string, number>> = {
  "jx.manette_vibraduo": 22,
  "ma.carafe_cristal_taille": 26,
};
/** Aimantation du curseur : à ± cette distance, le prix saute sur le conseil. */
export const TOLERANCE_PRIX_CONSEILLE = 2;

/* === Journée de vente scriptée ========================================= */

export interface AcheteurScenario {
  personnageNom: string;
  templateIdCible: string;
  mode: "achat-direct" | "negociation";
  offreInitiale?: number;
  prixMax: number;
  bornesOffre?: { min: number; max: number };
  persona: NegoPersona;
}

export const SESSION_VENTE_TUTORIEL: readonly AcheteurScenario[] = [
  {
    // Le radin : son plafond (17) est sous la borne basse du joueur (22) —
    // aucune vente possible ; sa tolérance borne le curseur (max 24 ≤
    // 16 × 1.55) — aucune insulte possible. Il finira par renoncer
    // poliment… sauf si le joueur le congédie d'abord (la leçon).
    personnageNom: "Maxime du puçier",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 16,
    prixMax: 17,
    bornesOffre: { min: 22, max: 24 },
    persona: { archetype: "radin_tuto", margePct: 0.06, elanPct: 0.25, patience: 6, tolerancePct: 0.55, sangFroid: 0.95 },
  },
  {
    // L'ami du grand-père : la manette au prix affiché, sans discuter.
    personnageNom: "Léo le rétro",
    templateIdCible: "jx.manette_vibraduo",
    mode: "achat-direct",
    prixMax: 30,
    persona: { archetype: "ami_tuto", margePct: 0, elanPct: 0.5, patience: 4, tolerancePct: 0.9, sangFroid: 0.9 },
  },
  {
    // La négociatrice : sa cible (26) couvre la borne max du joueur —
    // l'alignement conclut en ≤ 2 tours quelle que soit l'offre bornée.
    personnageNom: "Bérénice la déco",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 18,
    prixMax: 26,
    bornesOffre: { min: 24, max: 26 },
    persona: { archetype: "nego_tuto", margePct: 0.3, elanPct: 0.85, patience: 5, tolerancePct: 0.6, sangFroid: 0.95 },
  },
];

export function acheteurDeLEtape(etape: TutorielEtape): AcheteurScenario | null {
  if (etape === "vente-refus") return SESSION_VENTE_TUTORIEL[0];
  if (etape === "vente-directe") return SESSION_VENTE_TUTORIEL[1];
  if (etape === "vente-nego") return SESSION_VENTE_TUTORIEL[2];
  return null;
}

/** Résout le personnage nommé du scénario (throw si le casting a changé). */
export function personnageScenario(a: AcheteurScenario): ClientPersonnage {
  const p = ALL_PERSONNAGES.find((x) => x.nom === a.personnageNom);
  if (!p) throw new Error(`[tutoriel] personnage inconnu : ${a.personnageNom}`);
  return p;
}
