import { describe, expect, it, vi } from "vitest";
import type { GameState } from "@/types/game";
import { migrerEtat, migrerSauvegarde, SAVE_VERSION } from "./migrations";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState, createMockObjet } from "./__test-fixtures__/gameState";
import { emptyAffinites, emptyBrocanteur, xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import * as principalesModule from "@/lib/quetes/principales";

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

describe("migrerSauvegarde — filet de sécurité minimal (lifeboat brocanteur/affinites)", () => {
  // `appliquerMigrations` appelle `debloquerQuetesPrincipales` (import réel de
  // @/lib/quetes/principales) vers la fin de son traitement. On la fait
  // exploser une fois pour simuler un échec de migration inattendu SANS
  // passer par une exception levée pendant `remapTemplateIds` (qui tourne
  // hors du try : un getter piégé sur le save lui-même y exploserait avant
  // même d'atteindre le try/catch, ce qui ne teste pas le bon chemin).
  it("garantit brocanteur/affinites/competencesDebloquees même si la migration explose sur un save qui en est dépourvu", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const spy = vi
      .spyOn(principalesModule, "debloquerQuetesPrincipales")
      .mockImplementationOnce(() => {
        throw new Error("boom — échec simulé de migration");
      });

    const saveDepourvue = fabriqueSaveV7(); // v7 : pas de brocanteur/affinites
    const result = migrerSauvegarde(saveDepourvue);

    expect(result.brocanteur).toEqual(emptyBrocanteur());
    expect(result.affinites).toEqual(emptyAffinites());
    expect(Array.isArray(result.competencesDebloquees)).toBe(true);
    expect(errorSpy).toHaveBeenCalled();

    spy.mockRestore();
    errorSpy.mockRestore();
  });

  it("ne touche pas à un brocanteur/affinites déjà bien formés si la migration explose", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const spy = vi
      .spyOn(principalesModule, "debloquerQuetesPrincipales")
      .mockImplementationOnce(() => {
        throw new Error("boom — échec simulé de migration");
      });

    const saveComplete = createMockGameState({
      brocanteur: { xp: 42, niveau: 2, pointsDisponibles: 1 },
    });
    const result = migrerSauvegarde(saveComplete);

    expect(result.brocanteur).toEqual({ xp: 42, niveau: 2, pointsDisponibles: 1 });

    spy.mockRestore();
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
    // L'amorce de l'arc principal (chapitre 1) est injectée au chargement.
    expect(migrated.courriers.some((c) => c.id === "principale_ch1")).toBe(true);
    expect(
      migrated.missions.some(
        (m) => m.courrierId === "principale_ch1" && m.statut === "active",
      ),
    ).toBe(true);
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

  it("SAVE_VERSION incrémenté à 10", () => {
    expect(SAVE_VERSION).toBe(10);
  });

  it("pose des défauts énergie sur un vieux save sans ces champs", () => {
    const migré = migrerSauvegarde({ version: 4 } as unknown as GameState);
    expect(migré.energie).toBe(5);
    expect(typeof migré.energieDerniereMaj).toBe("number");
  });

  it("conserve les valeurs énergie d'un save déjà v5", () => {
    const base = migrerSauvegarde({ version: 4 } as unknown as GameState);
    const v5 = {
      ...base,
      energie: 2,
      energieDerniereMaj: 1234,
    } as GameState;
    const migré = migrerSauvegarde(v5);
    expect(migré.energie).toBe(2);
    expect(migré.energieDerniereMaj).toBe(1234);
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
    expect(out.version).toBe(SAVE_VERSION);
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

describe("migration enRestauration jour → temps réel", () => {
  it("convertit l'ancien jourFin en {debutMs:0, finMs:0} (prêt immédiatement)", () => {
    const ancienne = {
      version: 5,
      inventaireJoueur: [
        {
          id: "x",
          templateId: "t",
          categorie: "Livres & Papeterie",
          etat: "Bon",
          rarete: "commun",
          prixReferenceReel: 10,
          enRestauration: { etatCible: "Très bon", jourFin: 42 },
        },
      ],
    } as unknown as Parameters<typeof migrerSauvegarde>[0];

    const migre = migrerSauvegarde(ancienne);
    const o = migre.inventaireJoueur[0];
    expect(o.enRestauration).toEqual({
      etatCible: "Très bon",
      debutMs: 0,
      finMs: 0,
    });
  });

  it("préserve un enRestauration déjà au nouveau format {debutMs, finMs}", () => {
    const ancienne = {
      version: 5,
      inventaireJoueur: [
        {
          id: "y",
          templateId: "t2",
          categorie: "Livres & Papeterie",
          etat: "Bon",
          rarete: "commun",
          prixReferenceReel: 10,
          enRestauration: { etatCible: "Très bon", debutMs: 1000, finMs: 5000 },
        },
      ],
    } as unknown as Parameters<typeof migrerSauvegarde>[0];

    const migre = migrerSauvegarde(ancienne);
    const o = migre.inventaireJoueur[0];
    expect(o.enRestauration).toEqual({
      etatCible: "Très bon",
      debutMs: 1000,
      finMs: 5000,
    });
  });
});

describe("migration quêtes périodiques (v7)", () => {
  it("supprime les courriers/missions secondaires et ajoute quetesPeriodiques", () => {
    const ancienne = {
      version: 6,
      courriers: [
        { id: "p1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "principale", expediteurId: "grand-pere", titre: "t", corps: [], cibles: [], recompense: { argent: 0 } } },
        { id: "s1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "secondaire", expediteurId: "maman", titre: "t", corps: [], cibles: [], recompense: { argent: 0 } } },
      ],
      missions: [
        { courrierId: "p1", statut: "active" },
        { courrierId: "s1", statut: "active" },
      ],
    } as unknown as Parameters<typeof migrerSauvegarde>[0];

    const migre = migrerSauvegarde(ancienne);
    expect(migre.courriers.find((c) => c.id === "s1")).toBeUndefined();
    expect(migre.missions.find((m) => m.courrierId === "s1")).toBeUndefined();
    expect(migre.courriers.find((c) => c.id === "p1")).toBeDefined();
    expect(migre.quetesPeriodiques).toEqual({
      quotidien: { cle: "", courrierIds: [] },
      hebdo: { cle: "", courrierIds: [] },
    });
  });

  it("préserve un quetesPeriodiques déjà présent", () => {
    const dejaV7 = {
      version: 7,
      courriers: [],
      missions: [],
      quetesPeriodiques: { quotidien: { cle: "2026-06-25", courrierIds: ["quo_2026-06-25_0"] }, hebdo: { cle: "2026-W26", courrierIds: [] } },
    } as unknown as Parameters<typeof migrerSauvegarde>[0];
    const migre = migrerSauvegarde(dejaV7);
    expect(migre.quetesPeriodiques.quotidien.cle).toBe("2026-06-25");
  });
});

/**
 * Fabrique une save "v7" : un GameState complet auquel on retire `brocanteur`
 * et `affinites` (champs requis apparus en v8), pour simuler une vieille
 * sauvegarde chargée par une build antérieure au Niveau de Brocanteur.
 */
function fabriqueSaveV7(patch: Partial<GameState> = {}): GameState {
  const complet = createMockGameState(patch);
  const {
    brocanteur: _brocanteur,
    affinites: _affinites,
    niveauVu: _niveauVu,
    ...sansNiveau
  } = complet;
  return { ...sansNiveau, version: 7 } as unknown as GameState;
}

describe("migration v8 — Niveau de Brocanteur", () => {
  it("backfille brocanteur depuis la somme des XP d'arbres", () => {
    const save = fabriqueSaveV7();
    (save as unknown as Record<string, unknown>).competenceTrees = {
      general: { xp: 150, niveau: 1, pointsDisponibles: 0 },
      "cat.Musique": { xp: 350, niveau: 3, pointsDisponibles: 1 },
    };
    const migre = migrerSauvegarde(save);
    // 150 + 350 = 500 XP → courbe 17N²+83N : niveau 3 (seuil 402), pas 4 (604)
    // Refund v9 : pool = niveau + 2×chapitres livrés (0) − points dépensés (0) = 3
    expect(migre.brocanteur).toEqual({ xp: 500, niveau: 3, pointsDisponibles: 3 });
    expect(migre.version).toBe(SAVE_VERSION);
  });

  it("recalcule les affinités depuis l'historique", () => {
    const save = fabriqueSaveV7();
    (save as unknown as { historique: unknown[] }).historique = [
      {
        id: "s1", type: "chinage", jour: 1, timestamp: 1, brocanteId: "b",
        brocanteNom: "B", xpGagne: {},
        achats: [
          { templateId: "t1", nom: "Vinyle", categorie: "Musique", etat: "Bon", prixReferenceReel: 10, prixPaye: 5 },
          { templateId: "t2", nom: "Robe", categorie: "Mode", etat: "Bon", prixReferenceReel: 10, prixPaye: 5 },
        ],
      },
      {
        id: "s2", type: "vente", jour: 2, timestamp: 2, niveauCamion: 1, loyer: 0,
        invendus: 0, xpGagne: {},
        ventes: [
          { templateId: "t1", nom: "Vinyle", categorie: "Musique", etat: "Bon", prixReferenceReel: 10, prixVente: 20, prixAchat: 5 },
        ],
      },
    ];
    const migre = migrerSauvegarde(save);
    expect(migre.affinites["Musique"]).toBe(2); // 1 achat + 1 vente
    expect(migre.affinites["Mode"]).toBe(1);
    expect(migre.affinites["Maison"]).toBe(0);
  });

  it("idempotente : une save v8 rechargée ne change pas brocanteur/affinites", () => {
    const migre1 = migrerSauvegarde(fabriqueSaveV7());
    const migre2 = migrerSauvegarde(migre1);
    expect(migre2.brocanteur).toEqual(migre1.brocanteur);
    expect(migre2.affinites).toEqual(migre1.affinites);
  });
});

describe("migration v9 — refund du pool global", () => {
  it("pool = niveau + 2×chapitres livrés − points dépensés, clampé à 0", () => {
    const save = fabriqueSaveV7();
    // 1100 XP d'arbres → niveau Brocanteur 5 (seuil N5=840, N6=1110)
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    // 2 paliers achetés : reparer.1 (1 pt) + reparer.2 (2 pts) = 3 pts dépensés
    save.competencesDebloquees = ["cat.Musique.reparer.1", "cat.Musique.reparer.2"];
    const migre = migrerSauvegarde(save);
    expect(migre.version).toBe(SAVE_VERSION);
    expect(migre.brocanteur.niveau).toBe(5);
    expect(migre.brocanteur.pointsDisponibles).toBe(2); // 5 + 0 − 3
    expect(migre.competencesDebloquees).toEqual(["cat.Musique.reparer.1", "cat.Musique.reparer.2"]);
  });

  it("clamp à 0 si plus dépensé que gagné", () => {
    const save = fabriqueSaveV7();
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 100, niveau: 1, pointsDisponibles: 0 } }; // niveau global 1
    save.competencesDebloquees = ["cat.Musique.reparer.1", "cat.Musique.reparer.2"]; // 3 pts dépensés
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.pointsDisponibles).toBe(0);
  });

  it("idempotence : une save v9 garde son pool", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const pool = m1.brocanteur.pointsDisponibles;
    const m2 = migrerSauvegarde(m1);
    expect(m2.brocanteur.pointsDisponibles).toBe(pool);
  });

  it("bonus de 2 points par chapitre principal livré", () => {
    const save = fabriqueSaveV7({
      courriers: [
        {
          id: "c1",
          type: "mission",
          jourRecu: 1,
          lu: true,
          payload: {
            type: "mission",
            categorie: "principale",
            expediteurId: "maman",
            titre: "Chapitre 1",
            corps: [],
            cibles: [],
            recompense: { argent: 0 },
          },
        },
      ],
      missions: [{ courrierId: "c1", statut: "livree" }],
    });
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 100, niveau: 1, pointsDisponibles: 0 } }; // niveau global 1
    save.competencesDebloquees = [];
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.niveau).toBe(1);
    expect(migre.brocanteur.pointsDisponibles).toBe(3); // 1 + 2×1 − 0
  });
});

