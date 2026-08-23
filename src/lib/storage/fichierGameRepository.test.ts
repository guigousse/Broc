// @vitest-environment jsdom
/**
 * Tâche 5 : le repository composite fichier + miroir. Fichier séparé et en
 * jsdom (Ruling R2) : un des tests force un échec d'écriture localStorage via
 * `vi.spyOn(Storage.prototype, "setItem")`, qui ne patcherait rien de réel
 * sous un `MemoryStorage` stubé sur `window` en environnement node.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { changerSlotActif, chargerIndex, cleSlot, toucherDerniereSession } from "./slots";

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

  // Ruling R6 : l'emplacement actif doit être résolu UNE SEULE FOIS par
  // appel (load/save/clear) et transmis explicitement — aucun chemin ne doit
  // laisser `localGameRepository` (ou `slots.ts`) re-résoudre le sien, sous
  // peine de désaccord entre deux résolutions indépendantes.
  describe("résolution unique de l'emplacement (Ruling R6)", () => {
    it("save() écrit sur l'actif du fichier quand le miroir n'a pas d'index (jamais dans le mauvais slot)", async () => {
      // beforeEach a vidé localStorage : aucun index miroir n'existe. Le
      // fichier dit que le slot 2 est actif — c'est lui qui doit être écrit,
      // jamais le slot 1 par défaut d'un `slotActif()` non résolu.
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 3, 3: 0 } }),
      );

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const r = await fichierGameRepository.save(createMockGameState());

      expect(r).toEqual({ ok: true });
      expect(fichiers.has("slot_2")).toBe(true);
      expect(fichiers.has("slot_1")).toBe(false);
    });

    it("le repli miroir de load() lit le slot résolu, pas le slot 1", async () => {
      // Miroir sans index (perdu), fichier dit slot 2 actif mais son
      // contenu est illisible : le repli doit lire le miroir au slot 2, pas
      // au slot 1 par défaut d'une résolution indépendante.
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 4, 3: 0 } }),
      );
      fichiers.set("slot_2", "{ceci n'est pas du json");
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 11 })),
      );
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 77 })),
      );

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(77);
    });

    it("clear() vide le slot résolu par le fichier même sans index miroir", async () => {
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 5, 3: 0 } }),
      );
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 5 })),
      );

      const { fichierGameRepository } = await import("./fichierGameRepository");
      await fichierGameRepository.clear();

      expect(window.localStorage.getItem(cleSlot(2))).toBeNull();
      expect(fichiers.get("slot_2")).toBe("");
    });
  });

  // Ruling R7 : la divergence intra-appel est corrigée (Ruling R6), mais
  // sans ré-amorçage, le PREMIER écrivain miroir (toucherDerniereSession /
  // viderSlot) fabrique lui-même un index par défaut `actif: 1` en
  // remplissant `slots[n]` — et l'appel SUIVANT, voyant alors un miroir qui
  // existe, y retombe et écrase le vrai slot une écriture plus tard.
  describe("ré-amorçage du miroir après éviction (Ruling R7)", () => {
    it("deux save() consécutifs restent sur le slot du fichier, sans miroir au départ", async () => {
      // beforeEach a vidé localStorage : aucun index miroir n'existe. Le
      // fichier dit que le slot 2 est actif.
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 3, 3: 0 } }),
      );
      const { fichierGameRepository } = await import("./fichierGameRepository");

      await fichierGameRepository.save(createMockGameState());
      await fichierGameRepository.save(createMockGameState());

      expect(fichiers.has("slot_1")).toBe(false);
      expect(fichiers.has("slot_2")).toBe(true);
      const index = JSON.parse(fichiers.get("index") ?? "null") as {
        actif: number;
      } | null;
      expect(index?.actif).toBe(2);
    });

    it("clear() sans miroir ne laisse pas un index miroir pointant sur le slot 1", async () => {
      fichiers.set(
        "index",
        JSON.stringify({ actif: 2, revisions: { 1: 0, 2: 5, 3: 0 } }),
      );
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 5 })),
      );
      const { fichierGameRepository } = await import("./fichierGameRepository");

      await fichierGameRepository.clear();

      expect(chargerIndex().actif).toBe(2);
    });
  });

  // Ruling R8(i) : `lireSave("index")` distingue « absent » (null) de
  // « présent » (une chaîne) — la migration (tâche 6) ne doit se déclencher
  // QUE sur l'absence. Un index présent mais illisible ne migre jamais : des
  // fichiers de slots pourraient déjà exister et être plus récents que le
  // miroir (cas 3b, voir migrationFichiers.ts), migrer par-dessus les
  // écraserait.
  describe("index fichier présent mais illisible (Ruling R8)", () => {
    it("ne migre jamais, ne touche à aucun fichier de slot, sert le miroir, et avertit", async () => {
      fichiers.set("index", "{ceci n'est pas du json");
      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 7 })),
      );
      const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();

      expect(relu?.jourActuel).toBe(7); // servi par le miroir
      expect(fichiers.has("slot_1")).toBe(false); // aucune migration tentée
      expect(fichiers.get("index")).toBe("{ceci n'est pas du json"); // inchangé
      expect(avertir).toHaveBeenCalled();
    });
  });

  // Ruling R8, cas 3b : un save() dont l'écriture du fichier réussit mais
  // dont l'écriture de l'index échoue laisse le miroir intact (l'étape 3 de
  // save() n'est jamais atteinte) — le fichier est alors plus FRAIS que le
  // miroir. La migration qui suit ne doit ni l'écraser ni le perdre : il
  // doit survivre et gagner l'arbitrage du load() suivant.
  describe("cas 3b : un fichier plus frais que le miroir survit à la migration", () => {
    it("le fichier écrit par un save() dont l'index a échoué gagne l'arbitrage après migration", async () => {
      const { ecrireSave } = await import("./pontNatif");
      const { fichierGameRepository } = await import("./fichierGameRepository");

      window.localStorage.setItem(
        cleSlot(1),
        JSON.stringify(createMockGameState({ jourActuel: 10 })), // le miroir, plus ancien
      );

      // save() : le slot s'écrit, puis l'index échoue — le miroir n'est donc
      // jamais mis à jour (fichierGameRepository.save, étape 3 jamais atteinte).
      vi.mocked(ecrireSave)
        .mockImplementationOnce(async (q: string, c: string) => {
          fichiers.set(q, c);
        })
        .mockRejectedValueOnce({ genre: "disque_plein", message: "" });

      const etatFrais = createMockGameState({ jourActuel: 123 });
      const resultat = await fichierGameRepository.save(etatFrais);
      expect(resultat).toEqual({ ok: false, genre: "disque_plein" });

      expect(fichiers.get("slot_1")).toBe(JSON.stringify(etatFrais));
      expect(fichiers.has("index")).toBe(false); // index fichier resté absent
      expect(window.localStorage.getItem(cleSlot(1))).toBe(
        JSON.stringify(createMockGameState({ jourActuel: 10 })),
      ); // le miroir n'a pas bougé

      // Prochain lancement : index toujours absent → migration.
      const relu = await fichierGameRepository.load();

      expect(relu?.jourActuel).toBe(123); // le fichier plus frais l'a emporté
      expect(fichiers.get("slot_1")).toBe(JSON.stringify(etatFrais)); // jamais écrasé
    });
  });

  // Revue de tâche 6 (constat) : `migrerVersFichiers()` ne vérifiait aucune
  // relecture de l'INDEX qu'elle venait d'écrire (seuls les slots l'étaient).
  // Chemin atteignable : un joueur sans AUCUNE save miroir — l'écriture de
  // l'index est alors la SEULE écriture de toute la migration. Si elle
  // résout sans être retrouvée à la relecture, l'ancien `load()` rappelait
  // `this.load()` sur la foi du `true` rendu, retombait sur `absent`, migrait
  // à nouveau, indéfiniment : le jeu ne s'affichait jamais. Le test ci-dessous
  // vérifie que `load()` se termine — pas seulement qu'il tombe juste.
  describe("protection contre la boucle de démarrage (revue de tâche 6)", () => {
    it("ne boucle jamais si l'écriture de l'index migré n'est pas retrouvée à la relecture", async () => {
      const { lireSave } = await import("./pontNatif");
      // Aucune save miroir : deux appels à lireSave("index") au total —
      // le constat initial (absent) puis la relecture de vérification après
      // l'écriture migrée. Les deux rendent `null` ici.
      vi.mocked(lireSave)
        .mockResolvedValueOnce(null) // lireEtatIndexFichier() initial : absent
        .mockResolvedValueOnce(null); // relecture de vérification post-écriture

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const relu = await fichierGameRepository.load();

      // La promesse se résout (pas de récursion infinie) et retombe sur le
      // miroir — ici vide, donc null.
      expect(relu).toBeNull();
    });

    // La relecture ci-dessus suffit à empêcher CE scénario précis de boucler
    // (la migration échoue proprement). Ce second test cible spécifiquement
    // la garde STRUCTURELLE : même quand la migration RÉUSSIT, `load()` ne
    // doit plus jamais relire l'index une seconde fois (ce que ferait un
    // `return this.load()` réintroduit) — il doit poursuivre directement
    // avec l'index que la migration vient d'écrire ET de vérifier.
    it("ne relit jamais l'index une seconde fois après une migration réussie (pas de récursion)", async () => {
      const { lireSave } = await import("./pontNatif");
      const { fichierGameRepository } = await import("./fichierGameRepository");

      const relu = await fichierGameRepository.load();
      expect(relu).toBeNull(); // aucune save nulle part (mirroir vide, migration à vide)

      // Exactement 3 appels : le constat initial (absent), la relecture de
      // vérification de l'index migré, puis la lecture du slot résolu par
      // la poursuite directe. Un `this.load()` réintroduit provoquerait un
      // second passage complet (au moins un 4e appel, pour un second constat
      // d'index).
      expect(vi.mocked(lireSave)).toHaveBeenCalledTimes(3);
    });
  });

  // Ruling R9 : `save()` lisait l'index via `lireIndexFichier()`, qui
  // confond « absent » et « illisible » — sur un index PRÉSENT MAIS
  // ILLISIBLE, les révisions des slots AUTRES que celui en cours de save()
  // retombaient à 0 par défaut, alors que leurs fichiers peuvent très bien
  // exister avec une révision réelle non nulle : ils perdraient ensuite
  // l'arbitrage de load() face à leur propre miroir, alors qu'ils étaient
  // peut-être plus frais. `save()` doit reconstruire ces révisions depuis
  // `revisionDe(k)` (le miroir), pas depuis 0, quand l'index est illisible.
  describe("index fichier illisible pendant save() (Ruling R9)", () => {
    it("reconstruit les révisions des autres slots depuis le miroir plutôt que de les remettre à 0", async () => {
      // Le miroir a une vraie histoire sur le slot 2 (révision 5, contenu
      // plus ancien que le fichier).
      window.localStorage.setItem(
        cleSlot(2),
        JSON.stringify(createMockGameState({ jourActuel: 20 })),
      );
      toucherDerniereSession(2, 5);
      // Le fichier du slot 2 existe déjà, plus frais.
      fichiers.set("slot_2", JSON.stringify(createMockGameState({ jourActuel: 55 })));
      // Index fichier illisible.
      fichiers.set("index", "{ceci n'est pas du json");

      const { fichierGameRepository } = await import("./fichierGameRepository");
      // On sauvegarde sur le slot 1 (actif par défaut du miroir).
      const r = await fichierGameRepository.save(createMockGameState({ jourActuel: 1 }));
      expect(r).toEqual({ ok: true });

      const indexEcrit = JSON.parse(fichiers.get("index") ?? "null") as {
        revisions: Record<number, number>;
      } | null;
      // Sans le correctif, revisions[2] vaudrait 0 (index reconstruit avec
      // {1:.,2:0,3:0}) : le fichier du slot 2 perdrait alors l'arbitrage
      // face à son propre miroir.
      expect(indexEcrit?.revisions[2]).toBe(5);

      // Confirmation par l'arbitrage : le fichier du slot 2 (plus frais que
      // son miroir) doit l'emporter au load() suivant.
      changerSlotActif(2);
      const relu = await fichierGameRepository.load();
      expect(relu?.jourActuel).toBe(55);
    });
  });

  // Ruling R10 : un index qui parse en JSON valide mais de la MAUVAISE forme
  // (pas d'objet, ou objet sans `revisions`) ne doit jamais faire planter
  // `chargerAvecIndex`/`save()` — `index.revisions[n]` sur `undefined`
  // lèverait hors de la promesse, et comme `load()` ne rattraperait rien,
  // le repli miroir ne serait JAMAIS atteint : le jeu ne s'afficherait pas.
  // Un tel contenu doit être traité comme "illisible", branche déjà sûre.
  describe("garde de forme sur l'index fichier (Ruling R10)", () => {
    it.each(["{}", "5", "[]", "null"])(
      "un index de forme invalide (%s) est traité comme illisible au load(), sans planter",
      async (contenu) => {
        fichiers.set("index", contenu);
        window.localStorage.setItem(
          cleSlot(1),
          JSON.stringify(createMockGameState({ jourActuel: 7 })),
        );
        const avertir = vi.spyOn(console, "warn").mockImplementation(() => {});

        const { fichierGameRepository } = await import("./fichierGameRepository");
        const relu = await fichierGameRepository.load();

        expect(relu?.jourActuel).toBe(7); // servi par le miroir, pas de rejet
        expect(avertir).toHaveBeenCalled();
      },
    );

    it("un index de forme invalide (\"{}\") ne fait pas non plus planter save()", async () => {
      fichiers.set("index", "{}");

      const { fichierGameRepository } = await import("./fichierGameRepository");
      const r = await fichierGameRepository.save(createMockGameState({ jourActuel: 3 }));

      expect(r).toEqual({ ok: true });
    });
  });
});
