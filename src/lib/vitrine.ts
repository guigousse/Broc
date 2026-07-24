import type {
  Brocante,
  CategorieObjet,
  NegoPersona,
  NegociationState,
  ObjetEnVitrine,
  Tendance,
} from "@/types/game";
import { ALL_PERSONNAGES, type ClientPersonnage } from "@/data/clients";
import { modificateurTendance } from "@/lib/tendances";
import { pickMessage, proposerOffre } from "@/lib/negociation";

/**
 * Bonus appliqué quand l'objet correspond à la spécialisation de la brocante
 * (clients amateurs prêts à payer plus pour leur thème).
 */
export const BONUS_SPECIALISATION_CLIENT = 1.1;

export interface VitrineModifiers {
  /** Bonus d'appétit catégoriel (Passion 1/2/3 cumulé via valeurs max), par catégorie. */
  bonusPassionParCategorie: Map<CategorieObjet, number>;
  /** Bonus catégoriel de tolérance de négociation (Œil aiguisé 1/2/3), par catégorie. */
  bonusToleranceParCategorie: Map<CategorieObjet, number>;
  /** Bonus général de tolérance de négociation (Verbe haut / Verbe d'or). */
  bonusToleranceNego: number;
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
  bonusToleranceParCategorie: new Map(),
  bonusToleranceNego: 0,
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
  /** Bonus de tolérance de négociation (général + max catégoriel du panier). */
  toleranceBoost: number;
  /** Fourchette « Œil aiguisé » : contient prixMax, largeur 20 %, prix
   *  jamais pile au centre. Calculée UNE fois (stable pour le client). */
  fourchettePrixMax: { min: number; max: number };
}

/**
 * Fourchette d'estimation du prix max (palier Présentation 3) : largeur
 * totale = 20 % du prix max, position du vrai prix tirée uniformément
 * entre 15 % et 85 % de la fourchette — connaître la fourchette ne suffit
 * donc pas à déduire le prix (jamais pile au centre, jamais au bord).
 */
export function calculerFourchettePrixMax(
  prixMax: number,
  alea: () => number = Math.random,
): { min: number; max: number } {
  const largeur = Math.max(2, prixMax * 0.2);
  const u = 0.15 + alea() * 0.7;
  const min = Math.round(prixMax - largeur * u);
  const max = Math.round(min + largeur);
  return { min: Math.min(min, prixMax), max: Math.max(max, prixMax) };
}

export type ClasseBourse = "petite" | "moyenne" | "grosse";

export function classeBourse(persona: ClientPersonnage): ClasseBourse {
  if (persona.appetitMax <= 0.8) return "petite";
  if (persona.appetitMax <= 1.2) return "moyenne";
  return "grosse";
}

/**
 * Plafond de bourse absolu (€) par classe : quel que soit son appétit relatif,
 * un client ne paie jamais plus que ce qu'il a en poche. Ancre la valeur des
 * tiers (les belles pièces exigent des clients riches) et coupe l'inflation
 * du flip de légendaires.
 */
export const BOURSE_PAR_CLASSE: Record<ClasseBourse, number> = {
  petite: 80,
  moyenne: 300,
  grosse: 2000,
};

/**
 * Bourse d'un persona : plafond explicite (célébrité) ou celui de sa classe,
 * multiplié par le standing du lieu (`facteurBourse` de la brocante). Les
 * bourses explicites ne sont PAS multipliées : la célébrité reste la même
 * baleine partout.
 */
export function bourseDe(persona: ClientPersonnage, facteurBourse = 1): number {
  if (persona.bourseMax != null) return persona.bourseMax;
  return Math.round(BOURSE_PAR_CLASSE[classeBourse(persona)] * facteurBourse);
}

/**
 * Bourse moyenne des clients susceptibles de visiter cette brocante (vivier
 * filtré par `tierMin`, comme `genererPoolClients`, pondéré par le standing
 * du lieu). Affichée au choix de la brocante en mode vente.
 */
