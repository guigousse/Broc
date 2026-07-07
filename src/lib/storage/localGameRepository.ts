import type { GameState } from "@/types/game";
import type { GameRepository } from "./gameRepository";
import { cleSlot, slotActif, toucherDerniereSession, viderSlotActif } from "./slots";

export const localGameRepository: GameRepository = {
  async load() {
    if (typeof window === "undefined") return null;
    // slotActif() force chargerIndex(), qui migre paresseusement l'ancienne
    // save unique (clé legacy) vers le slot 1 la toute première fois.
    const raw = window.localStorage.getItem(cleSlot(slotActif()));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  },
  async save(state) {
    if (typeof window === "undefined") return false;
    const n = slotActif();
    try {
      window.localStorage.setItem(cleSlot(n), JSON.stringify(state));
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
    viderSlotActif();
  },
};
