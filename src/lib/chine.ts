import type { EtatObjet, ObjetEnVente, Rarete, Tendance } from "@/types/game";
import {
  getTemplate,
  poolPourTier,
  type ObjetTemplate,
} from "@/data/objetTemplates";
import type { Brocante, CelebriteEvenement } from "@/types/game";
import { modificateurTendance } from "@/lib/tendances";

/**
 * Quand une célébrité visite la brocante : multiplicateur appliqué aux poids
 * `rare` et `legendaire` (les bonnes pièces sortent). Multiplicateur sur
 * `taillePool` pour augmenter l'affluence de marchands.
 */
const CELEBRITE_BOOST_RARES = 2.0;
const CELEBRITE_BOOST_TAILLE = 1.5;

// Pristin état est rare en chinage — il faut le créer en atelier.
const ETATS: readonly EtatObjet[] = ["Mauvais", "Bon", "Très bon"];
const FACTEUR_ETAT: Record<EtatObjet, number> = {
  Mauvais: 0.3,
  Bon: 0.6,
  "Très bon": 1,
  "Pristin état": 1.4,
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Plages du prix min accepté par le vendeur, en % de son prix affiché.
 * Plus la brocante est prestigieuse, plus les vendeurs sont rigides.
 */
const TOLERANCE_PAR_TIER: Record<1 | 2 | 3 | 4, { min: number; max: number }> = {
  1: { min: 0.70, max: 0.90 },
  2: { min: 0.78, max: 0.92 },
  3: { min: 0.85, max: 0.95 },
  4: { min: 0.90, max: 0.97 },
};
/** Seuil sous lequel l'offre est jugée insultante (vendeur se fâche). */
export const SEUIL_COLERE_VENDEUR = 0.5;

/**
 * Bonus de prix appliqué aux objets dont la catégorie correspond à la
 * spécialisation de la brocante (le vendeur connaît la valeur de son thème).
 */
export const BONUS_SPECIALISATION = 1.1;

function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
  tier: 1 | 2 | 3 | 4 = 1,
  brocante?: Brocante,
): ObjetEnVente {
  const etat = pickRandom(ETATS);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  const facteurVendeur = 0.6 + Math.random() * 0.8;
  const modTend = modificateurTendance(template.categorie, tendances);
  const modSpec =
    brocante?.specialisation === template.categorie ? BONUS_SPECIALISATION : 1;
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec),
  );
  const { min: tolMin, max: tolMax } = TOLERANCE_PAR_TIER[tier];
  const tolerance = tolMin + Math.random() * (tolMax - tolMin);
  const prixMinAccept = Math.max(1, Math.round(prixVendeur * tolerance));

  return {
    id: crypto.randomUUID(),
    objet: {
      id: crypto.randomUUID(),
      templateId: template.templateId,
      nom: template.nom,
      categorie: template.categorie,
      etat,
      prixReferenceReel,
      rarete: template.rarete,
    },
    prixVendeur,
    prixAffiche: Math.random() > 0.4,
    prixMinAccept,
    negociationsTentees: 0,
    statut: "disponible",
  };
}

const POIDS_RARETE: Record<Rarete, number> = {
  commun: 88,
  rare: 10,
  legendaire: 2,
};

function poidsRarete(rarete: Rarete, boost: boolean): number {
  const base = POIDS_RARETE[rarete];
  return boost && rarete !== "commun" ? base * CELEBRITE_BOOST_RARES : base;
}

