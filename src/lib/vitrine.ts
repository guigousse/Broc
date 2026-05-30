import type {
  Brocante,
  CategorieObjet,
  NegoPersona,
  NegociationState,
  ObjetEnVitrine,
  Tendance,
} from "@/types/game";
import type { ClientPersonnage } from "@/data/clients";
import { modificateurTendance } from "@/lib/tendances";
import { proposerOffre } from "@/lib/negociation";

/**
 * Bonus appliqué quand l'objet correspond à la spécialisation de la brocante
 * (clients amateurs prêts à payer plus pour leur thème).
 */
export const BONUS_SPECIALISATION_CLIENT = 1.1;

export interface VitrineModifiers {
  /** Bonus d'appétit catégoriel (Passion 1/2/3 cumulé via valeurs max), par catégorie. */
  bonusPassionParCategorie: Map<CategorieObjet, number>;
  /** Bonus catégoriel au seuil de colère (Œil aiguisé 1/2/3), par catégorie. */
  bonusSeuilColereParCategorie: Map<CategorieObjet, number>;
  /** Seuil de colère général (étendu par Verbe haut / Verbe d'or). */
  seuilColere: number;
  /** Multiplicateur de l'intervalle entre clients (Présentation soignée → 0.75). */
  intervalleMultiplier: number;
  /** Lecteur d'âmes : afficher nom + ambiance du persona. */
  revelePersona: boolean;
  /** Estimateur de bourse : afficher la classe de richesse. */
  releveBourse: boolean;
  /** Œil aiguisé général : exposer prixMax dans le ClientEvent. */
  oeilAiguise: boolean;
  /** Diplomate : pas de colère, le client révèle son prix max et donne une dernière chance. */
  diplomate: boolean;
  /** Stand renommé : un client à grosse bourse (appétit ×1,3) garanti par journée. */
  clientGarantiFancy: boolean;
  /** Bonne réputation : +10 % d'appétit moyen sur tous les clients. */
  bonneReputation: boolean;
}

export const DEFAULT_MODIFIERS: VitrineModifiers = {
  bonusPassionParCategorie: new Map(),
  bonusSeuilColereParCategorie: new Map(),
  seuilColere: 1.2,
  intervalleMultiplier: 1,
  revelePersona: false,
  releveBourse: false,
  oeilAiguise: false,
  diplomate: false,
  clientGarantiFancy: false,
  bonneReputation: false,
};

const BONUS_BONNE_REPUTATION = 0.1;

export interface ClientEvent {
  id: string;
  persona: ClientPersonnage;
  /** Objets que le client veut acheter (1 le plus souvent, parfois 2). */
  panier: ObjetEnVitrine[];
  /** Prix maximum total qu'il est prêt à payer pour l'ensemble. */
  prixMax: number;
  /** Prix total demandé par le joueur (somme des prix de vente). */
  prixDemande: number;
  /** Offre initiale du client (utilisée si négociation). */
  offreInitiale: number;
  /** Mode d'approche du client : achat direct ou négociation. */
  mode: "achat-direct" | "negociation";
  /** Vrai si le client a été boosté (Stand renommé). */
  fancy?: boolean;
}

export type ClasseBourse = "petite" | "moyenne" | "grosse";

export function classeBourse(persona: ClientPersonnage): ClasseBourse {
  if (persona.appetitMax <= 0.8) return "petite";
  if (persona.appetitMax <= 1.2) return "moyenne";
  return "grosse";
}

const CHANCE_MULTI = 0.2;
/**
 * Modificateur appliqué au `prixMax` quand le client prend ≥ 2 objets : il veut
 * vraiment l'ensemble, donc on remonte un peu son plafond (au lieu de l'amputer
 * d'une remise implicite). Vise à éviter les offres dérisoires sur les paniers.
 */
