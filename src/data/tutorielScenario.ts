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
  /** Cible d'offre du grand-père pendant l'étape scriptée (négo uniquement). */
  cibleOffre?: CibleOffre;
}

/**
 * Cible pointillée du grand-père sur la barre de négociation : un prix unique
 * assorti d'une tolérance. Le curseur du joueur n'est plus bridé (il retrouve
 * les bornes naturelles du mode) — c'est le bouton « Proposer », inerte hors
 * cible, qui tient la garantie du scénario. Les bornes historiques (min/max)
 * en découlent : `bornesDeCible` reste la forme sous laquelle les garanties
 * du scénario sont prouvées (aucune offre PROPOSABLE ne peut casser le script).
 */
export interface CibleOffre {
  prix: number;
  tolerance: number;
}

export function bornesDeCible(c: CibleOffre): { min: number; max: number } {
  return { min: c.prix - c.tolerance, max: c.prix + c.tolerance };
}

/** L'offre est-elle dans la cible ? Fail-open : pas de cible ⇒ toujours vrai. */
export function offreDansCible(offre: number, c: CibleOffre | null | undefined): boolean {
  if (!c) return true;
  return Math.abs(offre - c.prix) <= c.tolerance;
}

const PERSONA_DECOR: NegoPersona = {
  archetype: "bonhomme", margePct: 0.4, elanPct: 0.55, patience: 5,
  tolerancePct: 0.7, sangFroid: 0.85,
};

export const PELUCHE_TEMPLATE_ID = "jx.ours_en_peluche_mohair_recent";

export const SESSION_TUTORIEL: readonly ObjetScenario[] = [
  {
    // Le bel objet qu'on perd : la cible (30 ± 4 → 26…34) tient tout entière
    // sous le seuil de colère (90 × (1 − 0.30) = 63) → « fâché » garanti au
    // tour 1, quelle que soit l'offre que le joueur peut PROPOSER.
    templateId: "mus.tourne_disque_a_courroie_vintage",
    etat: "Très bon", prixVendeur: 90, role: "nego-echec",
    persona: { archetype: "grincheux", margePct: 0.10, elanPct: 0.25, patience: 3, tolerancePct: 0.30, sangFroid: 0.25 },
    cibleOffre: { prix: 30, tolerance: 4 },
  },
  {
    // Bonne affaire sous la cote (réf. 21 en état Bon) : on achète direct.
    templateId: "ma.carafe_cristal_taille",
    etat: "Bon", prixVendeur: 18, role: "achat-direct",
    persona: PERSONA_DECOR,
  },
  {
    // Négo garantie : plancher 24 × (1 − 0.5) = 12 = borne basse de la cible
    // (15 ± 3) ; élan 0.9 → le vendeur rejoint ce plancher en 2 contre-offres.
    templateId: "jx.manette_vibraduo",
    etat: "Très bon", prixVendeur: 24, role: "nego-reussie",
    persona: { archetype: "naif", margePct: 0.50, elanPct: 0.90, patience: 5, tolerancePct: 0.95, sangFroid: 0.95 },
    cibleOffre: { prix: 15, tolerance: 3 },
  },
  {
    // La peluche (future donation) : plancher round(58 × 0.7) = 41 = borne
    // basse de la cible (45 ± 3).
    templateId: PELUCHE_TEMPLATE_ID,
    etat: "Très bon", prixVendeur: 58, role: "nego-reussie",
    persona: { archetype: "mamie", margePct: 0.30, elanPct: 0.85, patience: 4, tolerancePct: 0.55, sangFroid: 0.50 },
    cibleOffre: { prix: 45, tolerance: 3 },
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
  /** Tolérances propres à cette trace (défauts : TOLERANCE_TRACE_*). */
  tolerancePos?: number;
  toleranceRot?: number;
}

/* Traces v3 : la manette est PIVOTÉE (c'est la démo du grand-père qui
 * la tourne), la carafe remonte (posY ≤ 0.45, exigence spec).
 *
 * Positions PROUVÉES au pixel (oracle sharp, cf. `tutorielScenario.test.ts`) :
 * aux valeurs d'origine (0.47/0.5 et 0.62/0.38), manette et carafe se
 * chevauchaient réellement (88/864 px opaques) — corrigé en écartant la
 * carafe (posX 0.62→0.66→0.67, posY 0.38→0.33), loin aussi du préfill. */
export const TRACES_TUTORIEL: readonly TraceScenario[] = [
  { templateId: "jx.manette_vibraduo", posX: 0.47, posY: 0.49, rotation: 25 },
  {
    // Écartée (0.66 → 0.67) et la lampe du préfill lui a cédé 4 centièmes de
    // plus à sa droite : c'est TOUT ce que le coffre "rogers" dégage — au-delà
    // la lampe sort du contenant et la carafe la percute (balayage complet de
    // l'oracle pixel, 2026-08-19). Le vrai levier d'indulgence est donc la
    // tolérance : c'est la seule trace que le JOUEUR pose, au pouce et à deux
    // doigts, là où la manette est déposée au pixel par la démo du grand-père.
    templateId: "ma.carafe_cristal_taille", posX: 0.67, posY: 0.33, rotation: 40,
    tolerancePos: 0.13, toleranceRot: 18,
  },
];

/** Tolérance de pose par défaut : distance (normalisée) et angle (degrés). */
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
  { templateId: "ma.lampe_globe_opaline", posX: 0.73, posY: 0.62, rotation: 0, prixVente: 36 },
];

