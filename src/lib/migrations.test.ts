import { describe, expect, it, vi } from "vitest";
import type { GameState } from "@/types/game";
import { migrerEtat, migrerSauvegarde, SAVE_VERSION } from "./migrations";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState, createMockObjet } from "./__test-fixtures__/gameState";

describe("migrerEtat", () => {
  it("conserve les états valides", () => {
    expect(migrerEtat("Mauvais")).toBe("Mauvais");
    expect(migrerEtat("Bon")).toBe("Bon");
    expect(migrerEtat("Très bon")).toBe("Très bon");
    expect(migrerEtat("Pristin état")).toBe("Pristin état");
  });

  it("remappe l'ancien 'Comme neuf' en 'Très bon'", () => {
    expect(migrerEtat("Comme neuf")).toBe("Très bon");
  });

  it("fallback sur 'Bon' pour toute autre valeur inconnue", () => {
    expect(migrerEtat("Cassé")).toBe("Bon");
    expect(migrerEtat("")).toBe("Bon");
    expect(migrerEtat("junk")).toBe("Bon");
  });
});

describe("migrerSauvegarde — état complet déjà valide", () => {
  it("préserve un GameState déjà à jour", () => {
    const fresh = createMockGameState({ budget: 555, jourActuel: 12 });
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.budget).toBe(555);
    expect(migrated.jourActuel).toBe(12);
  });

  it("injecte la lettre Maman si absente du save", () => {
    const fresh = createMockGameState();
    const migrated = migrerSauvegarde(fresh);
    expect(migrated.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(
      true,
    );
    expect(migrated.declencheursDeclenches).toContain(ID_LETTRE_MAMAN_DEBUT);
  });

  it("n'injecte pas la lettre Maman si elle a déjà été distribuée", () => {
    const fresh = createMockGameState({
      declencheursDeclenches: [ID_LETTRE_MAMAN_DEBUT],
    });
    const migrated = migrerSauvegarde(fresh);
    expect(
      migrated.courriers.filter((c) => c.id === ID_LETTRE_MAMAN_DEBUT).length,
    ).toBe(0);
  });
});

describe("migrerSauvegarde — anciens champs manquants", () => {
  it("remplit niveauAtelier=1 par défaut", () => {
    const incomplete = {
      ...createMockGameState(),
      niveauAtelier: undefined,
    } as unknown as GameState;
    expect(migrerSauvegarde(incomplete).niveauAtelier).toBe(1);
  });

  it("garde niveauAtelier=2 si déjà à 2", () => {
    const state = createMockGameState({ niveauAtelier: 2 });
    expect(migrerSauvegarde(state).niveauAtelier).toBe(2);
  });

  it("fallback niveauStockage selon total stocké si valeur manquante", () => {
    const incomplete = {
      ...createMockGameState(),
      niveauStockage: undefined,
      inventaireJoueur: [],
    } as unknown as GameState;
    // 0 objets → tier 1
    expect(migrerSauvegarde(incomplete).niveauStockage).toBe(1);
  });

  it("génère une météo de semaine si absente ou de mauvaise longueur", () => {
    const state = createMockGameState({ meteoSemaine: [] });
    const m = migrerSauvegarde(state);
    expect(m.meteoSemaine.length).toBe(7);
  });

  it("génère une célébrité si absente", () => {
    const state = createMockGameState({ celebriteActuelle: null });
    const m = migrerSauvegarde(state);
    expect(m.celebriteActuelle).not.toBeNull();
    expect(m.celebriteActuelle?.brocanteId).toBeTruthy();
  });

  it("clampe passagesSansChat dans [0, 3]", () => {
    const state = createMockGameState({ passagesSansChat: 99 });
    expect(migrerSauvegarde(state).passagesSansChat).toBe(3);
  });

  it("traite passagesSansChat négatif ou non-fini comme 0", () => {
    const a = createMockGameState({ passagesSansChat: -5 });
    expect(migrerSauvegarde(a).passagesSansChat).toBe(0);
  });
});

