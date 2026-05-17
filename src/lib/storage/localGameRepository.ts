import type { GameState } from "@/types/game";
import type { GameRepository } from "./gameRepository";

const STORAGE_KEY = "projet-broc:game-state:v1";

export const localGameRepository: GameRepository = {
  async load() {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  },
  async save(state) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  async clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
