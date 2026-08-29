import type { GameState } from "@/types/game";
import type { GameRepository, ResultatSave } from "./gameRepository";
import type { GenreErreur } from "./pontNatif";
import {
  cleBackup,
  cleSlot,
  slotActif,
  supprimerSlot,
  toucherDerniereSession,
  viderSlotActif,
  type NumeroSlot,
} from "./slots";

// `save()` n'écrit plus de copie de secours (`cleBackup`) — le fichier
// atomique (`fichierGameRepository`, sous Tauri) a pris ce rôle. `cleBackup`
// reste néanmoins lue ici : c'est la parachute des saves écrites par une
// version antérieure du jeu, encore présentes sur les appareils des joueurs.
export { cleBackup } from "./slots";

function parseState(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

/** Déduit le genre d'échec du nom de l'exception levée par `localStorage.setItem`. */
function genreDeLErreur(err: unknown): GenreErreur {
  const nom = err instanceof Error ? err.name : "";
  return nom === "QuotaExceededError" || nom === "NS_ERROR_DOM_QUOTA_REACHED"
    ? "disque_plein"
    : "io";
}

/**
 * Lit le slot DONNÉ (pas nécessairement l'actif) : le corps de l'ancien
 * `load()`, paramétré par emplacement. Introduit pour `fichierGameRepository`
 * (Ruling R6), qui résout son `n` une seule fois et doit pouvoir le passer
 * ici plutôt que de laisser ce module re-résoudre le sien via `slotActif()`
 * — sinon, en cas de désaccord entre miroir et fichier, la copie de secours
 * pourrait être lue depuis le mauvais emplacement.
 *
 * Garde le filet `cleBackup(n)` : la parachute pour les saves écrites par
 * une version antérieure du jeu, avant ce chantier.
 */
export async function chargerSlot(n: NumeroSlot): Promise<GameState | null> {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(cleSlot(n));
  const principal = parseState(raw);
  if (principal) return principal;
  if (!raw) return null;
  // Save présente mais illisible (JSON tronqué — kill pendant une
  // écriture ?) : on tente la copie de secours avant d'abandonner.
  const secours = parseState(window.localStorage.getItem(cleBackup(n)));
  if (secours) {
    console.warn(
      `[localGameRepository] Slot ${n} illisible (${raw.length} caractères) — restauré depuis la copie de secours.`,
    );
    try {
      window.localStorage.setItem(cleSlot(n), JSON.stringify(secours));
    } catch {
      // Réparation impossible (quota) : on sert quand même la copie.
    }
    return secours;
  }
  console.warn(
    `[localGameRepository] Sauvegarde illisible (parse KO, ${raw.length} caractères) et copie de secours absente ou illisible — traitée comme absente.`,
  );
  return null;
}

/**
 * Écrit dans le slot DONNÉ : le corps de l'ancien `save()`, paramétré par
 * emplacement (mêmes raisons que `chargerSlot`, Ruling R6).
 */
export async function enregistrerSlot(
  n: NumeroSlot,
  state: GameState,
): Promise<ResultatSave> {
  if (typeof window === "undefined") return { ok: false, genre: "indisponible" };
  const serialise = JSON.stringify(state);
  try {
    window.localStorage.setItem(cleSlot(n), serialise);
  } catch (err) {
    // Quota localStorage dépassé ou stockage indisponible (navigation privée).
    console.warn(
      "[localGameRepository] Échec de la sauvegarde de la partie :",
      err,
    );
    return { ok: false, genre: genreDeLErreur(err) };
  }
  toucherDerniereSession(n);
  return { ok: true };
}

// slotActif() force chargerIndex(), qui migre paresseusement l'ancienne save
// unique (clé legacy) vers le slot 1 la toute première fois : `load()` et
// `save()` ci-dessous en dépendent pour l'usage navigateur autonome
// (Réglages, tests existants). `chargerSlot`/`enregistrerSlot` restent la
// seule logique ; ces méthodes ne font que résoudre l'actif et déléguer.
export const localGameRepository: GameRepository = {
  load() {
    return chargerSlot(slotActif());
  },
  save(state, slot) {
    return enregistrerSlot(slot ?? slotActif(), state);
  },
  async clear() {
    if (typeof window === "undefined") return;
    // viderSlotActif efface la clé du slot ET sa copie de secours.
    viderSlotActif();
  },
  async clearSlot(n) {
    // Sémantique « Supprimer » de PartiesModal : clé + copie de secours +
    // entrée d'index, et rebascule de l'actif si `n` l'était.
    supprimerSlot(n);
  },
  invaliderEcrituresEnVol() {
    // localStorage est synchrone : aucune écriture n'est jamais en vol.
  },
};
