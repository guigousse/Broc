// @vitest-environment jsdom
/**
 * Tâche 5 : le repository composite fichier + miroir. Fichier séparé et en
 * jsdom (Ruling R2) : un des tests force un échec d'écriture localStorage via
 * `vi.spyOn(Storage.prototype, "setItem")`, qui ne patcherait rien de réel
 * sous un `MemoryStorage` stubé sur `window` en environnement node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { changerSlotActif, cleSlot, toucherDerniereSession } from "./slots";

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

  // Ruling R5 : clear() ne garantit pas une suppression durable si le disque
  // est plein AU MOMENT de l'effacement — c'est un compromis assumé, pas une
  // régression à masquer (voir le commentaire dans fichierGameRepository.ts).
  describe("clear()", () => {
    it("vide le miroir et efface le fichier du slot actif", async () => {
      const { fichierGameRepository } = await import("./fichierGameRepository");
      await fichierGameRepository.save(createMockGameState());
      await fichierGameRepository.clear();
      expect(window.localStorage.getItem(cleSlot(1))).toBeNull();
      expect(fichiers.get("slot_1")).toBe("");
    });

    it("vide quand même le miroir si l'effacement du fichier échoue, et avertit", async () => {
      const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { ecrireSave } = await import("./pontNatif");
      const { fichierGameRepository } = await import("./fichierGameRepository");
      await fichierGameRepository.save(createMockGameState());
      vi.mocked(ecrireSave).mockRejectedValueOnce({
        genre: "disque_plein",
        message: "Disque plein",
      });

      await expect(fichierGameRepository.clear()).resolves.toBeUndefined();

      expect(window.localStorage.getItem(cleSlot(1))).toBeNull();
      expect(avertir).toHaveBeenCalled();
    });
  });

  // Ruling R4 : quel `actif` fait foi pour load() quand fichier et miroir
  // divergent.
  describe("choix de l'emplacement actif au load()", () => {
    it("le miroir l'emporte quand il existe réellement, même s'il diffère du fichier", async () => {
      changerSlotActif(2); // le joueur a changé d'emplacement ; le miroir le sait déjà
      fichiers.set(
        "index",
        JSON.stringify({ actif: 1, revisions: { 1: 5, 2: 5, 3: 0 } }),
      );
      // Leurre à l'ancien `actif` du fichier (pas encore rattrapé) : si ce
      // leurre est rendu, l'implémentation a préféré le fichier à tort.
      fichiers.set("slot_1", JSON.stringify(createMockGameState({ jourActuel: 99 })));
      fichiers.set("slot_2", JSON.stringify(createMockGameState({ jourActuel: 22 })));

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(22);
    });

    it("à défaut de miroir réellement enregistré, l'actif du fichier est utilisé", async () => {
      // beforeEach a vidé localStorage : aucun index miroir n'existe ici.
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 5, 3: 0 } }),
      );
      fichiers.set("slot_2", JSON.stringify(createMockGameState({ jourActuel: 33 })));

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(33);
    });

    it("non-régression : changerSlotActif() prend effet dès le load() suivant", async () => {
      const { fichierGameRepository } = await import("./fichierGameRepository");
      await fichierGameRepository.save(createMockGameState({ jourActuel: 1 }));

      changerSlotActif(2);
      fichiers.set("slot_2", JSON.stringify(createMockGameState({ jourActuel: 55 })));
      fichiers.set(
        "index",
        JSON.stringify({ actif: 1, revisions: { 1: 1, 2: 1, 3: 0 } }),
      );

      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(55);
    });
  });
});