describe("migration v9 — durcissement du fallback XP", () => {
  it("v9 malformée (pointsDisponibles NaN) : l'XP valide est préservée", () => {
    const save = {
      ...migrerSauvegarde(fabriqueSaveV7()),
      brocanteur: { xp: 1100, niveau: 5, pointsDisponibles: NaN },
    };
    const m = migrerSauvegarde(save);
    expect(m.brocanteur.xp).toBe(1100);
    expect(m.brocanteur.niveau).toBe(5);
  });

  it("la migration ne mute pas son argument", () => {
    const save = fabriqueSaveV7();
    const copie = structuredClone(save);
    migrerSauvegarde(save);
    expect(save).toEqual(copie);
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
    expect(p.categorie).toBe("quotidienne");
    expect(p.cibles).toEqual([{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }]);
    expect((p as unknown as { cible?: unknown }).cible).toBeUndefined();
  });
});

describe("migrerSauvegarde — sanitation activesUtilisees", () => {
  it("ne conserve que les clés connues avec jour/usages valides", () => {
    const save = createMockGameState();
    (save as unknown as { activesUtilisees: unknown }).activesUtilisees = {
      flair: { jour: 2, usages: 1 },
      zombie: { jour: 2, usages: 1 },
      fouille: { jour: Number.NaN, usages: 1 },
    };
    const migre = migrerSauvegarde(save);
    expect(migre.activesUtilisees).toEqual({ flair: { jour: 2, usages: 1 } });
  });

  it("absent si aucune entrée valide (undefined, pas objet vide)", () => {
    const save = createMockGameState();
    (save as unknown as { activesUtilisees: unknown }).activesUtilisees = { zombie: { jour: 1, usages: 1 } };
    const migre = migrerSauvegarde(save);
    expect(migre.activesUtilisees).toBeUndefined();
  });

  it("absent si le champ n'est pas persisté", () => {
    const migre = migrerSauvegarde(createMockGameState());
    expect(migre.activesUtilisees).toBeUndefined();
  });

  it("floor usages non entier (3.7 → 3)", () => {
    const save = createMockGameState();
    (save as unknown as { activesUtilisees: unknown }).activesUtilisees = {
      fouille: { jour: 2, usages: 3.7 },
    };
    const migre = migrerSauvegarde(save);
    expect(migre.activesUtilisees).toEqual({ fouille: { jour: 2, usages: 3 } });
  });

  it("purge une entrée dont jour est une chaîne", () => {
    const save = createMockGameState();
    (save as unknown as { activesUtilisees: unknown }).activesUtilisees = {
      flair: { jour: "2", usages: 1 },
    };
    const migre = migrerSauvegarde(save);
    expect(migre.activesUtilisees).toBeUndefined();
  });

  it("purge une entrée dont jour est négatif", () => {
    const save = createMockGameState();
    (save as unknown as { activesUtilisees: unknown }).activesUtilisees = {
      flair: { jour: -1, usages: 1 },
    };
    const migre = migrerSauvegarde(save);
    expect(migre.activesUtilisees).toBeUndefined();
  });
});

