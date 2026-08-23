// @vitest-environment jsdom
/**
 * Tâche 5 : le repository composite fichier + miroir. Fichier séparé et en
 * jsdom (Ruling R2) : un des tests force un échec d'écriture localStorage via
 * `vi.spyOn(Storage.prototype, "setItem")`, qui ne patcherait rien de réel
 * sous un `MemoryStorage` stubé sur `window` en environnement node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { cleSlot, toucherDerniereSession } from "./slots";

const fichiers = new Map<string, string>();
vi.mock("./pontNatif", async (orig) => ({
  ...(await orig<typeof import("./pontNatif")>()),
  lireSave: vi.fn(async (q: string) => fichiers.get(q) ?? null),
  ecrireSave: vi.fn(async (q: string, c: string) => {
    fichiers.set(q, c);
  }),
}));

describe("fichierGameRepository", () => {
  beforeEach(() => {
    fichiers.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("écrit le slot puis l'index, et rend ok", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: true });
    expect(fichiers.has("slot_1")).toBe(true);
    expect(fichiers.has("index")).toBe(true);
  });

  it("relit ce qu'il a écrit", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const etat = createMockGameState({ jourActuel: 42 });
    await fichierGameRepository.save(etat);
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(42);
  });

  it("remonte le genre disque_plein sans écrire l'index", async () => {
    const { ecrireSave } = await import("./pontNatif");
    vi.mocked(ecrireSave).mockRejectedValueOnce({
      genre: "disque_plein",
      message: "Disque plein",
    });
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: false, genre: "disque_plein" });
    expect(fichiers.has("index")).toBe(false);
  });

  it("miroite dans localStorage même quand le fichier a réussi", async () => {
    const { fichierGameRepository } = await import("./fichierGameRepository");
    await fichierGameRepository.save(createMockGameState());
    expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
  });

  it("rend ok même si le miroir localStorage échoue", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const r = await fichierGameRepository.save(createMockGameState());
    expect(r).toEqual({ ok: true });
  });

  it("retombe sur le miroir quand le fichier du slot est corrompu", async () => {
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 9 })),
    );
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 1, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", "{ceci n'est pas du json");
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(9);
  });

  it("préfère le miroir quand sa révision est plus haute", async () => {
    // Le scénario de l'incident : le fichier a décroché, le miroir a continué.
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 4, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", JSON.stringify(createMockGameState({ jourActuel: 10 })));
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 17 })),
    );
    toucherDerniereSession(1, 9);
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(17);
  });

  it("préfère le fichier à révision égale", async () => {
    fichiers.set("index", JSON.stringify({ actif: 1, revisions: { 1: 3, 2: 0, 3: 0 } }));
    fichiers.set("slot_1", JSON.stringify(createMockGameState({ jourActuel: 10 })));
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ jourActuel: 17 })),
    );
    toucherDerniereSession(1, 3);
    const { fichierGameRepository } = await import("./fichierGameRepository");
    const relu = await fichierGameRepository.load();
    expect(relu?.jourActuel).toBe(10);
  });
});
