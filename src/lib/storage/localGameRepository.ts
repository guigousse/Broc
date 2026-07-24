import type { GameState } from "@/types/game";
import type { GameRepository } from "./gameRepository";
import {
  cleBackup,
  cleSlot,
  slotActif,
  toucherDerniereSession,
  viderSlotActif,
} from "./slots";

// Chaque save écrit d'abord la copie de secours (`cleBackup`), puis le slot
// principal : un kill du WebView en pleine écriture ne peut corrompre qu'une
// des deux clés, jamais les deux.
export { cleBackup } from "./slots";

function parseState(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export const localGameRepository: GameRepository = {
  async load() {
    if (typeof window === "undefined") return null;
    // slotActif() force chargerIndex(), qui migre paresseusement l'ancienne
    // save unique (clé legacy) vers le slot 1 la toute première fois.
    const n = slotActif();
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
  },
  async save(state) {
    if (typeof window === "undefined") return false;
    const n = slotActif();
    const serialise = JSON.stringify(state);
    try {
      window.localStorage.setItem(cleBackup(n), serialise);
    } catch (err) {
      // La copie de secours est un filet, pas un prérequis : si elle échoue
      // (quota), on tente quand même la sauvegarde principale.
      console.warn(
        "[localGameRepository] Échec de l'écriture de la copie de secours :",
        err,
      );
    }
    try {
      window.localStorage.setItem(cleSlot(n), serialise);
    } catch (err) {
      // Quota localStorage dépassé ou stockage indisponible (navigation privée).
      console.warn(
        "[localGameRepository] Échec de la sauvegarde de la partie :",
        err,
      );
      return false;
    }
    toucherDerniereSession(n);
    return true;
  },
  async clear() {
    if (typeof window === "undefined") return;
    // viderSlotActif efface la clé du slot ET sa copie de secours.
    viderSlotActif();
  },
};
