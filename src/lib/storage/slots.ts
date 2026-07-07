import type { GameState } from "@/types/game";

/**
 * Index des emplacements de sauvegarde (3 parties indépendantes sur le même
 * appareil). Voir docs/superpowers/specs/2026-07-07-sauvegardes-multiples-design.md.
 *
 * Chaque opération relit l'index depuis le localStorage avant de le modifier
 * (pas de cache module) : deux onglets/sessions ne doivent pas se corrompre
 * mutuellement en écrasant un état obsolète.
 */

export type NumeroSlot = 1 | 2 | 3;

export interface MetaSlot {
  /** Nom donné par le joueur (Renommer) ; null = libellé auto « Partie N ». */
  nom: string | null;
  /** Timestamp ms de la dernière écriture de la save de ce slot. */
  derniereSession: number;
}

export interface IndexSlots {
  /** L'emplacement que Continuer reprend et que GameContext lit/écrit. */
  actif: NumeroSlot;
  slots: Record<NumeroSlot, MetaSlot | null>;
}

export const CLE_INDEX = "projet-broc:slots:v1";
const CLE_LEGACY = "projet-broc:game-state:v1";
const NUMEROS_SLOTS: readonly NumeroSlot[] = [1, 2, 3];
const LONGUEUR_MAX_NOM = 24;

export function cleSlot(n: NumeroSlot): string {
  return `projet-broc:slot:${n}:v1`;
}

function indexParDefaut(): IndexSlots {
  return { actif: 1, slots: { 1: null, 2: null, 3: null } };
}

function estMetaSlotValide(meta: unknown): meta is MetaSlot | null {
  if (meta === null) return true;
  if (typeof meta !== "object") return false;
  const candidat = meta as Partial<MetaSlot>;
  return (
    (candidat.nom === null || typeof candidat.nom === "string") &&
    typeof candidat.derniereSession === "number"
  );
}

function estIndexValide(valeur: unknown): valeur is IndexSlots {
  if (typeof valeur !== "object" || valeur === null) return false;
  const candidat = valeur as Partial<IndexSlots>;
  if (candidat.actif !== 1 && candidat.actif !== 2 && candidat.actif !== 3) {
    return false;
  }
  if (typeof candidat.slots !== "object" || candidat.slots === null) {
    return false;
  }
  const slots = candidat.slots as Record<string, unknown>;
  return NUMEROS_SLOTS.every((n) => estMetaSlotValide(slots[n]));
}

/** Lecture brute de l'index (sans migration, sans défaut). */
function lireIndexBrut(): IndexSlots | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLE_INDEX);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    return estIndexValide(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Distingue « aucune clé d'index » de « clé présente mais illisible » : la
 * migration ne doit se déclencher que dans le premier cas, jamais par-dessus
 * un index existant (même corrompu).
 */
function indexExiste(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLE_INDEX) !== null;
  } catch {
    return false;
  }
}

function ecrireIndex(index: IndexSlots): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(CLE_INDEX, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

/**
 * Migration lazy de l'ancienne clé unique vers le slot 1, gardée par
 * l'absence d'index. Paranoïaque : copie, relit, compare par égalité de
 * chaîne stricte ; ce n'est qu'après cette vérification que l'index est
 * écrit puis la legacy supprimée. Tout échec intermédiaire est un no-op
 * total (rien n'est détruit, rien n'est écrit).
 */
function tenterMigrationLegacy(): void {
  if (typeof window === "undefined") return;

  let legacy: string | null;
  try {
    legacy = window.localStorage.getItem(CLE_LEGACY);
  } catch {
    return;
  }
  if (legacy === null) return;

  // État anormal : la clé du slot 1 ne devrait jamais exister tant qu'aucun
  // index n'a été créé (c'est justement ce que cette migration s'apprête à
  // faire). Si elle existe déjà, ne rien risquer — on n'écrase pas une save
  // potentiellement plus récente que la legacy avec `setItem` ci-dessous.
  let cleSlot1Existante: string | null;
  try {
    cleSlot1Existante = window.localStorage.getItem(cleSlot(1));
  } catch {
    return;
  }
  if (cleSlot1Existante !== null) return;

  try {
    window.localStorage.setItem(cleSlot(1), legacy);
  } catch {
    return;
  }

  let relu: string | null;
  try {
    relu = window.localStorage.getItem(cleSlot(1));
  } catch {
    return;
  }

  // Égalité de chaîne stricte : la moindre divergence annule la migration.
  if (relu !== legacy) return;

  const index: IndexSlots = {
    actif: 1,
    slots: {
      1: { nom: null, derniereSession: Date.now() },
      2: null,
      3: null,
    },
  };
  if (!ecrireIndex(index)) return;

  try {
    window.localStorage.removeItem(CLE_LEGACY);
  } catch {
    // L'index est déjà écrit : la legacy devient orpheline mais inerte,
    // puisque chargerIndex() ne la relira plus jamais (un index existe).
  }
}

/**
 * Charge l'index des emplacements, migrant l'ancienne save unique au
 * besoin. Toujours SSR-safe et jamais destructif : en cas de doute, on
 * retombe sur le défaut (3 slots vides, slot 1 actif) sans rien écrire.
 */
export function chargerIndex(): IndexSlots {
  if (typeof window === "undefined") return indexParDefaut();

  if (indexExiste()) {
    return lireIndexBrut() ?? indexParDefaut();
  }

  tenterMigrationLegacy();

  return lireIndexBrut() ?? indexParDefaut();
}

export function slotActif(): NumeroSlot {
  if (typeof window === "undefined") return 1;
  return chargerIndex().actif;
}

export function changerSlotActif(n: NumeroSlot): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();
  index.actif = n;
  ecrireIndex(index);
}

