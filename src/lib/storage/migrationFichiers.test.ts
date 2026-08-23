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
    await expect(migrerVersFichiers()).resolves.not.toBeNull();
    expect(fichiers.get("slot_1")).toBe(window.localStorage.getItem(cleSlot(1)));
    expect(fichiers.has("index")).toBe(true);
  });

  it("est un no-op total quand une écriture échoue", async () => {
    window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
    const { ecrireSave } = await import("./pontNatif");
    vi.mocked(ecrireSave).mockRejectedValueOnce({ genre: "disque_plein", message: "" });
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBeNull();
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
    await expect(migrerVersFichiers()).resolves.toBeNull();
    expect(fichiers.has("index")).toBe(false);
  });

  // Revue de tâche 6 (constat) : la seule écriture de la fonction qui n'était
  // vérifiée par AUCUNE relecture était l'index lui-même. Chemin atteignable :
  // un joueur sans AUCUNE save miroir — `aCopier` est vide, donc l'écriture de
  // l'index est la SEULE écriture de toute la fonction. Si `ecrireSave`
  // résout mais la relecture immédiate ne la retrouve pas, l'ancienne version
  // rendait quand même `true` : `fichierGameRepository.load()` rappelait alors
  // `this.load()`, qui retrouvait `absent` et migrait à nouveau, indéfiniment
  // — le jeu ne s'affichait jamais. La relecture de vérification ci-dessous
  // referme ce chemin ; la structure sans récursion de `load()` (voir
  // fichierGameRepository.ts) le referme une seconde fois, structurellement.
  it("annule si la relecture de l'index ne correspond pas, même sans aucune save à copier", async () => {
    const { lireSave } = await import("./pontNatif");
    // Aucun slot occupé : le seul appel à lireSave de toute la fonction est
    // la relecture de vérification de l'index qui vient d'être écrit.
    vi.mocked(lireSave).mockResolvedValueOnce(null);
    const { migrerVersFichiers } = await import("./migrationFichiers");
    await expect(migrerVersFichiers()).resolves.toBeNull();
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
    await expect(migrerVersFichiers()).resolves.not.toBeNull();
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
    // Revue de tâche 6 (constat) : asserter `revisions[1] === 0` ici ne
    // prouvait rien, puisque `revisions` est INITIALISÉ à `{1:0,2:0,3:0}` —
    // le test restait vert même sans la ligne `revisions[n] = revisionDe(n)`.
    // On sème donc une révision miroir NON NULLE (7) avant de migrer, exactement
    // la forme que `toucherDerniereSession` écrit (slots.ts:344-348), pour que
    // seule la ligne R8-iii puisse produire la valeur attendue.
    it("inscrit la révision réelle du miroir pour un slot déjà présent (Ruling R8-iii), pas 0 par défaut", async () => {
      window.localStorage.setItem(
        CLE_INDEX,
        JSON.stringify({
          actif: 1,
          slots: { 1: { nom: null, derniereSession: 1, revision: 7 }, 2: null, 3: null },
        }),
      );
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 1 })), // le miroir : plus ancien
      );
      const contenuFichierExistant = JSON.stringify(
        createMockGameState({ jourActuel: 99 }), // le fichier : plus récent (cas 3b)
      );
      fichiers.set("slot_1", contenuFichierExistant);

      const { migrerVersFichiers } = await import("./migrationFichiers");
      const resultat = await migrerVersFichiers();
      expect(resultat).not.toBeNull();

      expect(fichiers.get("slot_1")).toBe(contenuFichierExistant);
      // Le miroir non plus n'est jamais touché par la migration.
      expect(window.localStorage.getItem(cleSlot(1))).toBe(
        JSON.stringify(createMockGameState({ jourActuel: 1 })),
      );

      const indexEcrit = JSON.parse(fichiers.get("index") ?? "null") as {
        revisions: Record<number, number>;
      } | null;
      expect(indexEcrit?.revisions[1]).toBe(7);

      // Et l'arbitrage du load() suivant confirme que c'est bien le fichier
      // (plus frais) qui est servi, pas le miroir périmé.
      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(99);
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
      await expect(migrerVersFichiers()).resolves.not.toBeNull();

      expect(fichiers.get("slot_1")).toBe(window.localStorage.getItem(cleSlot(1)));
      expect(fichiers.get("slot_2")).toBe(contenuFichierExistantSlot2); // inchangé
      expect(fichiers.has("index")).toBe(true);
    });
  });
});
