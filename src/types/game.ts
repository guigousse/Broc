export type CategorieObjet =
  | "Musique"
  | "Jeux & Loisirs"
  | "Livres & Papeterie"
  | "Mode"
  | "Maison"
  | "Objets d'art"
  | "Bricolage";

export type EtatObjet = "Mauvais" | "Bon" | "Très bon" | "Pristin état";

export type Rarete = "commun" | "rare" | "legendaire";

export interface Objet {
  id: string;
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  prixReferenceReel: number;
  etat: EtatObjet;
  rarete: Rarete;
  prixAchat?: number;
  /** Prix de vente fixé par le joueur dans l'overlay. Utilisé par défaut à la mise à l'étal. */
  prixVenteSouhaite?: number;
  /** Présent si l'objet est en cours de restauration à l'atelier. */
  enRestauration?: {
    etatCible: EtatObjet;
    /** Jour à partir duquel la restauration sera terminée (>=). */
    jourFin: number;
  };
}

export interface CollectionSlot {
  templateId: string;
  /** Nom complet de l'objet (snapshot pour l'affichage). */
  nom: string;
  categorie: CategorieObjet;
  rarete: Rarete;
  /** Vrai si croisé chez un vendeur ou un client. */
  vu: boolean;
  /** Vrai si possédé au moins une fois (achat, restauration). */
  dejaPossede: boolean;
  /** Donation présente dans le slot (état + valeur préservés). null = slot vide. */
  donation: { etat: EtatObjet; valeur: number } | null;
  unique?: boolean;
  /**
   * Vrai si le joueur a consulté ce slot dans la page Collection depuis sa découverte.
   * Passé à `false` quand `vu` devient vrai (nouvelle découverte), repassé à `true` au tap.
   * Pilote l'affichage du badge "nouveau" (astérisque) sur la grille.
   */
  vuDansCollection?: boolean;
}

export interface ObjetEnVitrine {
  objet: Objet;
  prixVente: number;
}

export interface VitrineActive {
  brocanteId: string;
  objets: ObjetEnVitrine[];
}

export interface Tendance {
  categorie: CategorieObjet;
  /** Variation en % appliquée au prix max des clients pour cette catégorie. */
  delta: number;
}

export type Meteo = "ensoleille" | "nuageux" | "pluvieux" | "orageux";

/** Célébrité visitant une brocante un jour précis de la semaine en cours. */
export interface CelebriteEvenement {
  brocanteId: string;
  nom: string;
  /** Index du jour dans la semaine (0 = lundi, 6 = dimanche). */
  jourSemaine: number;
}

export interface SaisieHuissier {
  type: "inventaire" | "collection";
  nom: string;
  valeur: number;
  montantRecupere: number;
}

export interface HuissierEvent {
  jour: number;
  detteAvantSaisie: number;
  saisies: SaisieHuissier[];
  budgetApres: number;
}

/* === Courrier (système de lettres au QG) ============================== */

export type CourrierType = "huissier";

export interface CourrierPayloadHuissier {
  type: "huissier";
  detteAvantSaisie: number;
  saisies: SaisieHuissier[];
  budgetApres: number;
}

export type CourrierPayload = CourrierPayloadHuissier; // discriminated union, extensible

export interface Courrier {
  id: string;
  type: CourrierType;
  jourRecu: number;
  lu: boolean;
  payload: CourrierPayload;
}

export interface GameState {
  budget: number;
  jourActuel: number;
  inventaireJoueur: Objet[];
  /** Vitrine active : objets exposés dans une brocante donnée. null = aucune vitrine ouverte. */
  vitrine: VitrineActive | null;
  historique: Session[];
  tendances: Tendance[];
  /** Tendances pré-générées pour la prochaine édition (révélées par Veille). */
  prochainesTendances: Tendance[];
  /** Jour à partir duquel les tendances seront rafraîchies. */
  prochainRafraichissementTendances: number;
  /** Édition courante de la Gazette achetée ? Reset à false à chaque refresh. */
  gazetteAchetee: boolean;
  competenceTrees: Record<CompetenceTreeId, CompetenceTreeState>;
  competencesDebloquees: CompetenceId[];
  collection: Record<CategorieObjet, CollectionSlot[]>;
  /** Vrai si la modale d'annonce du déblocage du boss a déjà été montrée. */
  bossDebloqueSeen: boolean;
  /** Météo de chaque jour de la semaine en cours (longueur 7, lundi → dimanche). Régénérée à chaque édition. */
  meteoSemaine: Meteo[];
  /** Célébrité attendue cette édition de la Gazette. null = aucune (avant la 1ʳᵉ édition). */
  celebriteActuelle: CelebriteEvenement | null;
  /** Vrai si le joueur a utilisé son reroll (météo ou célébrité) sur l'édition courante. */
  influenceUtilisee: boolean;
  /** Dernier loyer prélevé (utile pour l'UI). null = pas encore prélevé. */
  dernierLoyer: { jour: number; montant: number; tierNom: string } | null;
  /** Dernier événement huissier (liquidation forcée). null = aucun. */
  dernierHuissier?: HuissierEvent | null;
  /** Lettres reçues (huissier en V1, extensible). */
  courriers: Courrier[];
  /** Niveau de l'atelier (1, 2 ou 3). Nombre de slots = niveau. Par défaut 1. */
  niveauAtelier: 1 | 2 | 3;
  /** Niveau du stockage (1 à 4). Détermine capacité et loyer. */
  niveauStockage: 1 | 2 | 3 | 4;
  /** Stock de pièces d'amélioration par catégorie (≥ 0, illimité). */
  piecesAmelioration: Record<CategorieObjet, number>;
}