const BONUS_BUNDLE = 0.10;
/** Seuil sous lequel un client achète sans rechigner. */
const SEUIL_ACHAT_DIRECT = 1.0;
/**
 * Quand le prix demandé dépasse le seuil de colère, l'offre est calée
 * près du vrai plafond du client (offre honnête, pas un lowball gratuit).
 * Valeur en % de `prixMax` ; modulée par `durete`.
 */
const OFFRE_TROP_CHER = 0.95;
/**
 * Tolérance d'accessibilité : pour qu'un client envisage un objet, son prix
 * affiché doit être ≤ (prixRef × appetitMax × tolérance). Au-delà, il passe
 * son chemin. Volontairement permissif pour éviter les journées silencieuses.
 */
const SEUIL_INTERET_ACHETEUR = 1.6;

function calculerPrixMax(
  panier: ObjetEnVitrine[],
  persona: ClientPersonnage,
  tendances: readonly Tendance[],
  modifiers: VitrineModifiers,
  brocante?: Brocante,
): number {
  let facteur =
    persona.appetitMin +
    Math.random() * (persona.appetitMax - persona.appetitMin);
  if (modifiers.bonneReputation) facteur *= 1 + BONUS_BONNE_REPUTATION;

  const brut = panier.reduce((s, x) => {
    const modTend = modificateurTendance(x.objet.categorie, tendances);
    const bonusPassion =
      modifiers.bonusPassionParCategorie.get(x.objet.categorie) ?? 0;
    const modSpec = 1 + bonusPassion;
    const modBrocanteSpec =
      brocante?.specialisation === x.objet.categorie
        ? BONUS_SPECIALISATION_CLIENT
        : 1;
    let modPref = 1;
    if (persona.categoriesPreferees.includes(x.objet.categorie)) {
      modPref = 1 + persona.bonusPreference;
    } else if (persona.categoriesEvitees.includes(x.objet.categorie)) {
      modPref = Math.max(0.1, 1 - persona.malusEvitement);
    }
    return (
      s +
      x.objet.prixReferenceReel *
        facteur *
        modTend *
        modSpec *
        modBrocanteSpec *
        modPref
    );
  }, 0);
  const modBundle = panier.length > 1 ? 1 + BONUS_BUNDLE : 1;
  return Math.max(1, Math.round(brut * modBundle));
}

/** Calcule le seuil de colère effectif pour ce panier (général + max bonus catégoriel). */
function seuilColereEffectif(
  panier: ObjetEnVitrine[],
  modifiers: VitrineModifiers,
): number {
  let bonusCat = 0;
  for (const it of panier) {
    const b = modifiers.bonusSeuilColereParCategorie.get(it.objet.categorie) ?? 0;
    if (b > bonusCat) bonusCat = b;
  }
  return modifiers.seuilColere + bonusCat;
}

/**
 * Génère un événement client basé sur ce qu'il y a sur le stand.
 * Retourne null si le stand est vide.
 */
const BOOST_FANCY = 1.3;