function tirerTemplatePondere(
  pool: readonly ObjetTemplate[],
  boostRares: boolean,
): ObjetTemplate {
  const total = pool.reduce((s, t) => s + poidsRarete(t.rarete, boostRares), 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= poidsRarete(t.rarete, boostRares);
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

/**
 * Probabilité par item de tenter un tirage dans le poolExclusif de la brocante.
 * Plus la brocante est prestigieuse, plus l'exclusif est représenté.
 */
const CHANCE_EXCLUSIF_PAR_TIER: Record<1 | 2 | 3 | 4, number> = {
  1: 0.12,
  2: 0.18,
  3: 0.25,
  4: 0.40,
};

/** Part minimale d'items de la catégorie de spécialisation (brocantes spécialisées). */
const QUOTA_SPECIALISATION = 0.5;

export function genererSession(
  taille: number,
  tendances: readonly Tendance[] = [],
  brocante?: Brocante,
  celebrite?: CelebriteEvenement | null,
): ObjetEnVente[] {
  const celebritePresente =
    !!brocante && !!celebrite && celebrite.brocanteId === brocante.id;
  const tailleEffective = celebritePresente
    ? Math.round(taille * CELEBRITE_BOOST_TAILLE)
    : taille;
  const items: ObjetEnVente[] = [];
  const dejaTires = new Set<string>();
  let attempts = 0;
  const maxAttempts = tailleEffective * 6;

  // Résout les templates exclusifs de la brocante (en évinçant les ids inconnus)
  const exclusifs: ObjetTemplate[] = (brocante?.poolExclusif ?? [])
    .map((id) => getTemplate(id))
    .filter((t): t is ObjetTemplate => t !== undefined);

  // Pool générique filtré par tier (1⭐ → 1/3, 2⭐ → 2/3, 3⭐+ → tout).
  const poolGenerique = poolPourTier(brocante?.tier ?? 1);

  // Brocantes spécialisées : force au moins QUOTA_SPECIALISATION d'items du thème.
  const spe = brocante?.specialisation;
  const quotaSpe = spe ? Math.ceil(taille * QUOTA_SPECIALISATION) : 0;
  const poolCommunSpe = spe
    ? poolGenerique.filter((t) => t.categorie === spe)
    : [];
  const poolExclusifSpe = spe
    ? exclusifs.filter((t) => t.categorie === spe)
    : [];

  while (items.length < tailleEffective && attempts < maxAttempts) {
    attempts += 1;
    const chanceExclusif = CHANCE_EXCLUSIF_PAR_TIER[brocante?.tier ?? 1];

    const compteSpe = spe
      ? items.filter((it) => it.objet.categorie === spe).length
      : 0;
    const restant = tailleEffective - items.length;
    const manqueSpe = Math.max(0, quotaSpe - compteSpe);
    const forcerSpe = spe !== undefined && manqueSpe >= restant;

    let pool: readonly ObjetTemplate[];
    if (forcerSpe) {
      const tenterExclusif =
        poolExclusifSpe.length > 0 && Math.random() < chanceExclusif;
      pool = tenterExclusif ? poolExclusifSpe : poolCommunSpe;
    } else {
      const tenterExclusif =
        exclusifs.length > 0 && Math.random() < chanceExclusif;
      pool = tenterExclusif ? exclusifs : poolGenerique;
    }
    if (pool.length === 0) continue;

    const t = tirerTemplatePondere(pool, celebritePresente);
    // Pas de doublon pour rares et légendaires
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    dejaTires.add(t.templateId);
    items.push(instancier(t, tendances, brocante?.tier ?? 1, brocante));
  }
  return items;
}

export interface ResultatNegociation {
  accepte: boolean;
  fache: boolean;
  prixFinal: number;
  message: string;
}

/** Le seuil min monte de X % de l'écart (prixVendeur − prixMinAccept) par tentative. */
const DURCISSEMENT_PAR_TENTATIVE = 0.18;
/** Le seuil de colère monte de Y points par tentative. */
const COLERE_MONTEE_PAR_TENTATIVE = 0.06;
/** Probabilité de colère aléatoire ajoutée à chaque tentative supplémentaire. */
const CHANCE_FACHE_PAR_TENTATIVE = 0.1;

const MESSAGES_REFUS_POLI = [
  `« C'est encore trop peu. Faites un effort. »`,
  `« Allons, vous savez bien que ça vaut mieux. »`,
  `« Je commence à m'impatienter… »`,
  `« Dernière chance avant que je remballe. »`,
];

/**
 * Réaction du vendeur à une contre-proposition du joueur.
 * Plus le joueur a fait de tentatives, plus le vendeur durcit sa position :
 * - son prix min accepté se rapproche de son prix demandé
 * - son seuil de colère remonte
 * - une chance aléatoire de colère s'ajoute, croissante par tentative
 */
export function reagirNegociation(
  offre: number,
  objet: { prixVendeur: number; prixMinAccept: number },
  tentativesPrecedentes: number = 0,
): ResultatNegociation {
  const t = Math.max(0, tentativesPrecedentes);

  // Durcissement progressif du prix min accepté
  const ecart = Math.max(0, objet.prixVendeur - objet.prixMinAccept);
  const facteurDurcissement = Math.min(1, t * DURCISSEMENT_PAR_TENTATIVE);
  const prixMinActuel = Math.round(
    objet.prixMinAccept + ecart * facteurDurcissement,
  );

  // Seuil de colère qui grimpe
  const seuilColereActuel = Math.min(
    0.95,
    SEUIL_COLERE_VENDEUR + t * COLERE_MONTEE_PAR_TENTATIVE,
  );
  const seuilEnEuros = Math.round(objet.prixVendeur * seuilColereActuel);

  // Chance aléatoire de colère qui croît avec le nombre de tentatives
  const chanceFacheRandom = Math.min(0.6, t * CHANCE_FACHE_PAR_TENTATIVE);

  if (offre >= prixMinActuel) {
    return {
      accepte: true,
      fache: false,
      prixFinal: offre,
      message: `Marché conclu à ${offre} €.`,
    };
  }

  if (offre < seuilEnEuros) {
    return {
      accepte: false,
      fache: true,
      prixFinal: 0,
      message: `« Vous vous moquez de moi ? » Le vendeur range l'objet.`,
    };
  }

  // Zone refus poli — mais avec risque croissant de colère aléatoire
  if (chanceFacheRandom > 0 && Math.random() < chanceFacheRandom) {
    return {
      accepte: false,
      fache: true,
      prixFinal: 0,
      message: `« Vous abusez de ma patience. » Le vendeur range l'objet et tourne le dos.`,
    };
  }

  const msg =
    MESSAGES_REFUS_POLI[
      Math.min(t, MESSAGES_REFUS_POLI.length - 1)
    ];
  return {
    accepte: false,
    fache: false,
    prixFinal: 0,
    message: `Le vendeur secoue la tête : ${msg}`,
  };
}
