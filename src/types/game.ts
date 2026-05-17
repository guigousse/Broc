export type CategorieObjet =
  | "Musique"
  | "Jeux & Loisirs"
  | "Livres & Papeterie"
  | "Mode"
  | "Maison"
  | "Bricolage";

export type EtatObjet = "Mauvais" | "Bon" | "Très bon" | "Pristin état";

export interface Objet {
  id: string;
  nom: string;
  categorie: CategorieObjet;
  prixReferenceReel: number;
  etat: EtatObjet;
  prixAchat?: number;
  /** Présent si l'objet est en cours de restauration à l'atelier. */
  enRestauration?: {
    etatCible: EtatObjet;
    /** Jour à partir duquel la restauration sera terminée (>=). */
    jourFin: number;
  };
}

export interface ObjetEnVitrine {
  objet: Objet;
  prixVente: number;
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
  vitrine: ObjetEnVitrine[];
  historique: Session[];
  tendances: Tendance[];
  /** Tendances pré-générées pour la prochaine édition (révélées par Veille). */
  prochainesTendances: Tendance[];
  /** Jour à partir duquel les tendances seront rafraîchies. */
  prochainRafraichissementTendances: number;
  competenceTrees: Record<CompetenceTreeId, CompetenceTreeState>;
  competencesDebloquees: CompetenceId[];
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
  | { type: "budget"; montant: number };

export interface Brocante {
  id: string;
  nom: string;
  description: string;
  ambiance: string;
  taillePool: number;
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