export function bourseMoyenne(
  brocante: Pick<Brocante, "tier" | "facteurBourse">,
): number {
  const eligibles = ALL_PERSONNAGES.filter((p) => p.tierMin <= brocante.tier);
  if (eligibles.length === 0) return 0;
  const total = eligibles.reduce(
    (s, p) => s + bourseDe(p, brocante.facteurBourse),
    0,
  );
  return Math.round(total / eligibles.length);
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
 * Deux lectures de « trop cher » coexistent :
 * — un client modeste face à un prix honnête (proche de la référence) fait
 *   une offre honnête près de son plafond (0,85–0,95, comportement d'origine) ;
 * — un prix objectivement gonflé (> SEUIL_SURCOTE_OBJECTIVE × la référence du
 *   panier) est puni : ancrage bas 0,55 (dur) → 0,75 (mou) + risque de départ
 *   sec. Surcoter ne permet donc plus de scanner les plafonds secrets sans
 *   risque, sans pénaliser les ventes à prix juste aux petites bourses.
 */
const OFFRE_HONNETE = 0.95;
const SEUIL_SURCOTE_OBJECTIVE = 1.25;
const OFFRE_SURCOTE_BASE = 0.55;
const OFFRE_SURCOTE_SPAN = 0.2;
/**
 * Départ sec sur surcote objective : p = (ratio vs plafond − seuil) × PENTE,
 * plafonnée pour qu'une journée ne soit jamais totalement silencieuse.
 */
const DEPART_SURCOTE_PENTE = 0.8;
const DEPART_SURCOTE_MAX = 0.85;
/**
 * Tolérance d'accessibilité : pour qu'un client envisage un objet, son prix
 * affiché doit être ≤ (prixRef × appetitMax × tolérance). Au-delà, il passe
 * son chemin. Volontairement permissif pour éviter les journées silencieuses.
 */
const SEUIL_INTERET_ACHETEUR = 1.6;
/**
 * Au-delà de ce ratio (prixDemande / prixMax), le client considère le prix
 * affiché comme normal à négocier (branche médiane de `genererClientEvent`).
 * Comportement de base inchangé pour tous ; boosté par la vraie tolérance
 * de négociation via `ClientEvent.toleranceBoost` / `proposerOffreVente`.
 */
export const SEUIL_NEGO_NORMALE = 1.2;

export function calculerPrixMax(
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
  // La Passion fait craquer la tirelire : le plafond de bourse est étendu
  // du même bonus que le prix (min(brut, bourse × (1 + passion max du panier))).
  let passionMax = 0;
  for (const x of panier) {
    const b = modifiers.bonusPassionParCategorie.get(x.objet.categorie) ?? 0;
    if (b > passionMax) passionMax = b;
  }
  const plafond = Math.round(
    bourseDe(persona, brocante?.facteurBourse ?? 1) * (1 + passionMax),
  );
  return Math.max(1, Math.min(Math.round(brut * modBundle), plafond));
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
  const facteurBourse = options.brocante?.facteurBourse ?? 1;
  const accessibles = vitrine.filter((it) => {
    const plafondClient =
      Math.min(
        it.objet.prixReferenceReel * persona.appetitMax,
        bourseDe(persona, facteurBourse),
      ) * SEUIL_INTERET_ACHETEUR;
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
  } else if (prixDemande <= prixMax * SEUIL_NEGO_NORMALE) {
    mode = "negociation";
    // Dureté : 0 = offre généreuse (jusqu'à 100 % du max), 1 = offre serrée (jusqu'à ~80 %).
    // Range resserrée pour éviter les offres trop basses : haut 0.80→1.00, bas 0.70→0.90.
    const haut = 1 - persona.durete * 0.20;
    const bas = haut - 0.10;
    const offre = prixMax * (bas + Math.random() * (haut - bas));
    offreInitiale = Math.max(1, Math.round(offre));
  } else {
    const refPanier = panier.reduce((s, x) => s + x.objet.prixReferenceReel, 0);
    const surcoteObjective = prixDemande / Math.max(1, refPanier);
    if (surcoteObjective > SEUIL_SURCOTE_OBJECTIVE) {
      // Prix objectivement gonflé : risque de départ sec croissant avec la
      // surcote, et s'il s'arrête, ancrage bas — punir le scan de plafond.
      const ratioPlafond = prixDemande / Math.max(1, prixMax);
      const pDepart = Math.min(
        DEPART_SURCOTE_MAX,
        (ratioPlafond - SEUIL_NEGO_NORMALE) * DEPART_SURCOTE_PENTE,
      );
      if (Math.random() < pDepart) return null;
      mode = "negociation";
      const ratio = OFFRE_SURCOTE_BASE + (1 - persona.durete) * OFFRE_SURCOTE_SPAN;
      offreInitiale = Math.max(1, Math.round(prixMax * ratio));
    } else {
      // Prix honnête mais hors de sa bourse : offre honnête près de son
      // plafond. Plus dur → un peu en dessous. Range : 0.85 → 0.95.
      mode = "negociation";
      const ratio = OFFRE_HONNETE - persona.durete * 0.10;
      offreInitiale = Math.max(1, Math.round(prixMax * ratio));
    }
  }

  let boostCat = 0;
  for (const it of panier) {
    const b = modifiers.bonusToleranceParCategorie.get(it.objet.categorie) ?? 0;
    if (b > boostCat) boostCat = b;
  }
  const toleranceBoost = modifiers.bonusToleranceNego + boostCat;

  return {
    id: crypto.randomUUID(),
    persona,
    panier,
    prixMax,
    prixDemande,
    offreInitiale,
    mode,
    fancy: options.fancy,
    toleranceBoost,
    fourchettePrixMax: calculerFourchettePrixMax(prixMax),
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
export type NegociationVenteResult = NegociationState & {
  /** Vrai si le sauvetage Diplomate vient de se déclencher sur ce tour
   *  (fâcherie transformée en dernière chance). Champ dédié plutôt qu'un
   *  sniff du message, pour un détecteur robuste côté appelant. */
  diplomatieDeclenchee?: boolean;
};

export function proposerOffreVente(
  nego: NegociationState,
  client: ClientPersonnage,
  contreOffre: number,
  modifiers: VitrineModifiers = DEFAULT_MODIFIERS,
  options: { revelationDejaFaite?: boolean; toleranceBoost?: number } = {},
): NegociationVenteResult {
  const base = personaDepuisClient(client);
  const boost = options.toleranceBoost ?? 0;
  const persona = boost > 0 ? { ...base, tolerancePct: base.tolerancePct * (1 + boost) } : base;
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
      message: pickMessage("diplomate", { cibleSecrete: nego.cibleSecrete }),
      diplomatieDeclenchee: true,
    };
  }

  return next;
}

/** Le Boniment (N13) : closing — le client accepte jusqu'à 115 % de son plafond, sinon il abat son plafond. */
export const BONIMENT_MARGE = 1.15;

/**
 * Le Boniment : coup de closing en fin de négo. Si l'offre du joueur reste
 * sous 115 % du plafond secret du client, il l'accepte tel quel (le montant
 * conclu, c'est l'offre du joueur). Sinon il abat sa dernière carte : son
 * vrai plafond, sans se fâcher (la négo reste ouverte pour un dernier tour).
 */
export function appliquerBoniment(
  nego: NegociationState,
  offreJoueur: number,
): NegociationState {
  if (nego.mode !== "vente" || nego.statut !== "en_cours") return nego;
  if (offreJoueur <= Math.round(nego.cibleSecrete * BONIMENT_MARGE)) {
    return {
      ...nego,
      statut: "conclu",
      prixAdverseCourant: offreJoueur,
      humeur: Math.min(nego.humeur, 0.3),
      message: pickMessage("bonimentConclu"),
    };
  }
  return {
    ...nego,
    prixAdverseCourant: nego.cibleSecrete,
    derniereOffreJoueur: offreJoueur,
    message: pickMessage("bonimentDernierMot"),
  };
}

/**
 * Le Lot garni (N7) : ajoute un 2e objet du stand au panier en pleine
 * négociation. Recalcule prixDemande/prixMax pour l'ensemble et remet la
 * négo à l'échelle (cible + offre adverse courante, proportionnellement).
 */
export function ajouterAuPanier(
  ev: ClientEvent,
  ajout: ObjetEnVitrine,
  nego: NegociationState,
  tendances: readonly Tendance[],
  modifiers: VitrineModifiers,
  brocante?: Brocante,
): { ev: ClientEvent; nego: NegociationState } {
  const panier = [...ev.panier, ajout];
  const prixMax = calculerPrixMax(panier, ev.persona, tendances, modifiers, brocante);
  const evNext: ClientEvent = {
    ...ev,
    panier,
    prixDemande: ev.prixDemande + ajout.prixVente,
    prixMax,
  };
  const negoNext: NegociationState = {
    ...nego,
    cibleSecrete: prixMax,
    prixAdverseCourant: Math.max(
      1,
      Math.round((nego.prixAdverseCourant * prixMax) / Math.max(1, ev.prixMax)),
    ),
    message: pickMessage("lotGarni"),
  };
  return { ev: evNext, nego: negoNext };
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
