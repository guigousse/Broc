export type CategorieObjet =
  | "Musique"
  | "Jeux & Loisirs"
  | "Livres & Papeterie"
  | "Mode"
  | "Maison"
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
  competenceTrees: Record<CompetenceTreeId, CompetenceTreeState>;
  competencesDebloquees: CompetenceId[];
  collection: Record<CategorieObjet, CollectionSlot[]>;
  /** Vrai si la modale d'annonce du déblocage du boss a déjà été montrée. */
  bossDebloqueSeen: boolean;
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
}
