// @vitest-environment jsdom
/**
 * Tâche 6 : la migration une-fois-pour-toutes du miroir localStorage vers
 * les fichiers, jouée au premier lancement après mise à jour. Même style de
 * suite que fichierGameRepository.test.ts (Ruling R2) : un des tests force
 * un échec d'écriture localStorage via `vi.spyOn(Storage.prototype, …)`, qui
 * ne patcherait rien de réel sous un `MemoryStorage` stubé en environnement
 * node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { CLE_INDEX, cleBackup, cleSlot } from "./slots";

const fichiers = new Map<string, string>();
vi.mock("./pontNatif", async (orig) => ({
  ...(await orig<typeof import("./pontNatif")>()),
  lireSave: vi.fn(async (q: string) => fichiers.get(q) ?? null),
  ecrireSave: vi.fn(async (q: string, c: string) => {
    fichiers.set(q, c);
  }),
}));

describe("migrerVersFichiers", () => {
  beforeEach(() => {
    fichiers.clear();
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copie les slots existants et écrit l'index", async () => {
    window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
    window.localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: { 1: { nom: null, derniereSession: 1 }, 2: null, 3: null },
      }),
    );
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBe(true);
    expect(fichiers.get("slot_1")).toBe(window.localStorage.getItem(cleSlot(1)));
    expect(fichiers.has("index")).toBe(true);
  });

  it("est un no-op total quand une écriture échoue", async () => {
    window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
    const { ecrireSave } = await import("./pontNatif");
    vi.mocked(ecrireSave).mockRejectedValueOnce({ genre: "disque_plein", message: "" });
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBe(false);
    expect(fichiers.has("index")).toBe(false);
    // Surtout : le miroir est intact.
    expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
  });

  it("annule si la relecture ne rend pas exactement ce qui a été écrit", async () => {
    window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
    const { lireSave } = await import("./pontNatif");
    // Deux appels attendus pour le slot 1, dans l'ordre : le précontrôle
    // (aucun fichier déjà présent) puis la relecture après écriture (qui ne
    // correspond pas à ce qui a été écrit).
    vi.mocked(lireSave)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("un contenu different");
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBe(false);
    expect(fichiers.has("index")).toBe(false);
  });

  it("efface les copies de secours devenues orphelines, et elles seules", async () => {
    window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
    window.localStorage.setItem(cleBackup(1), "vieille copie");
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await migrerVersFichiers();
    expect(window.localStorage.getItem(cleBackup(1))).toBeNull();
    expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
  });

  it("réussit sans rien copier quand aucune partie n'existe", async () => {
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBe(true);
    expect(fichiers.has("index")).toBe(true);
  });

  // Risque reporté par la tâche 4 : `lireIndexFichier()` confond « aucun
  // index fichier » et « index présent mais illisible ». La migration se
  // déclenche sur les deux cas indifféremment (elle ne peut pas les
  // distinguer depuis `fichierGameRepository`). Si un fichier de slot existe
  // déjà, il peut s'agir d'un index corrompu à côté de fichiers sains et
  // plus récents que le miroir — écraser serait exactement le dégât que ce
  // chantier corrige.
  describe("garde-fou index corrompu vs absent", () => {
    it("refuse de migrer si un fichier de slot existe déjà, et ne le touche pas", async () => {
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 1 })),
      );
      const contenuFichierExistant = JSON.stringify(
        createMockGameState({ jourActuel: 99 }),
      );
      fichiers.set("slot_1", contenuFichierExistant);

      const { migrerVersFichiers } = await import("./migrationFichiers");
      await expect(migrerVersFichiers()).resolves.toBe(false);

      expect(fichiers.get("slot_1")).toBe(contenuFichierExistant);
      expect(fichiers.has("index")).toBe(false);
      // Le miroir n'est pas non plus touché.
      expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
    });

    it("refuse de migrer même si seul un AUTRE slot a déjà un fichier", async () => {
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 1 })),
      );
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 2 })),
      );
      fichiers.set("slot_2", JSON.stringify(createMockGameState({ jourActuel: 42 })));

      const { migrerVersFichiers } = await import("./migrationFichiers");
      await expect(migrerVersFichiers()).resolves.toBe(false);

      expect(fichiers.has("slot_1")).toBe(false);
      expect(fichiers.has("index")).toBe(false);
    });
  });
});
