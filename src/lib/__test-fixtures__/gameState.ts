import type {
  Brocante,
  CategorieObjet,
  CollectionSlot,
  EtatObjet,
  GameState,
  Objet,
  ObjetEnVitrine,
  Rarete,
} from "@/types/game";
import type { ClientPersonnage } from "@/data/clients";
import { CATEGORIES } from "@/data/categories";
import { emptyBrocanteur } from "@/lib/xp";

/**
 * Construit un GameState minimal valide pour les tests. Tous les champs
 * obligatoires sont remplis avec des valeurs neutres ; les tests peuvent
 * passer un patch pour les surcharger.
 */
export function createMockGameState(patch: Partial<GameState> = {}): GameState {
  const collection = {} as Record<CategorieObjet, CollectionSlot[]>;
  const pieces = {} as Record<CategorieObjet, number>;
  for (const c of CATEGORIES) {
    collection[c] = [];
    pieces[c] = 0;
  }

  const base: GameState = {
    budget: 1000,
    jourActuel: 1,
    inventaireJoueur: [],
    vitrine: null,
    historique: [],
    tendances: [],
    prochainesTendances: [],
    prochainRafraichissementTendances: 8,
    gazetteAchetee: false,
    competencesDebloquees: [],
    brocanteur: emptyBrocanteur(),
    collection,
    bossDebloqueSeen: false,
    niveauVu: 0,
    meteoSemaine: [],
    celebriteActuelle: null,
    influenceUtilisee: false,
    dernierLoyer: null,
    courriers: [],
    niveauAtelier: 1,
    niveauStockage: 1,
    niveauCamion: 1,
    piecesAmelioration: pieces,
    chatSurFauteuil: false,
    passagesSansChat: 0,
    declencheursDeclenches: [],
    tutorielEtape: "termine",
    grandLivre: [],
    missions: [],
    quetesPeriodiques: {
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    },
    energie: 5,
    energieDerniereMaj: 1_700_000_000_000,
  };

  return { ...base, ...patch };
}

/** Construit un Objet minimal pour les tests. */
export function createMockObjet(patch: Partial<Objet> = {}): Objet {
  const base: Objet = {
    id: `obj-${Math.random().toString(36).slice(2, 8)}`,
    templateId: "test.objet",
    nom: "Objet test",
    categorie: "Musique",
    prixReferenceReel: 100,
    etat: "Bon",
    rarete: "commun" satisfies Rarete,
  };
  return { ...base, ...patch };
}

/** Construit un CollectionSlot minimal pour les tests. */
export function createMockSlot(patch: Partial<CollectionSlot> = {}): CollectionSlot {
  const base: CollectionSlot = {
    templateId: "test.objet",
    nom: "Objet test",
    categorie: "Musique",
    rarete: "commun",
    vu: false,
    dejaPossede: false,
    donation: null,
    unique: false,
    vuDansCollection: true,
  };
  return { ...base, ...patch };
}

/** Helper : construit un état atelier avec quelques pièces. */
export function withPieces(
  state: GameState,
  cat: CategorieObjet,
  count: number,
): GameState {
  return {
    ...state,
    piecesAmelioration: { ...state.piecesAmelioration, [cat]: count },
  };
}

/** Helper : injecte des compétences débloquées. */
export function withCompetences(
  state: GameState,
  ids: string[],
): GameState {
  return {
    ...state,
    competencesDebloquees: [...state.competencesDebloquees, ...ids],
  };
}

/** Helper : exporte un EtatObjet typé (raccourci des littéraux). */
export const ETATS: EtatObjet[] = [
  "Mauvais",
  "Bon",
  "Très bon",
  "Pristin état",
];

/** Construit une Brocante minimale pour les tests. */
export function createMockBrocante(patch: Partial<Brocante> = {}): Brocante {
  const base: Brocante = {
    id: "broc-test",
    nom: "Brocante de test",
    description: "",
    ambiance: "",
    taillePool: 6,
    tier: 1,
    etoiles: 1,
    poolExclusif: [],
    conditionDeblocage: { type: "depart" },
  };
  return { ...base, ...patch };
}

/** Construit un ClientPersonnage minimal pour les tests. */
export function createMockClient(
  patch: Partial<ClientPersonnage> = {},
): ClientPersonnage {
  const base: ClientPersonnage = {
    id: "client-test",
    archetypeId: "test",
    archetypeNom: "Test",
    nom: "Client test",
    ambiance: "",
    appetitMin: 0.9,
    appetitMax: 1.1,
    durete: 0.5,
    chanceMulti: 0,
    categoriesPreferees: [],
    categoriesEvitees: [],
    bonusPreference: 0.2,
    malusEvitement: 0.3,
    tierMin: 1,
    margePct: 0.2,
    elanPct: 0.3,
    patience: 5,
    tolerancePct: 0.2,
    sangFroid: 1,
  };
  return { ...base, ...patch };
}

/** Construit un ObjetEnVitrine minimal pour les tests. */
export function createMockObjetEnVitrine(
  patch: { objet?: Partial<Objet>; prixVente?: number } = {},
): ObjetEnVitrine {
  return {
    objet: createMockObjet(patch.objet),
    prixVente: patch.prixVente ?? 100,
  };
}