/** Migre puis force la version obtenue à `v` (simule une save déjà passée par une version donnée). */
function migrerAvecVersion(s: GameState, v: number): GameState {
  const m = migrerSauvegarde(s);
  return { ...m, version: v };
}

describe("migration v10 — suppression de competenceTrees", () => {
  it("SAVE_VERSION vaut 10", () => {
    expect(SAVE_VERSION).toBe(10);
  });

  it("une save v9 avec competenceTrees le perd, brocanteur intact", () => {
    const v9 = migrerAvecVersion(fabriqueSaveV7(), 9);
    (v9 as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 500, niveau: 5, pointsDisponibles: 2 } };
    v9.brocanteur = { xp: 1100, niveau: 5, pointsDisponibles: 2 };
    const migre = migrerSauvegarde(v9);
    expect("competenceTrees" in migre).toBe(false);
    expect(migre.version).toBe(10);
    expect(migre.brocanteur).toEqual({ xp: 1100, niveau: 5, pointsDisponibles: 2 });
  });

  it("la conversion pré-v9 lit toujours les arbres des vieilles saves", () => {
    const save = fabriqueSaveV7();
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.niveau).toBe(5); // 1100 XP → N5 (17n²+83n : seuil N5=840, N6=1110)
  });
});

describe("niveauVu (célébration de level-up)", () => {
  it("backfillé au niveau courant pour toute save existante (pas de spam)", () => {
    const save = fabriqueSaveV7();
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    const migre = migrerSauvegarde(save);
    expect(migre.niveauVu).toBe(migre.brocanteur.niveau); // 5
  });
  it("clampé au niveau courant si corrompu au-dessus", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const migre = migrerSauvegarde({ ...m1, niveauVu: 99 });
    expect(migre.niveauVu).toBe(migre.brocanteur.niveau);
  });
  it("préservé s'il est valide et en retard (célébration en attente)", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const enAttente = { ...m1, brocanteur: { xp: 1100, niveau: 5, pointsDisponibles: 5 }, niveauVu: 3 };
    expect(migrerSauvegarde(enAttente).niveauVu).toBe(3);
  });
});

describe("migration — clamp énergie dynamique (niveau Brocanteur)", () => {
  it("clamp énergie : une save N14 avec 7 d'énergie ne perd rien, 9 est ramené à 7", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const n14 = { ...m1, brocanteur: { xp: xpRequisPourNiveauBrocanteur(14), niveau: 14, pointsDisponibles: 0 }, niveauVu: 14, energie: 7 };
    expect(migrerSauvegarde(n14).energie).toBe(7);
    expect(migrerSauvegarde({ ...n14, energie: 9 }).energie).toBe(7);
  });
});