/** Task 8 (démo du grand-père) : la manette (trace 0) n'est plus posée par
 *  le joueur mais par le jeu (`DemoDepotManette`) — une fois dans le coffre,
 *  elle doit être AUSSI immuable que le préfill, sinon un tap malencontreux
 *  sur la carafe (tap → centre 0.5/0.5, proche de la trace manette
 *  0.47/0.49) pourrait la déloger. Délogée, elle redevient injoignable :
 *  `ajoutsAutorisesTemplateIds` l'exclut du carrousel aux deux étapes
 *  (Task 8), et plus aucun chemin ne la repose — cul-de-sac irrécupérable.
 *  La carafe (trace 1), elle, reste manipulable par le joueur — jamais dans
 *  cet ensemble. */
export const TEMPLATES_VERROUILLES_TUTORIEL: ReadonlySet<string> = new Set([
  ...PREFILL_COFFRE_TUTORIEL.map((p) => p.templateId),
  TRACES_TUTORIEL[0].templateId,
]);

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
  cibleOffre?: CibleOffre;
  persona: NegoPersona;
}

export const SESSION_VENTE_TUTORIEL: readonly AcheteurScenario[] = [
  {
    // Le radin : son plafond (17) est sous la borne basse de la cible (22) —
    // aucune vente possible ; la cible (23 ± 1 → 22…24) reste sous
    // 16 × 1.55 — aucune insulte possible. Il finira par renoncer
    // poliment… sauf si le joueur le congédie d'abord (la leçon).
    personnageNom: "Maxime du puçier",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 16,
    prixMax: 17,
    cibleOffre: { prix: 23, tolerance: 1 },
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
    // La négociatrice : son plafond (26) couvre la borne haute de la cible
    // (25 ± 1) — l'alignement conclut en ≤ 2 tours quelle que soit l'offre
    // proposable.
    personnageNom: "Bérénice la déco",
    templateIdCible: "ma.carafe_cristal_taille",
    mode: "negociation",
    offreInitiale: 18,
    prixMax: 26,
    cibleOffre: { prix: 25, tolerance: 1 },
    persona: { archetype: "nego_tuto", margePct: 0.3, elanPct: 0.85, patience: 5, tolerancePct: 0.6, sangFroid: 0.95 },
  },
];

/* === Leçon de montée de niveau ========================================= */

/** Le premier point de compétence du joueur, désigné par le grand-père. */
export const COMPETENCE_PREMIER_POINT = {
  treeId: "general",
  brancheId: "presentation",
  competenceId: "general.presentation.1",
} as const;

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