describe("migrerSauvegarde — résilience aux structures corrompues", () => {
  it("tolère un inventaire manquant", () => {
    const corrupt = {
      ...createMockGameState(),
      inventaireJoueur: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(Array.isArray(m.inventaireJoueur)).toBe(true);
  });

  it("tolère un historique manquant", () => {
    const corrupt = {
      ...createMockGameState(),
      historique: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(Array.isArray(m.historique)).toBe(true);
  });

  it("renvoie une collection cohérente même sans collection persistée", () => {
    const corrupt = {
      ...createMockGameState(),
      collection: undefined,
    } as unknown as GameState;
    const m = migrerSauvegarde(corrupt);
    expect(m.collection).toBeDefined();
    expect(typeof m.collection).toBe("object");
  });
});

describe("migrerSauvegarde — purge des compétences obsolètes", () => {
  it("reset les arbres si une compétence débloquée n'existe plus dans le catalogue", () => {
    const state = createMockGameState({
      competencesDebloquees: ["catalogue.inexistante.999"],
    });
    const m = migrerSauvegarde(state);
    expect(m.competencesDebloquees).toEqual([]);
  });
});

describe("migrerSauvegarde — versioning", () => {
  it("pose version = SAVE_VERSION sur l'état migré", () => {
    const fresh = createMockGameState();
    expect(migrerSauvegarde(fresh).version).toBe(SAVE_VERSION);
  });

  it("écrase une ancienne version par SAVE_VERSION", () => {
    const old = { ...createMockGameState(), version: 1 } as GameState;
    expect(migrerSauvegarde(old).version).toBe(SAVE_VERSION);
  });
});

describe("migrerSauvegarde — filet de sécurité en cas d'exception", () => {
  it("retourne l'état chargé tel quel si la migration lève une exception", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    // `achats` non-itérable → `.map` lève une TypeError pendant la migration.
    const broken = {
      ...createMockGameState(),
      historique: [{ type: "chinage", achats: null }],
    } as unknown as GameState;
    const result = migrerSauvegarde(broken);
    // Le catch renvoie l'état remappé (clone) ; ici aucun ancien id → contenu
    // identique à l'entrée.
    expect(result).toStrictEqual(broken);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("migrerSauvegarde — immutabilité", () => {
  it("ne mute pas le state d'entrée", () => {
    const fresh = createMockGameState({ budget: 100 });
    const snapshot = JSON.stringify(fresh);
    migrerSauvegarde(fresh);
    expect(JSON.stringify(fresh)).toBe(snapshot);
  });
});

describe("migrerSauvegarde — grand livre & missions", () => {
  it("ajoute grandLivre vide si historique est vide", () => {
    const state = createMockGameState({ historique: [], budget: 500 });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toEqual([]);
    // Trois missions de test sont injectées automatiquement au démarrage.
    expect(migrated.missions.map((m) => m.statut)).toEqual(["active", "active", "active"]);
  });

  it("reconstruit grandLivre depuis l'historique des sessions", () => {
    const state = createMockGameState({
      budget: 950,
      historique: [
        {
          id: "s1",
          type: "chinage",
          jour: 2,
          timestamp: 1000,
          brocanteId: "broc-1",
          brocanteNom: "Test",
          achats: [
            { templateId: "legacy", nom: "A", categorie: "Musique", etat: "Bon", prixReferenceReel: 0, prixPaye: 50 },
          ],
          xpGagne: {},
        },
      ],
    });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toHaveLength(1);
    expect(migrated.grandLivre[0]).toMatchObject({
      kind: "session_chinage",
      depense: 50,
      sessionId: "s1",
      soldeApres: 950,
    });
  });

  it("conserve grandLivre existant si déjà peuplé", () => {
    const existantEntry = {
      id: "x1",
      timestamp: 100,
      jour: 1,
      kind: "gazette" as const,
      designation: "Gazette",
      recette: 0,
      depense: 12,
      soldeApres: 988,
    };
    const state = createMockGameState({ grandLivre: [existantEntry] });
    const migrated = migrerSauvegarde(state);
    expect(migrated.grandLivre).toEqual([existantEntry]);
  });

  it("SAVE_VERSION incrémenté à 4", () => {
    expect(SAVE_VERSION).toBe(4);
  });

  it("v3 → v4 : backfille xpGagne et templateId sur sessions existantes", () => {
    const v3Save = {
      version: 3,
      historique: [
        {
          id: "s1",
          type: "chinage",
          jour: 2,
          timestamp: 1000,
          brocanteId: "b",
          brocanteNom: "B",
          achats: [{ nom: "Truc", categorie: "Outillage", etat: "Bon", prixReferenceReel: 50, prixPaye: 20 }],
        },
        {
          id: "s2",
          type: "vente",
          jour: 3,
          timestamp: 2000,
          niveauCamion: 1,
          loyer: 5,
          ventes: [{ nom: "Bidule", categorie: "Outillage", etat: "Bon", prixReferenceReel: 100, prixVente: 80, prixAchat: 30 }],
          invendus: 0,
        },
      ],
    };
    const out = migrerSauvegarde(v3Save as never);
    expect(out.version).toBe(4);
    expect(out.historique[0].xpGagne).toEqual({});
    expect(out.historique[1].xpGagne).toEqual({});
    // Pas de match nom→template (noms fictifs) → fallback slug "legacy.<nom>".
    const session0 = out.historique[0] as { achats: Array<{ templateId: string }> };
    expect(session0.achats[0].templateId).toBe("legacy.truc");
    const session1 = out.historique[1] as { ventes: Array<{ templateId: string }> };
    expect(session1.ventes[0].templateId).toBe("legacy.bidule");
  });

  it("résout le templateId d'inventaire par nom exact si templateId absent ou legacy.*", () => {
    const v3Save = {
      version: 3,
      inventaireJoueur: [
        // 1) Sans templateId, nom exact d'un template → matché.
        { id: "o1", nom: "Équerre métallique de menuisier", categorie: "Bricolage", etat: "Bon", prixReferenceReel: 14 },
        // 2) Avec un faux "legacy.querre_..." → matché par nom exact.
        { id: "o2", templateId: "legacy.querre_m_tallique_de_menuisier", nom: "Équerre métallique de menuisier", categorie: "Bricolage", etat: "Bon", prixReferenceReel: 14 },
        // 3) Nom inconnu → fallback slug.
        { id: "o3", nom: "Objet inconnu", categorie: "Bricolage", etat: "Bon", prixReferenceReel: 10 },
      ],
    };
    const out = migrerSauvegarde(v3Save as never);
    expect(out.inventaireJoueur[0].templateId).toBe("br.equerre_metallique");
    expect(out.inventaireJoueur[1].templateId).toBe("br.equerre_metallique");
    expect(out.inventaireJoueur[2].templateId).toBe("legacy.objet_inconnu");
  });
});

describe("migrerSauvegarde — remap des templateId historiques", () => {
  it("remappe les anciens ids de l'inventaire vers les nouveaux", () => {
    const save = createMockGameState({
      inventaireJoueur: [
        createMockObjet({
          templateId: "mus.vinyle_gainsbourg_melody",
          categorie: "Musique",
        }),
      ],
    });
    const ids = migrerSauvegarde(save).inventaireJoueur.map((o) => o.templateId);
    expect(ids).toContain("mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a");
    expect(ids).not.toContain("mus.vinyle_gainsbourg_melody");
  });

  it("réaffiche l'objet remappé comme possédé dans la collection", () => {
    const save = createMockGameState({
      inventaireJoueur: [
        createMockObjet({
          templateId: "jx.cartouche_mario",
          categorie: "Jeux & Loisirs",
        }),
      ],
    });
    const migrated = migrerSauvegarde(save);
    const slot = migrated.collection["Jeux & Loisirs"].find(
      (s) => s.templateId === "jx.cartouche_le_plombier_sauteur_8_bit",
    );
    expect(slot?.dejaPossede).toBe(true);
  });
});

describe("migrerSauvegarde — garde anti-régression de version", () => {
  it("conserve telle quelle une sauvegarde d'une version future (> SAVE_VERSION)", () => {
    const futur = createMockGameState({ budget: 999 });
    futur.version = SAVE_VERSION + 1;
    const r = migrerSauvegarde(futur);
    expect(r).toBe(futur); // non migré : même référence
    expect(r.version).toBe(SAVE_VERSION + 1);
  });

  it("migre normalement une sauvegarde de version courante ou antérieure", () => {
    const ancien = createMockGameState();
    ancien.version = SAVE_VERSION - 1;
    const r = migrerSauvegarde(ancien);
    expect(r.version).toBe(SAVE_VERSION);
  });
});

describe("migrerSauvegarde — missions cible→cibles", () => {
  it("convertit l'ancien champ cible en cibles[] et ajoute categorie", () => {
    const save = createMockGameState();
    (save as unknown as { courriers: unknown[] }).courriers = [
      {
        id: "m1",
        type: "mission",
        jourRecu: 1,
        lu: true,
        payload: {
          type: "mission",
          expediteurId: "maman",
          titre: "Vieux format",
          corps: [],
          cible: { templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" },
          recompense: { argent: 50 },
        },
      },
    ];
    const out = migrerSauvegarde(save);
    const p = out.courriers[0].payload;
    expect(p.type).toBe("mission");
    if (p.type !== "mission") return;
    expect(p.categorie).toBe("secondaire");
    expect(p.cibles).toEqual([{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }]);
    expect((p as unknown as { cible?: unknown }).cible).toBeUndefined();
  });
});