export function genererClientEvent(
  personnage: ClientPersonnage,
  vitrine: ObjetEnVitrine[],
  tendances: readonly Tendance[] = [],
  modifiers: VitrineModifiers = DEFAULT_MODIFIERS,
  options: { fancy?: boolean; brocante?: Brocante } = {},
): ClientEvent | null {
  if (vitrine.length === 0) return null;

  // Boost l'appétit si client "fancy" (Stand renommé garanti)
  const persona: ClientPersonnage = options.fancy
    ? {
        ...personnage,
        appetitMin: personnage.appetitMin * BOOST_FANCY,
        appetitMax: personnage.appetitMax * BOOST_FANCY,
      }
    : personnage;

  // Pré-filtre : le client n'envisage que les objets dont le prix affiché reste
  // dans une fourchette plausible pour sa bourse. Au-delà, il passe son chemin.
  const accessibles = vitrine.filter((it) => {
    const plafondClient =
      it.objet.prixReferenceReel * persona.appetitMax * SEUIL_INTERET_ACHETEUR;
    return it.prixVente <= plafondClient;
  });
  if (accessibles.length === 0) return null;

  // Multi-objets : la probabilité dépend du persona
  const veutDeux =
    accessibles.length >= 2 && Math.random() < persona.chanceMulti;
  const panier: ObjetEnVitrine[] = [];

  const pool = [...accessibles];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  panier.push(pool[0]);
  if (veutDeux) panier.push(pool[1]);

  const prixDemande = panier.reduce((s, x) => s + x.prixVente, 0);
  const prixMax = calculerPrixMax(
    panier,
    persona,
    tendances,
    modifiers,
    options.brocante,
  );

  let mode: ClientEvent["mode"];
  let offreInitiale: number;

  if (prixDemande <= prixMax * SEUIL_ACHAT_DIRECT) {
    mode = "achat-direct";
    offreInitiale = prixDemande;
  } else if (prixDemande <= prixMax * seuilColereEffectif(panier, modifiers)) {
    mode = "negociation";
    // Dureté : 0 = offre généreuse (jusqu'à 100 % du max), 1 = offre serrée (jusqu'à ~80 %).
    // Range resserrée pour éviter les offres trop basses : haut 0.80→1.00, bas 0.70→0.90.
    const haut = 1 - persona.durete * 0.20;
    const bas = haut - 0.10;
    const offre = prixMax * (bas + Math.random() * (haut - bas));
    offreInitiale = Math.max(1, Math.round(offre));
  } else {
    mode = "negociation";
    // Branche "trop cher" : le client offre près de son vrai plafond.
    // Plus dur → un peu en dessous, plus mou → quasi à `prixMax`.
    // Range : 0.85 (durete 1) → 0.95 (durete 0).
    const ratio = OFFRE_TROP_CHER - persona.durete * 0.10;
    offreInitiale = Math.max(1, Math.round(prixMax * ratio));
  }

  return {
    id: crypto.randomUUID(),
    persona,
    panier,
    prixMax,
    prixDemande,
    offreInitiale,
    mode,
    fancy: options.fancy,
  };
}

/** Construit un NegoPersona à partir d'un ClientPersonnage (mode vente). */
export function personaDepuisClient(client: ClientPersonnage): NegoPersona {
  return {
    archetype: client.archetypeId,
    margePct: client.margePct,
    elanPct: client.elanPct,
    patience: client.patience,
    tolerancePct: client.tolerancePct,
    sangFroid: client.sangFroid,
  };
}

/**
 * Pas à pas vente. Encapsule la fonction pure proposerOffre + la révélation
 * du prixMax si la compétence Diplomate est active et pas encore consommée.
 */
export function proposerOffreVente(
  nego: NegociationState,
  client: ClientPersonnage,
  contreOffre: number,
  modifiers: VitrineModifiers = DEFAULT_MODIFIERS,
  options: { revelationDejaFaite?: boolean } = {},
): NegociationState {
  const persona = personaDepuisClient(client);
  const next = proposerOffre(nego, persona, contreOffre);

  // Diplomate : si on tombe fâché et que la révélation n'a pas eu lieu, on
  // transforme la fâcherie en refus poli accompagné de la révélation du
  // prixMax, et on autorise un dernier tour en remettant statut → en_cours.
  if (
    next.statut === "fache" &&
    modifiers.diplomate &&
    !options.revelationDejaFaite
  ) {
    return {
      ...next,
      statut: "en_cours",
      humeur: 0.95,
      message: `« Mon plafond, c'est ${nego.cibleSecrete} €. Une dernière fois, je vous écoute. »`,
    };
  }

  return next;
}

export const JOURNEE_DUREE_SECONDES = 90;
export const CLIENT_INTERVALLE_MIN_SEC = 8;
export const CLIENT_INTERVALLE_MAX_SEC = 14;

export function prochainIntervalleClient(
  intervalleMultiplier: number = 1,
): number {
  const span = CLIENT_INTERVALLE_MAX_SEC - CLIENT_INTERVALLE_MIN_SEC;
  return (CLIENT_INTERVALLE_MIN_SEC + Math.random() * span) * intervalleMultiplier;
}
