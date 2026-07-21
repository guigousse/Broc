import { describe, expect, it, vi } from "vitest";
import type { GameState } from "@/types/game";
import { migrerEtat, migrerSauvegarde, SAVE_VERSION } from "./migrations";
import { COUT_TOTAL_COMPETENCES, pointsDepensesCompetences } from "@/data/competences";
import { ID_LETTRE_MAMAN_DEBUT } from "./courrier";
import { createMockGameState, createMockObjet } from "./__test-fixtures__/gameState";
import { emptyBrocanteur, xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import { chapitrePret, courrierDeChapitre } from "@/lib/quetes/principales";
import { chapitreParId } from "@/data/quetesPrincipales";
import * as courrierModule from "@/lib/courrier";

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

  it("conserve niveauAtelier=0 (nouvelle économie des slots)", () => {
    const state = createMockGameState({ niveauAtelier: 0 });
    expect(migrerSauvegarde(state).niveauAtelier).toBe(0);
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

describe("migrerSauvegarde — filet de sécurité minimal (lifeboat brocanteur)", () => {
  // `appliquerMigrations` appelle `injecterLettreMamanSiAbsente` (import réel
  // de @/lib/courrier) vers le début de son traitement (tutoriel terminé). On
  // la fait exploser une fois pour simuler un échec de migration inattendu
  // SANS passer par une exception levée pendant `remapTemplateIds` (qui
  // tourne hors du try : un getter piégé sur le save lui-même y exploserait
  // avant même d'atteindre le try/catch, ce qui ne teste pas le bon chemin).
  it("garantit brocanteur/competencesDebloquees même si la migration explose sur un save qui en est dépourvu", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const spy = vi
      .spyOn(courrierModule, "injecterLettreMamanSiAbsente")
      .mockImplementationOnce(() => {
        throw new Error("boom — échec simulé de migration");
      });

    const saveDepourvue = fabriqueSaveV7(); // v7 : pas de brocanteur
    const result = migrerSauvegarde(saveDepourvue);

    expect(result.brocanteur).toEqual(emptyBrocanteur());
    expect(Array.isArray(result.competencesDebloquees)).toBe(true);
    expect(errorSpy).toHaveBeenCalled();

    spy.mockRestore();
    errorSpy.mockRestore();
  });

  it("ne touche pas à un brocanteur déjà bien formé si la migration explose", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const spy = vi
      .spyOn(courrierModule, "injecterLettreMamanSiAbsente")
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
    // Depuis SP2 : plus d'amorce de chapitre au chargement — la trame est
    // délivrée en dialogue ; `chapitrePret` désigne bien le chapitre 1 comme dû.
    expect(migrated.courriers.some((c) => c.id === "trame_ch1")).toBe(false);
    expect(chapitrePret(migrated)?.id).toBe("trame_ch1");
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

  it("SAVE_VERSION incrémenté à 15", () => {
    expect(SAVE_VERSION).toBe(15);
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
 * (champ requis apparu en v8), pour simuler une vieille sauvegarde chargée
 * par une build antérieure au Niveau de Brocanteur.
 */
function fabriqueSaveV7(patch: Partial<GameState> = {}): GameState {
  const complet = createMockGameState(patch);
  const {
    brocanteur: _brocanteur,
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
    // 150 + 350 = 500 XP → courbe 0,5N²+99,5N : niveau 4 (seuil 406), pas 5 (510)
    // Refund v9 : pool = niveau + 2×chapitres livrés (0) − points dépensés (0) = 4
    expect(migre.brocanteur).toEqual({ xp: 500, niveau: 4, pointsDisponibles: 4 });
    expect(migre.version).toBe(SAVE_VERSION);
  });

  it("idempotente : une save v8 rechargée ne change pas brocanteur", () => {
    const migre1 = migrerSauvegarde(fabriqueSaveV7());
    const migre2 = migrerSauvegarde(migre1);
    expect(migre2.brocanteur).toEqual(migre1.brocanteur);
  });
});

describe("migration v9 — refund du pool global", () => {
  it("pool = niveau + 2×chapitres livrés − points dépensés, clampé à 0", () => {
    const save = fabriqueSaveV7();
    // 1100 XP d'arbres → niveau Brocanteur 10 (seuil N10=1045, N11=1150,5)
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    // 2 paliers achetés : reparer.1 (1 pt) + reparer.2 (1 pt, refonte v15 —
    // chaque palier coûte 1 pt) = 2 pts dépensés
    save.competencesDebloquees = ["cat.Musique.reparer.1", "cat.Musique.reparer.2"];
    const migre = migrerSauvegarde(save);
    expect(migre.version).toBe(SAVE_VERSION);
    expect(migre.brocanteur.niveau).toBe(10);
    expect(migre.brocanteur.pointsDisponibles).toBe(8); // 10 + 0 − 2
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
      brocanteur: { xp: 1100, niveau: 10, pointsDisponibles: NaN },
    };
    const m = migrerSauvegarde(save);
    expect(m.brocanteur.xp).toBe(1100);
    expect(m.brocanteur.niveau).toBe(10);
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
  it("une save v9 avec competenceTrees le perd, brocanteur intact", () => {
    const v9 = migrerAvecVersion(fabriqueSaveV7(), 9);
    (v9 as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 500, niveau: 5, pointsDisponibles: 2 } };
    v9.brocanteur = { xp: 1100, niveau: 5, pointsDisponibles: 2 };
    const migre = migrerSauvegarde(v9);
    expect("competenceTrees" in migre).toBe(false);
    expect(migre.version).toBe(SAVE_VERSION);
    expect(migre.brocanteur).toEqual({ xp: 1100, niveau: 5, pointsDisponibles: 2 });
  });

  it("la conversion pré-v9 lit toujours les arbres des vieilles saves", () => {
    const save = fabriqueSaveV7();
    (save as unknown as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.niveau).toBe(10); // 1100 XP → N10 (0,5n²+99,5n : seuil N10=1045)
  });
});

describe("migration v11 — suppression du compteur de transactions par catégorie (décision 2026-07-06 : paliers gatés par points + niveau seulement)", () => {
  it("SAVE_VERSION vaut 15", () => {
    expect(SAVE_VERSION).toBe(15);
  });

  it("une save v10 avec le champ legacy le perd, brocanteur intact", () => {
    const v10 = migrerAvecVersion(fabriqueSaveV7(), 10);
    (v10 as unknown as Record<string, unknown>).affinites = { Musique: 12, Mode: 3 };
    v10.brocanteur = { xp: 1100, niveau: 5, pointsDisponibles: 2 };
    const migre = migrerSauvegarde(v10);
    expect("affinites" in migre).toBe(false);
    expect(migre.version).toBe(SAVE_VERSION);
    expect(migre.brocanteur).toEqual({ xp: 1100, niveau: 5, pointsDisponibles: 2 });
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

describe("migration — clamp énergie (max fixe à 5)", () => {
  it("une save ex-N14 avec 7 d'énergie est ramenée à 5", () => {
    const state = createMockGameState({ energie: 7 });
    state.brocanteur.niveau = 14;
    expect(migrerSauvegarde(state).energie).toBe(5);
  });
});

describe("migration tutoriel (v12)", () => {
  it("backfill à 'termine' pour une save sans champ (et injecte Maman comme avant)", () => {
    const loaded = {
      ...createMockGameState({ courriers: [], declencheursDeclenches: [] }),
      tutorielEtape: undefined,
    } as unknown as GameState;
    const migre = migrerSauvegarde(loaded);
    expect(migre.tutorielEtape).toBe("termine");
    expect(migre.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(true);
  });

  it("préserve une étape en cours et n'injecte NI Maman NI le chapitre 1", () => {
    const loaded = createMockGameState({
      tutorielEtape: "premier-achat",
      courriers: [],
      declencheursDeclenches: [],
      missions: [],
    });
    const migre = migrerSauvegarde(loaded);
    expect(migre.tutorielEtape).toBe("premier-achat");
    expect(migre.courriers.some((c) => c.id === ID_LETTRE_MAMAN_DEBUT)).toBe(false);
    expect(migre.courriers.some((c) => c.id === "trame_ch1")).toBe(false);
  });

  it("normalise une étape inconnue à 'termine'", () => {
    const loaded = {
      ...createMockGameState(),
      tutorielEtape: "etape-fantome",
    } as unknown as GameState;
    expect(migrerSauvegarde(loaded).tutorielEtape).toBe("termine");
  });
});

/** Fabrique une save "v12" (schéma courant avant la trame v13). */
function saveV12(patch: Partial<GameState> = {}): GameState {
  return { ...createMockGameState(patch), version: 12 };
}

const migrate = migrerSauvegarde;
const br = emptyBrocanteur();

describe("migration v13 — mapping ancien arc/niveau vers la trame (jamais re-verrouiller un tier)", () => {
  it("SAVE_VERSION incrémenté à 15", () => {
    expect(SAVE_VERSION).toBe(15);
  });

  it("v14 : save antérieure (stock donné à la création) ⇒ colis considéré livré", () => {
    const migre = migrerSauvegarde({ ...saveV12(), version: 13 });
    expect(migre.colisTutorielLivres).toBe(5);
  });

  it("v14 : save déjà v14 ⇒ compteur de colis conservé", () => {
    const migre = migrerSauvegarde({
      ...saveV12(),
      version: 14,
      colisTutorielLivres: 2,
    });
    expect(migre.colisTutorielLivres).toBe(2);
  });

  it("v12→v13 : niveau ≥ T3 ⇒ trame_ch1..8 livrés (tier 3 reste ouvert)", () => {
    const save = saveV12({ brocanteur: { ...br, niveau: 12 } }); // ≥ NIVEAU_BROCANTES_T3 (10)
    const migre = migrate(save);
    for (let n = 1; n <= 8; n++) {
      expect(migre.missions.find((m) => m.courrierId === `trame_ch${n}`)?.statut).toBe("livree");
      expect(migre.courriers.some((c) => c.id === `trame_ch${n}`)).toBe(true);
    }
    expect(migre.missions.some((m) => m.courrierId === "trame_ch9")).toBe(false);
  });

  it("v12→v13 : ancien principale_ch5 livré ⇒ trame_ch1..11 livrés", () => {
    const save = saveV12({
      missions: [{ courrierId: "principale_ch5", statut: "livree", jourResolution: 9 }],
    });
    const migre = migrate(save);
    expect(migre.missions.find((m) => m.courrierId === "trame_ch11")?.statut).toBe("livree");
  });

  it("v12→v13 : partie fraîche (niveau 1, rien de livré) ⇒ aucun chapitre trame injecté", () => {
    const migre = migrate(saveV12({}));
    expect(migre.missions.some((m) => m.courrierId.startsWith("trame_ch"))).toBe(false);
  });

  it("v12→v13 : une ancienne mission principale_* ACTIVE est close (expiree), la livrée reste livrée", () => {
    const save = saveV12({
      missions: [
        { courrierId: "principale_ch2", statut: "active" },
        { courrierId: "principale_ch1", statut: "livree", jourResolution: 3 },
      ],
    });
    const migre = migrate(save);
    const ch2 = migre.missions.find((m) => m.courrierId === "principale_ch2");
    expect(ch2?.statut).toBe("expiree");
    expect(ch2?.jourResolution).toBe(save.jourActuel);
    expect(migre.missions.find((m) => m.courrierId === "principale_ch1")?.statut).toBe("livree");
  });
});

/** Fabrique une save "v13" (déjà migrée, schéma courant). */
function saveV13(patch: Partial<GameState> = {}): GameState {
  return { ...createMockGameState(patch), version: 13 };
}

describe("migration v13 — back-fill gaté (ne rejoue pas à chaque chargement d'une save déjà v13)", () => {
  it("save v13 avec trame_ch3 ACTIVE + niveau ≥ T3 ⇒ aucune injection de trame_ch4..8, ch3 intacte", () => {
    const ch3 = chapitreParId("trame_ch3")!;
    const courrierCh3 = courrierDeChapitre(ch3, 5);
    const save = saveV13({
      brocanteur: { ...br, niveau: 12 }, // ≥ NIVEAU_BROCANTES_T3 (10)
      courriers: [courrierCh3],
      missions: [{ courrierId: "trame_ch3", statut: "active", timestampAcceptation: 1000 }],
    });
    const migre = migrate(save);

    // La mission ch3 en cours n'est pas écrasée par un back-fill "livree".
    const missionCh3 = migre.missions.find((m) => m.courrierId === "trame_ch3");
    expect(missionCh3?.statut).toBe("active");
    // Aucun chapitre suivant n'a été force-livré alors que ch3 est toujours en cours.
    for (let n = 4; n <= 8; n++) {
      expect(migre.missions.some((m) => m.courrierId === `trame_ch${n}`)).toBe(false);
      expect(migre.courriers.some((c) => c.id === `trame_ch${n}`)).toBe(false);
    }
  });

  it("save v13 fraîche (aucune entrée trame, niveau 5) ⇒ aucune injection", () => {
    const save = saveV13({ brocanteur: { ...br, niveau: 5 } }); // ≥ NIVEAU_BROCANTES_T2 (mais save déjà v13)
    const migre = migrate(save);
    expect(migre.missions.some((m) => m.courrierId.startsWith("trame_ch"))).toBe(false);
    expect(migre.courriers.some((c) => c.id.startsWith("trame_ch"))).toBe(false);
  });

  it("idempotence : re-migrer le résultat d'une migration v12→v13 ne change rien (mêmes missions/courriers trame)", () => {
    const save = saveV12({ brocanteur: { ...br, niveau: 12 } }); // ≥ NIVEAU_BROCANTES_T3
    const migreUneFois = migrate(save);
    const migreDeuxFois = migrate(migreUneFois);

    const trameIds = (s: GameState) =>
      s.missions.filter((m) => m.courrierId.startsWith("trame_ch")).map((m) => m.courrierId).sort();
    expect(trameIds(migreDeuxFois)).toEqual(trameIds(migreUneFois));
    expect(migreDeuxFois.missions).toEqual(migreUneFois.missions);
    expect(
      migreDeuxFois.courriers.filter((c) => c.id.startsWith("trame_ch")),
    ).toEqual(migreUneFois.courriers.filter((c) => c.id.startsWith("trame_ch")));
  });
});

/** Fabrique une save "v14" (schéma courant avant la refonte des coûts v15). */
function saveV14(patch: Partial<GameState> = {}): GameState {
  return { ...createMockGameState(patch), version: 14 };
}

/** Fabrique une save "v15" (déjà migrée, schéma courant). */
function saveV15(patch: Partial<GameState> = {}): GameState {
  return { ...createMockGameState(patch), version: 15 };
}

describe("v15 — refonte des coûts de compétences (1 pt)", () => {
  it("SAVE_VERSION incrémenté à 15", () => {
    expect(SAVE_VERSION).toBe(15);
  });

  it("rembourse l'écart de l'ancien barème (P1 +0, P2 +1, P3 +2)", () => {
    const save = saveV14({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: 5 },
      competencesDebloquees: [
        "general.negociation.1", // ancien coût 1 → +0
        "general.negociation.2", // ancien coût 2 → +1
        "general.negociation.3", // ancien coût 3 → +2
      ],
    });
    const out = migrerSauvegarde(save);
    expect(out.brocanteur.pointsDisponibles).toBe(8); // 5 + 3
  });

  it("écrête pour que disponibles + dépensés ≤ COUT_TOTAL_COMPETENCES", () => {
    const save = saveV14({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: COUT_TOTAL_COMPETENCES - 1 },
      competencesDebloquees: ["general.negociation.1", "general.negociation.2"],
    });
    const out = migrerSauvegarde(save);
    // dépensés (nouveau barème) = 2 → disponibles plafonnés à 94
    expect(out.brocanteur.pointsDisponibles).toBe(COUT_TOTAL_COMPETENCES - 2);
  });

  it("idempotente : une save déjà v15 n'est pas re-remboursée", () => {
    const save = saveV15({
      brocanteur: { xp: 5000, niveau: 20, pointsDisponibles: 5 },
      competencesDebloquees: ["general.negociation.2"],
    });
    const out = migrerSauvegarde(save);
    expect(out.brocanteur.pointsDisponibles).toBe(5);
  });

  it("une save < v9 n'est PAS remboursée : son pointsDisponibles est déjà recalculé au nouveau barème", () => {
    // Save pré-v9 (`fabriqueSaveV7` : pas de `brocanteur`, version 7) : le
    // niveau est reconstitué depuis les arbres legacy `competenceTrees`, et
    // `pointsDisponibles` est intégralement RECALCULÉ au chargement à partir
    // de niveau + bonus chapitres − dépenses, avec `getCompetence().coutPoints`
    // qui vaut déjà 1 pour tous les paliers (refonte des coûts) — ce recalcul
    // reflète donc déjà le nouveau barème. Un remboursement par-dessus
    // sur-créditerait le joueur (cf. `appliquerRefonteCoutsV15`).
    const save = fabriqueSaveV7({
      competencesDebloquees: [
        "general.negociation.1",
        "general.negociation.2",
        "general.negociation.3",
      ],
    });
    (save as unknown as Record<string, unknown>).competenceTrees = {
      general: { xp: 1100, niveau: 11, pointsDisponibles: 4 },
    };
    const out = migrerSauvegarde(save);
    expect(out.brocanteur.niveau).toBe(10); // 1100 XP → N10 (seuil N10=1045)
    // niveau (10) + bonus chapitres livrés (0) − dépenses au nouveau barème (3 × 1 = 3) = 7.
    // Sans le garde <v9, le remboursement (0+1+2=3) porterait ce total à 10.
    expect(out.brocanteur.pointsDisponibles).toBe(7);
  });

  it("l'écrêtage s'applique MÊME sans remboursement (< v9, niveau et chapitres livrés élevés)", () => {
    // Régression : le recalcul legacy `< v9` (niveau + bonus chapitres −
    // dépenses) n'a qu'un plancher (Math.max(0, …)), aucun plafond. Une save
    // pré-v9 avec un niveau élevé et beaucoup de chapitres principaux livrés
    // peut donc produire un `pointsDisponibles` qui dépasse
    // `COUT_TOTAL_COMPETENCES` — l'écrêtage de `appliquerRefonteCoutsV15`
    // doit tourner pour TOUTE save (contrairement au remboursement, lui
    // gaté), sans quoi l'invariant global (disponibles + dépensés ≤
    // COUT_TOTAL_COMPETENCES) est violé.
    const chapitres = Array.from({ length: 12 }, (_, i) => i + 1);
    const save = fabriqueSaveV7({
      courriers: chapitres.map((n) => ({
        id: `chap${n}`,
        type: "mission",
        jourRecu: 1,
        lu: true,
        payload: {
          type: "mission",
          categorie: "principale",
          expediteurId: "maman",
          titre: `Chapitre ${n}`,
          corps: [],
          cibles: [],
          recompense: { argent: 0 },
        },
      })),
      missions: chapitres.map((n) => ({ courrierId: `chap${n}`, statut: "livree" })),
    });
    (save as unknown as Record<string, unknown>).competenceTrees = {
      general: { xp: xpRequisPourNiveauBrocanteur(85), niveau: 85, pointsDisponibles: 0 },
    };
    save.competencesDebloquees = [];
    const out = migrerSauvegarde(save);
    expect(out.brocanteur.niveau).toBe(85);
    // Sans écrêtage : 85 + 2×12 − 0 = 109, largement au-dessus de 96.
    expect(out.brocanteur.pointsDisponibles).toBe(COUT_TOTAL_COMPETENCES);
    expect(
      out.brocanteur.pointsDisponibles +
        pointsDepensesCompetences(out.competencesDebloquees),
    ).toBeLessThanOrEqual(COUT_TOTAL_COMPETENCES);
  });
});
