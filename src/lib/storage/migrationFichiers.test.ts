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

  // Ruling R8 : `lireEtatIndexFichier()` (fichierGameRepository) distingue
  // maintenant « index absent » (seul cas qui déclenche cette fonction) de
  // « index présent mais illisible » (jamais migré, cf. fichierGameRepository
  // .test.ts). Reste, même une fois l'index absent confirmé, un flou que
  // cette fonction seule ne peut pas lever : un fichier de slot déjà présent
  // peut être une copie d'une migration précédente restée inachevée
  // (l'écraser avec le miroir courant serait sans risque) OU le fichier
  // qu'un `save()` a réussi à écrire avant que l'écriture de l'index fichier
  // n'échoue — auquel cas le miroir n'a JAMAIS reçu cette save (voir
  // fichierGameRepository.save(), étape 3 jamais atteinte) et le fichier est
  // en réalité PLUS FRAIS que le miroir. Ces deux cas sont indiscernables
  // d'ici : on ne touche donc JAMAIS à un fichier de slot déjà présent —
  // mais contrairement à un abandon global, on continue de copier les
  // autres slots et d'écrire l'index, pour que la migration finisse quand
  // même par aboutir.
  describe("un fichier de slot déjà présent n'est jamais écrasé (Ruling R8)", () => {
    it("laisse le fichier déjà présent intact, octet pour octet, et réussit quand même", async () => {
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 1 })), // le miroir : plus ancien
      );
      const contenuFichierExistant = JSON.stringify(
        createMockGameState({ jourActuel: 99 }), // le fichier : plus récent (cas 3b)
      );
      fichiers.set("slot_1", contenuFichierExistant);

      const { migrerVersFichiers } = await import("./migrationFichiers");
      await expect(migrerVersFichiers()).resolves.toBe(true);

      expect(fichiers.get("slot_1")).toBe(contenuFichierExistant);
      // Le miroir non plus n'est jamais touché par la migration.
      expect(window.localStorage.getItem(cleSlot(1))).toBe(
        JSON.stringify(createMockGameState({ jourActuel: 1 })),
      );

      // La révision inscrite pour ce slot est celle du miroir (Ruling
      // R8-iii), pas 0 par défaut ni une valeur inventée : c'est ce qui
      // permet à un fichier plus frais que le miroir de gagner l'arbitrage
      // de fichierGameRepository.load() plutôt que de perdre l'égalité.
      const indexEcrit = JSON.parse(fichiers.get("index") ?? "null") as {
        revisions: Record<number, number>;
      } | null;
      expect(indexEcrit?.revisions[1]).toBe(0); // revisionDe(1) ici : jamais touché par ce test
    });

    it("copie seulement le slot manquant quand un autre slot a déjà un fichier", async () => {
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 1 })),
      );
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 2 })),
      );
      const contenuFichierExistantSlot2 = JSON.stringify(
        createMockGameState({ jourActuel: 42 }),
      );
      fichiers.set("slot_2", contenuFichierExistantSlot2);

      const { migrerVersFichiers } = await import("./migrationFichiers");
      await expect(migrerVersFichiers()).resolves.toBe(true);

      expect(fichiers.get("slot_1")).toBe(window.localStorage.getItem(cleSlot(1)));
      expect(fichiers.get("slot_2")).toBe(contenuFichierExistantSlot2); // inchangé
      expect(fichiers.has("index")).toBe(true);
    });
  });
});
