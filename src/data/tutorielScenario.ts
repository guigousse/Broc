import type { EtatObjet, NegoPersona } from "@/types/game";

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

/** Trace 1 : la manette, droite. Trace 2 : la carafe, pivotée (leçon rotation). */
export const TRACES_TUTORIEL: readonly TraceScenario[] = [
  { templateId: "jx.manette_vibraduo", posX: 0.38, posY: 0.55, rotation: 0 },
  { templateId: "ma.carafe_cristal_taille", posX: 0.62, posY: 0.5, rotation: 40 },
];

/** Tolérance de pose : distance (normalisée) et angle (degrés). */
export const TOLERANCE_TRACE_POS = 0.08;
export const TOLERANCE_TRACE_ROT = 10;