export type CompetenceId = string;
/** ID d'un arbre — soit "general", soit `cat.<Categorie>` */
export type CompetenceTreeId = string;

export interface CompetenceTreeState {
  xp: number;
  niveau: number;
  pointsDisponibles: number;
}

export interface CompetenceDef {
  id: CompetenceId;
  treeId: CompetenceTreeId;
  brancheId: string;
  palierNumero: number;
  nom: string;
  description: string;
  coutPoints: number;
  niveauRequis: number;
  prerequis: CompetenceId[];
  placeholder?: boolean;
}

export interface PalierDef {
  numero: number;
  nom: string;
  description: string;
  coutPoints: number;
  niveauArbreRequis: number;
  placeholder?: boolean;
}

export interface BrancheDef {
  id: string;
  nom: string;
  description?: string;
  paliers: PalierDef[];
}

export interface CompetenceTreeDef {
  id: CompetenceTreeId;
  nom: string;
  baseline: string;
  emoji: string;
  type: "general" | "thematique";
  categorie?: CategorieObjet;
  branches: BrancheDef[];
}

export interface ObjetSnapshot {
  nom: string;
  categorie: CategorieObjet;
  etat: EtatObjet;
  prixReferenceReel: number;
}

export interface AchatHistorique extends ObjetSnapshot {
  prixPaye: number;
}

export interface VenteHistorique extends ObjetSnapshot {
  prixVente: number;
  /** null si l'objet provient du stock initial (pas de prix d'achat connu). */
  prixAchat: number | null;
}

export interface SessionChinage {
  id: string;
  type: "chinage";
  jour: number;
  timestamp: number;
  brocanteId: string;
  brocanteNom: string;
  achats: AchatHistorique[];
}

export interface SessionVente {
  id: string;
  type: "vente";
  jour: number;
  timestamp: number;
  niveauStand: StandLevel;
  loyer: number;
  ventes: VenteHistorique[];
  invendus: number;
}

export type Session = SessionChinage | SessionVente;

export type StandLevel = 1 | 2 | 3;

export interface StandConfig {
  niveau: StandLevel;
  capaciteMin: number;
  capaciteMax: number;
  loyer: number;
  nom: string;
}

export const INITIAL_BUDGET = 150;
export const INITIAL_JOUR = 1;

export type ConditionDeblocage =
  | { type: "depart" }
  | { type: "jour"; jour: number }
  | { type: "budget"; montant: number }
  | { type: "ventesCategorie"; categorie: CategorieObjet; nombre: number }
  | { type: "brocantesDebloquees"; tier: 1 | 2 | 3; nombre: number }
  | { type: "valeurCollection"; montant: number }
  | { type: "valeurCollectionCategorie"; categorie: CategorieObjet; montant: number }
  | { type: "ET"; conditions: ConditionDeblocage[] };

export type BrocanteTier = 1 | 2 | 3 | 4;

export interface Brocante {
  id: string;
  nom: string;
  description: string;
  ambiance: string;
  taillePool: number;
  tier: BrocanteTier;
  /** Nombre d'étoiles (équivalent au tier — gardé séparé pour lisibilité UI). */
  etoiles: 1 | 2 | 3 | 4;
  /** Si présent, la brocante est spécialisée dans cette catégorie. */
  specialisation?: CategorieObjet;
  /** Pool d'objets exclusifs à cette brocante (rares et légendaires propres). */
  poolExclusif: string[]; // liste de templateId
  conditionDeblocage: ConditionDeblocage;
}

export interface ObjetEnVente {
  id: string;
  objet: Objet;
  prixVendeur: number;
  prixAffiche: boolean;
  /** Prix minimum (caché) que le vendeur accepterait. */
  prixMinAccept: number;
  /** Nombre de tentatives de négociation effectuées (pour info / XP). */
  negociationsTentees: number;
  statut: "disponible" | "achete" | "refuse";
  /** Persona vendeur tiré à l'instanciation (mode achat). */
  persona: NegoPersona;
  /** État de la négo en cours sur cet item. null avant première ouverture, valeur conservée entre fermetures. */
  negociation: NegociationState | null;
}

/** Identifiant d'archétype vendeur (chinage). */
export type VendeurArchetypeId =
  | "naif"
  | "grincheux"
  | "bonhomme"
  | "malin"
  | "mamie"
  | "antiquaire";

/** Sens de la négociation. */
export type NegoMode = "achat" | "vente";

/** Persona générique commun aux deux modes. */
export interface NegoPersona {
  /** Identifiant de l'archétype source (vendeur ou client). */
  archetype: string;
  /** Marge totale lâchable, 0–1. */
  margePct: number;
  /** Fraction du gap concédée par tour, 0–1. */
  elanPct: number;
  /** Nombre de tours max avant refus poli. */
  patience: number;
  /** Seuil de tolérance, 0–1. */
  tolerancePct: number;
  /** Résistance à l'alea de colère, 0–1. */
  sangFroid: number;
}

/** Statut courant d'une négociation. */
export type NegoStatut = "en_cours" | "refus_poli" | "fache" | "conclu";

/** État persistant d'une négociation en cours. */
export interface NegociationState {
  mode: NegoMode;
  tour: number;
  humeur: number;
  prixAdverseCourant: number;
  /** Cible secrète de l'adverse : prixMinAccept (achat) ou prixMax (vente). */
  cibleSecrete: number;
  derniereOffreJoueur: number | null;
  statut: NegoStatut;
  message: string;
}
