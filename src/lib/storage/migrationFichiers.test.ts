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

  // Ruling R11 — revue post-tâche 7 : c'est exactement le cas pour lequel le
  // double-buffer existait (kill du WebView en pleine écriture du slot
  // principal, la copie de secours écrite AVANT lui reste intacte). Avant ce
  // correctif, la migration considérait « occupé » = « clé présente », sans
  // jamais parser : la garbage du slot corrompu était copiée telle quelle
  // dans le fichier (la relecture stricte compare la garbage à elle-même —
  // elle ne prouve rien), puis la purge en fin de fonction effaçait la SEULE
  // copie valide qui existait. Le joueur, guérissable avant ce chantier,
  // perdait tout après.
  describe("guérison depuis la copie de secours (Ruling R11)", () => {
    it("un slot corrompu dont la copie de secours est valide est guéri, pas perdu", async () => {
      window.localStorage.setItem(cleSlot(1), "json-tronque{{{");
      const etatSecours = createMockGameState({ jourActuel: 21 });
      window.localStorage.setItem(cleBackup(1), JSON.stringify(etatSecours));

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();

      // La partie est retrouvée, pas perdue.
      expect(relu?.jourActuel).toBe(21);
      // Le fichier migré porte le contenu guéri (celui de la copie), jamais
      // la garbage du slot principal.
      expect(fichiers.get("slot_1")).toBe(JSON.stringify(etatSecours));
      // Le miroir principal est réparé, comme le ferait chargerSlot() à une
      // lecture directe.
      expect(JSON.parse(window.localStorage.getItem(cleSlot(1))!).jourActuel).toBe(
        21,
      );
      // La copie de secours n'est PAS purgée : la garde (Ruling R11) ne
      // retire `cleBackup(n)` que pour un slot dont le contenu PROPRE
      // parsait déjà — jamais pour un slot qu'on vient de réparer depuis
      // elle.
      expect(window.localStorage.getItem(cleBackup(1))).not.toBeNull();
    });

    it("un slot dont le principal ET la copie sont illisibles n'est migré ni détruit, sans bloquer les autres slots", async () => {
      window.localStorage.setItem(cleSlot(1), "corrompu{");
      window.localStorage.setItem(cleBackup(1), "corrompu-aussi{");
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 5 })),
      );

      const { migrerVersFichiers } = await import("./migrationFichiers");
      const resultat = await migrerVersFichiers();

      expect(resultat).not.toBeNull();
      // Rien n'a été copié pour le slot 1 : ni un fichier bidon...
      expect(fichiers.has("slot_1")).toBe(false);
      // ...ni les clés miroir détruites (aucun des deux n'était recouvrable,
      // mais rien ne les efface pour autant).
      expect(window.localStorage.getItem(cleSlot(1))).toBe("corrompu{");
      expect(window.localStorage.getItem(cleBackup(1))).toBe("corrompu-aussi{");
      // Le slot 2, sain, migre normalement malgré le slot 1 irrécupérable.
      expect(fichiers.get("slot_2")).toBe(window.localStorage.getItem(cleSlot(2)));
    });

    // Revue finale I4 : la guérison ne vaut QUE pour un principal présent et
    // illisible. Principal ABSENT veut dire « ce slot a été supprimé » (ou
    // n'a jamais existé) — et une copie de secours orpheline est atteignable,
    // puisque `effacerCleEtEntree` enveloppe ses deux `removeItem` dans un
    // SEUL try. Migrer depuis elle ressusciterait une partie supprimée, et la
    // réécrirait même dans `cleSlot(n)`. C'est exactement la règle que
    // `slots.ts` énonce à `cleBackup` et que `chargerSlot` applique déjà
    // (`if (!raw) return null;`).
    it("un slot au principal ABSENT n'est jamais ressuscité depuis une copie de secours orpheline", async () => {
      // Aucune `cleSlot(1)` : le joueur a supprimé cette partie. Seule la
      // copie de secours a survécu au `removeItem`.
      window.localStorage.setItem(
        cleBackup(1),
        JSON.stringify(createMockGameState({ jourActuel: 21 })),
      );

      const { migrerVersFichiers } = await import("./migrationFichiers");
      const resultat = await migrerVersFichiers();

      expect(resultat).not.toBeNull();
      expect(fichiers.has("slot_1")).toBe(false); // rien de migré
      expect(window.localStorage.getItem(cleSlot(1))).toBeNull(); // rien de ressuscité
      // La copie orpheline n'est ni lue ni détruite : ce n'est pas à la
      // migration de faire ce ménage.
      expect(window.localStorage.getItem(cleBackup(1))).not.toBeNull();
    });

    it("un slot déjà valide continue de purger sa copie de secours devenue orpheline (non-régression)", async () => {
      window.localStorage.setItem(cleSlot(1), JSON.stringify(createMockGameState()));
      window.localStorage.setItem(cleBackup(1), "vieille copie, jamais lue");

      const { migrerVersFichiers } = await import("./migrationFichiers");
      await migrerVersFichiers();

      expect(window.localStorage.getItem(cleBackup(1))).toBeNull();
      expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull();
    });
  });
});
