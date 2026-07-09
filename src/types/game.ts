import type { ActivesUtilisees } from "@/lib/actives";

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
  /** Présent si l'objet est en cours de restauration à l'atelier (temps réel). */
  enRestauration?: {
    etatCible: EtatObjet;
    /** Ancre (temps de confiance, epoch ms) du début. */
    debutMs: number;
    /** Échéance (epoch ms) : restauration prête quand now >= finMs. */
    finMs: number;
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
  /**
   * Donation présente dans le slot (état + valeur préservés). null = slot vide.
   * `valeur` inclut la prime de restauration (Très bon/Pristin) ; `valeurBase`
   * conserve le prix de référence brut pour recréer l'objet si on le retire.
   */
  donation: { etat: EtatObjet; valeur: number; valeurBase?: number } | null;
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
  /** Position du centre dans le coffre, en pourcentage du côté (0..1). Optionnel pour rétro-compat. */
  posX?: number;
  posY?: number;
  /** Rotation libre en degrés (0..360, valeurs hors plage tolérées). Optionnel pour rétro-compat. */
  rotation?: number;
}

export interface VitrineActive {
  brocanteId: string;
  objets: ObjetEnVitrine[];
  /**
   * Temps restant (en secondes) de la journée de vente en cours. Persisté pour
   * reprendre le compte à rebours là où il en était après une mise en
   * arrière-plan / fermeture de l'app (le timer n'est pas une horloge réelle :
   * il se met en pause sur les clients, donc on sauvegarde le restant, pas un
   * horodatage de départ). Absent tant que la journée n'a pas démarré.
   */
  tempsRestantSec?: number;
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

/* === Courrier (système de lettres au QG) ============================== */

export type CourrierType = "lettre" | "mission";

/** Récompense optionnelle attachée à une lettre. Appliquée à la lecture. */
export interface RecompenseCourrier {
  argent?: number;
}

/**
 * Paramètres de régénération d'un texte de courrier à gabarit (i18n SP4). Champ
 * ADDITIF : son absence ⇒ comportement historique (lecture du payload FR).
 */
export interface CourrierGabaritParams {
  /** État minimum requis, pour reformer la mention `{etat}` dans la locale. */
  etatMin?: EtatObjet;
}

/** Lettre narrative générique (mère, ami, maire, client…). */
export interface CourrierPayloadLettre {
  type: "lettre";
  expediteurId: string;
  titre: string;
  /** Corps découpé en paragraphes (un <p> par entrée). */
  corps: string[];
  recompense?: RecompenseCourrier;
  /**
   * Id du gabarit de texte utilisé (`"cle#index"`, cf. `GabaritQueteId`). ADDITIF :
   * permet de régénérer le texte dans la locale d'affichage. Absent ⇒ payload FR.
   */
  gabaritId?: string;
  /** Paramètres de régénération (état min…). ADDITIF, absent ⇒ payload FR. */
  gabaritParams?: CourrierGabaritParams;
}

/** Catégorie d'une commande : principale (importante/scénarisée) ou secondaire. */
export type MissionCategorie = "principale" | "quotidienne" | "hebdomadaire";

/** Une cible d'une commande : un objet précis à fournir. */
export interface MissionCible {
  templateId: string;
  /** État minimum requis (Mauvais < Bon < Très bon < Pristin état). */
  etatMin?: EtatObjet;
}

/** Mission reçue par lettre : fournir un ou plusieurs objets contre récompense. */
export interface CourrierPayloadMission {
  type: "mission";
  categorie: MissionCategorie;
  expediteurId: string;
  titre: string;
  /** Corps narratif (même rendu que les lettres). */
  corps: string[];
  /** Objets demandés (1 ou plusieurs). */
  cibles: MissionCible[];
  /** Si défini, mission expirée si `jourActuel > jourLimite`. */
  jourLimite?: number;
  recompense: { argent: number };
  /** Si vrai, la livraison ne consomme PAS les objets ciblés (le joueur les
   *  garde). Utilisé par la finale de l'arc principal (« Les bijoux de la reine »). */
  conserverCibles?: boolean;
  /**
   * Id du gabarit de texte utilisé (`"cle#index"`, cf. `GabaritQueteId`). ADDITIF :
   * permet de régénérer le texte dans la locale d'affichage. Absent ⇒ payload FR.
   */
  gabaritId?: string;
  /** Paramètres de régénération (état min…). ADDITIF, absent ⇒ payload FR. */
  gabaritParams?: CourrierGabaritParams;
}

export type CourrierPayload = CourrierPayloadLettre | CourrierPayloadMission;

export interface Courrier {
  id: string;
  type: CourrierType;
  jourRecu: number;
  lu: boolean;
  payload: CourrierPayload;
}

/* === Missions (résolution côté state, dérivée des Courrier mission) === */

export type MissionStatut = "active" | "livree" | "expiree";

/** Lot de commandes périodiques en cours (quotidien ou hebdo). */
export interface LotPeriodique {
  /** Clé de période : "2026-06-25" (jour local) ou "2026-W26" (semaine ISO locale). */
  cle: string;
  /** IDs des courriers du lot courant. */
  courrierIds: string[];
}

/** Résolution d'une mission (couple avec un Courrier de type mission). */
export interface MissionResolution {
  /** Référence vers le Courrier qui porte le payload mission. */
  courrierId: string;
  statut: MissionStatut;
  /** Jour de livraison (statut=livree) ou d'expiration (statut=expiree). */
  jourResolution?: number;
}

/* === Grand livre (journal de toutes les transactions de budget) ======= */

export type LedgerKind =
  | "session_chinage"
  | "session_vente"
  | "frais_brocante"
  | "loyer"
  | "gazette"
  | "courrier_recompense"
  | "mission_recompense"
  | "upgrade_atelier"
  | "upgrade_stockage"
  | "upgrade_camion";

export interface LedgerEntry {
  id: string;
  jour: number;
  /** Horodatage absolu (Date.now()) pour le tri stable. */
  timestamp: number;
  kind: LedgerKind;
  /** Libellé court visible dans le tableau : "Brocante du Lac · 4 acquis". */
  designation: string;
  /** Argent entrant (>= 0). */
  recette: number;
  /** Argent sortant (>= 0). */
  depense: number;
  /** Snapshot du budget après l'opération — utilisé pour la colonne Solde. */
  soldeApres: number;
  /** Si l'entrée est liée à une session du joueur (chinage/vente). */
  sessionId?: string;
  /** Si l'entrée est liée à un courrier (récompense lettre / mission). */
  courrierId?: string;
}

export interface GameState {
  /** Version du schéma de sauvegarde (cf. SAVE_VERSION dans lib/migrations). Absente sur les vieux saves. */
  version?: number;
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
  competencesDebloquees: CompetenceId[];
  /** Niveau global du joueur (Niveau de Brocanteur) : XP, niveau, points de compétence. */
  brocanteur: BrocanteurState;
  collection: Record<CategorieObjet, CollectionSlot[]>;
  /** Vrai si la modale d'annonce du déblocage du boss a déjà été montrée. */
  bossDebloqueSeen: boolean;
  /** Dernier Niveau de Brocanteur déjà célébré par l'écran de level-up. Toujours ≤ brocanteur.niveau. */
  niveauVu: number;
  /** Météo de chaque jour de la semaine en cours (longueur 7, lundi → dimanche). Régénérée à chaque édition. */
  meteoSemaine: Meteo[];
  /** Célébrité attendue cette édition de la Gazette. null = aucune (avant la 1ʳᵉ édition). */
  celebriteActuelle: CelebriteEvenement | null;
  /** Vrai si le joueur a utilisé son reroll (météo ou célébrité) sur l'édition courante. */
  influenceUtilisee: boolean;
  /** Dernier loyer prélevé (utile pour l'UI). null = pas encore prélevé. */
  dernierLoyer: { jour: number; montant: number; tierNom: string } | null;
  /** Lettres reçues (narratives, événements, programmées…). */
  courriers: Courrier[];
  /** Niveau de l'atelier (1, 2 ou 3). Nombre de slots = niveau. Par défaut 1. */
  niveauAtelier: 1 | 2 | 3;
  /** Niveau du stockage (1 à 4). Détermine capacité et loyer. */
  niveauStockage: 1 | 2 | 3;
  /** Niveau du camion (1 à 4). Détermine la capacité du coffre. Défaut 1. */
  niveauCamion: NiveauCamion;
  /** Stock de pièces d'amélioration par catégorie (≥ 0, illimité). */
  piecesAmelioration: Record<CategorieObjet, number>;
  /** Un chat squatte le fauteuil et bloque l'action « Passer la journée ». */
  chatSurFauteuil: boolean;
  /** Nombre de passages volontaires consécutifs sans apparition du chat (pity timer, capé à 3). */
  passagesSansChat: number;
  /** IDs des déclencheurs de courrier déjà résolus (anti-respawn pour programmés/one-shots). */
  declencheursDeclenches: string[];
  /** Grand livre — journal de toutes les transactions de budget. */
  grandLivre: LedgerEntry[];
  /** Résolutions de mission (1 par Courrier de type mission lu). */
  missions: MissionResolution[];
  /** Lots de commandes périodiques en cours (quotidien / hebdo). */
  quetesPeriodiques: {
    quotidien: LotPeriodique;
    hebdo: LotPeriodique;
  };
  /** Énergie courante (0..ENERGIE_MAX). Démarre pleine. */
  energie: number;
  /** Ancre du dernier calcul d'énergie : timestamp de TEMPS DE CONFIANCE (epoch ms),
   *  jamais l'horloge brute du device (cf. lib/temps). */
  energieDerniereMaj: number;
  /** Suivi des boîtes mystère réclamées le jour de jeu courant
   *  (pilote la probabilité d'apparition décroissante). Absent = aucune. */
  boiteMystere?: { jour: number; reclamees: number };
  /** Pubs « +1 énergie » vues ce jour calendaire local (plafond quotidien,
   *  clé YYYY-MM-DD en temps de confiance). Absent = aucune aujourd'hui. */
  pubsEnergie?: { cle: string; n: number };
  /** Usages du jour des compétences actives (clé = jourActuel). Absent tant qu'aucune active n'a servi. */
  activesUtilisees?: ActivesUtilisees;
}

export type CompetenceId = string;
/** ID d'un arbre — soit "general", soit `cat.<Categorie>` */
export type CompetenceTreeId = string;

export interface BrocanteurState {
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
  /** Niveau de Brocanteur minimal pour acheter ce palier. */
  niveauBrocanteurRequis: number;
  prerequis: CompetenceId[];
  placeholder?: boolean;
}

export interface PalierDef {
  numero: number;
  nom: string;
  description: string;
  coutPoints: number;
  /** Niveau de Brocanteur minimal pour acheter ce palier. */
  niveauBrocanteurRequis: number;
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
  /** templateId source (ex. "out.scie_egoine_stanley"). Ajouté pour
   *  permettre la résolution d'image au replay. Pour les sessions migrées
   *  d'une ancienne save, vaut "legacy" (pas d'image disponible). */
  templateId: string;
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
  /** XP gagné pendant cette session, indexé par arbre. Vide si pré-migration. */
  xpGagne: Record<CompetenceTreeId, number>;
  /** XP de Brocanteur gagnée pendant la session (absent sur les vieilles saves). */
  xpBrocanteur?: number;
}

export interface SessionVente {
  id: string;
  type: "vente";
  jour: number;
  timestamp: number;
  niveauCamion: NiveauCamion;
  loyer: number;
  ventes: VenteHistorique[];
  invendus: number;
  xpGagne: Record<CompetenceTreeId, number>;
  /** XP de Brocanteur gagnée pendant la session (absent sur les vieilles saves). */
  xpBrocanteur?: number;
}

export type Session = SessionChinage | SessionVente;

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
  | { type: "niveau"; niveau: number }
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
  | "antiquaire"
  | "pipelette"
  | "videcave"
  | "bonimenteur"
  | "disquaire"
  | "joueur"
  | "setdesigner"
  | "modeuse"
  | "esthete";

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

/**
 * Clé de pool de répliques de négociation. Chaque clé indexe une liste de
 * variantes FR (`POOLS_NEGO_FR`) et ses homologues EN/ES (overlays `nego`).
 * Le message affiché est résolu À L'AFFICHAGE via `texteNego()` (jamais
 * persisté : `NegociationState` vit en `useState`, hors save).
 */
export type CleMessageNego =
  | "ouvertureAchat" | "ouvertureVente"
  | "contreVendeur" | "contreClient"
  | "refusPoliVendeur" | "refusPoliClient"
  | "fache" | "accord" | "relance"
  | "diplomate" | "bonimentConclu" | "bonimentDernierMot" | "lotGarni";

/**
 * Message de négociation structuré (indépendant de la langue). On mémorise la
 * clé de pool + l'index de variante tiré au moment de l'événement + les
 * paramètres d'interpolation ; la langue est appliquée au rendu.
 */
export interface MessageNego {
  cle: CleMessageNego;
  /** Index de variante tiré au moment de l'événement (modulo la taille du pool par langue). */
  variante: number;
  params?: { prix?: number; cibleSecrete?: number };
}

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
  message: MessageNego;
}

export type TailleObjet = "XS" | "S" | "M" | "L" | "XL";

/**
 * Surface relative occupée par taille. Calibration manuelle pour avoir des
 * objets visuellement compacts dans le coffre N1 Rogers (cap 9) :
 * XS ≈ 29 % / S ≈ 33 % / M ≈ 41 % / L ≈ 58 % / XL ≈ 75 % du côté.
 */
export const PLACES_PAR_TAILLE: Record<TailleObjet, number> = {
  XS: 0.75,
  S:  1.00,
  M:  1.50,
  L:  3.00,
  XL: 5.00,
};

export type NiveauCamion = 1 | 2 | 3;