/** Trim, tronqué à 24 caractères, chaîne vide → null. */
export function renommerSlot(n: NumeroSlot, nom: string | null): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();
  // Un slot vide n'a rien à renommer : créer une MetaSlot fantôme ferait
  // passer un emplacement vide pour occupé (voir `construireLignes`).
  // ⚠ L'occupation se juge aussi par la CLÉ de save (clé orpheline sans
  // entrée d'index — même critère que `premierSlotLibre`) : l'UI affiche
  // alors le slot comme occupé et son Renommer doit fonctionner.
  let cleOccupee = false;
  try {
    cleOccupee = window.localStorage.getItem(cleSlot(n)) !== null;
  } catch {
    // stockage indisponible : on s'en tient à l'index
  }
  if (!index.slots[n] && !cleOccupee) return;
  const trimme = nom === null ? "" : nom.trim().slice(0, LONGUEUR_MAX_NOM);
  const nomFinal = trimme === "" ? null : trimme;
  const existant = index.slots[n];
  index.slots[n] = {
    nom: nomFinal,
    derniereSession: existant ? existant.derniereSession : 0,
  };
  ecrireIndex(index);
}

function slotOccupePlusRecent(
  index: IndexSlots,
  exclure: NumeroSlot,
): NumeroSlot | null {
  let meilleur: NumeroSlot | null = null;
  let meilleureDate = -Infinity;
  for (const n of NUMEROS_SLOTS) {
    if (n === exclure) continue;
    const meta = index.slots[n];
    if (meta !== null && meta.derniereSession > meilleureDate) {
      meilleureDate = meta.derniereSession;
      meilleur = n;
    }
  }
  return meilleur;
}

/**
 * Efface la clé de save d'un slot et met son entrée d'index à null, en
 * mutant `index` en place. Partagé par `supprimerSlot` et `viderSlotActif`,
 * qui ne diffèrent que sur le devenir de `index.actif`.
 */
function effacerCleEtEntree(index: IndexSlots, n: NumeroSlot): void {
  try {
    window.localStorage.removeItem(cleSlot(n));
  } catch {
    // Le pire cas : la clé de save reste orpheline, mais l'index est quand
    // même mis à jour pour refléter l'intention (slot considéré vide).
  }
  index.slots[n] = null;
}

/**
 * Efface la clé de save du slot et son entrée d'index. Si c'était
 * l'emplacement actif, l'actif bascule sur le slot occupé le plus récent
 * (sinon reste sur `n`, désormais vide).
 */
export function supprimerSlot(n: NumeroSlot): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();

  effacerCleEtEntree(index, n);
  if (index.actif === n) {
    index.actif = slotOccupePlusRecent(index, n) ?? n;
  }
  ecrireIndex(index);
}

/**
 * Efface la clé de save du slot ACTIF et son entrée d'index, sans jamais
 * rebasculer l'actif (contrairement à `supprimerSlot`). C'est la sémantique
 * de « Supprimer la sauvegarde » dans Réglages : on repart à zéro sur LE
 * MÊME emplacement, on ne change pas de partie en cours de route.
 */
export function viderSlotActif(): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();
  effacerCleEtEntree(index, index.actif);
  ecrireIndex(index);
}

/** Upsert la meta du slot en conservant le nom existant. */
export function toucherDerniereSession(n: NumeroSlot): void {
  if (typeof window === "undefined") return;
  const index = chargerIndex();
  const existant = index.slots[n];
  index.slots[n] = {
    nom: existant ? existant.nom : null,
    derniereSession: Date.now(),
  };
  ecrireIndex(index);
}

export function premierSlotLibre(): NumeroSlot | null {
  if (typeof window === "undefined") return null;
  const index = chargerIndex();
  for (const n of NUMEROS_SLOTS) {
    if (index.slots[n] !== null) continue;
    // Un index corrompu/désynchronisé peut avoir une entrée null alors que
    // la clé de save du slot existe encore (orpheline) : ne jamais la
    // considérer libre, sous peine d'écraser une vraie partie sans passer
    // par la confirmation Écraser.
    let clePresente: boolean;
    try {
      clePresente = window.localStorage.getItem(cleSlot(n)) !== null;
    } catch {
      clePresente = false;
    }
    if (!clePresente) return n;
  }
  return null;
}

/**
 * Parse la save d'un slot pour un résumé d'affichage. Défensif : toute
 * absence, corruption JSON ou champ manquant/mal typé renvoie null plutôt
 * que de risquer un résumé trompeur.
 */
export function resumeSlot(
  n: NumeroSlot,
): { jour: number; niveau: number; budget: number } | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(cleSlot(n));
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const state = parsed as Partial<GameState>;
  const jour = state.jourActuel;
  const budget = state.budget;
  const niveau = state.brocanteur?.niveau;

  if (
    typeof jour !== "number" ||
    typeof budget !== "number" ||
    typeof niveau !== "number"
  ) {
    return null;
  }

  return { jour, niveau, budget };
}
