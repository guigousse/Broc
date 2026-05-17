import type { EtatObjet, ObjetEnVente, Rarete, Tendance } from "@/types/game";
import {
  POOL_COMPLET,
  type ObjetTemplate,
} from "@/data/objetTemplates";
import { modificateurTendance } from "@/lib/tendances";

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

/** Plage du prix min accepté par le vendeur, en % de son prix affiché. */
const TOLERANCE_MIN = 0.7;
const TOLERANCE_MAX = 0.9;
/** Seuil sous lequel l'offre est jugée insultante (vendeur se fâche). */
export const SEUIL_COLERE_VENDEUR = 0.5;

function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
): ObjetEnVente {
  const etat = pickRandom(ETATS);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  const facteurVendeur = 0.6 + Math.random() * 0.8;
  const modTend = modificateurTendance(template.categorie, tendances);
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend),
  );
  const tolerance = TOLERANCE_MIN + Math.random() * (TOLERANCE_MAX - TOLERANCE_MIN);
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

function tirerTemplatePondere(pool: readonly ObjetTemplate[]): ObjetTemplate {
  // Somme des poids
  const total = pool.reduce((s, t) => s + POIDS_RARETE[t.rarete], 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= POIDS_RARETE[t.rarete];
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

export function genererSession(
  taille: number,
  tendances: readonly Tendance[] = [],
): ObjetEnVente[] {
  // Pour la Phase 1, on tire `taille` objets indépendamment du pool complet,
  // pondérés par rareté. Les doublons sont possibles dans une même session
  // pour les communs uniquement.
  const items: ObjetEnVente[] = [];
  const dejaTires = new Set<string>();
  let attempts = 0;
  while (items.length < taille && attempts < taille * 5) {
    attempts += 1;
    const t = tirerTemplatePondere(POOL_COMPLET);
    if (t.rarete !== "commun" && dejaTires.has(t.templateId)) continue;
    dejaTires.add(t.templateId);
    items.push(instancier(t, tendances));
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
