// @vitest-environment jsdom
/**
 * Instrumentation de la progression et de l'économie : record de jour,
 * montée de niveau du Brocanteur, déblocage de compétence, fin de session de
 * vente/chine, et achat d'amélioration (atelier/stockage/camion).
 *
 * Même piège que la tâche 6 (tuto) : ces actions se gardent déjà elles-mêmes
 * (idempotentes), et plusieurs émettent depuis un `setState` dont l'updater
 * peut rejouer en StrictMode — la transition réelle est donc décidée AVANT
 * le `setState`, sur `stateRef.current`, jamais dans l'updater.
 *
 * `acheterAuBazar` n'existe pas sur cette branche (Bazar livré sur
 * feat/jetons-bazar, non fusionnée) : son instrumentation est hors de portée
 * ici, `EVENEMENTS.bazarAchat` reste inerte en attendant la fusion.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { xpRequisPourNiveauBrocanteur } from "@/lib/xp";
import type { CompetenceId, Session } from "@/types/game";
import {
  EVENEMENTS,
  StubAnalyticsProvider,
  reinitialiserAnalyticsPourTest,
} from "@/lib/analytics/analytics";
import { definirLecteurContexte } from "@/lib/analytics/contexte";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io) déclenché
// par l'effet d'ancrage temporel du provider.
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

let stub: StubAnalyticsProvider;

beforeEach(() => {
  stub = new StubAnalyticsProvider();
  reinitialiserAnalyticsPourTest(stub);
  definirLecteurContexte(() => ({ jour: 1, niveau: 1 }));
});

afterEach(() => {
  reinitialiserAnalyticsPourTest();
  definirLecteurContexte(null);
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

/** Crédite exactement `points` points de compétence globaux (même helper que
 *  GameContext.debloquerCompetence.test.tsx). */
function crediterPoints(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGame>, unknown>>["result"],
  points: number,
) {
  const brocanteur = result.current.state!.brocanteur;
  const seuilCible = xpRequisPourNiveauBrocanteur(brocanteur.niveau + points);
  const gain = seuilCible - brocanteur.xp;
  act(() => {
    result.current.gagnerXPBrocanteur(gain);
  });
}

// Palier 1, thématique — coût 1 point, aucune autre condition (niveau
// Brocanteur requis 0). Réutilisé de GameContext.debloquerCompetence.test.tsx.
const PALIER_1: CompetenceId = "cat.Musique.reparer.1";

function sessionVenteExemple(): Session {
  return {
    id: "session-vente-1",
    type: "vente",
    jour: 1,
    timestamp: Date.now(),
    niveauCamion: 1,
    loyer: 5,
    ventes: [
      {
        templateId: "t1",
        nom: "Guitare",
        categorie: "Musique",
        etat: "Bon",
        prixReferenceReel: 10,
        prixVente: 15,
        prixAchat: 5,
      },
      {
        templateId: "t2",
        nom: "Roman",
        categorie: "Livres & Papeterie",
        etat: "Très bon",
        prixReferenceReel: 20,
        prixVente: 25,
        prixAchat: null,
      },
    ],
    invendus: 1,
    xpGagne: {},
  };
}

function sessionChinageExemple(): Session {
  return {
    id: "session-chinage-1",
    type: "chinage",
    jour: 1,
    timestamp: Date.now(),
    brocanteId: "brocante-1",
    brocanteNom: "Marché du dimanche",
    achats: [
      {
        templateId: "t3",
        nom: "Vase",
        categorie: "Maison",
        etat: "Bon",
        prixReferenceReel: 8,
        prixPaye: 6,
      },
    ],
    xpGagne: {},
  };
}

describe("instrumentation du jeu", () => {
  it("avancerJour émet jour_atteint avec le nouveau jour", async () => {
    const result = await setupNouvellePartie();
    expect(result.current.state!.jourActuel).toBe(1);
    act(() => {
      result.current.avancerJour(1);
    });
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.jourAtteint)).toEqual([
      { nom: "jour_atteint", params: expect.objectContaining({ jour: 2 }) },
    ]);
  });

  it("avancerJour(3) n'émet qu'UN jour_atteint, sur le jour d'arrivée", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.avancerJour(3);
    });
    const emis = stub.appels.filter((a) => a.nom === EVENEMENTS.jourAtteint);
    expect(emis).toHaveLength(1);
    expect(emis[0].params.jour).toBe(4);
  });

  it("une montée de niveau émet niveau_atteint une seule fois", async () => {
    const result = await setupNouvellePartie();
    // Depuis niveau 0 (emptyBrocanteur) : crédite assez d'XP pour franchir 2
    // niveaux d'un coup (0 → 2), l'effet ne doit émettre qu'une fois.
    const seuilCible = xpRequisPourNiveauBrocanteur(
      result.current.state!.brocanteur.niveau + 2,
    );
    const gain = seuilCible - result.current.state!.brocanteur.xp;
    act(() => {
      result.current.gagnerXPBrocanteur(gain);
    });
    await waitFor(() => expect(result.current.state!.brocanteur.niveau).toBe(2));
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.niveauAtteint)).toEqual([
      { nom: "niveau_atteint", params: expect.objectContaining({ niveau: 2 }) },
    ]);
  });

  it("un gain d'XP sans changement de niveau n'émet rien", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.gagnerXPBrocanteur(1);
    });
    expect(stub.appels.filter((a) => a.nom === EVENEMENTS.niveauAtteint)).toHaveLength(0);
  });

  it("debloquerCompetence n'émet QUE si le déblocage a réussi", async () => {
    const result = await setupNouvellePartie();
    // 1) tentative impossible : pool à 0.
    act(() => {
      result.current.debloquerCompetence(PALIER_1);
    });
    // 2) crédite 1 point, puis débloque pour de vrai.
    crediterPoints(result, 1);
    act(() => {
      result.current.debloquerCompetence(PALIER_1);
    });
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.competenceDebloquee),
    ).toHaveLength(1);
  });

  it("enregistrerSession émet session_vente_terminee avec objets, recette et marge", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.enregistrerSession(sessionVenteExemple());
    });
    const e = stub.appels.find((a) => a.nom === EVENEMENTS.sessionVenteTerminee);
    expect(e?.params).toMatchObject({
      objets_vendus: 2,
      recette: 40,
      marge: 35,
    });
  });

  it("enregistrerSession émet session_chine_terminee avec objets et dépense", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.enregistrerSession(sessionChinageExemple());
    });
    const e = stub.appels.find((a) => a.nom === EVENEMENTS.sessionChineTerminee);
    expect(e?.params).toMatchObject({
      objets_achetes: 1,
      depense: 6,
    });
  });

  it("les améliorations émettent amelioration_achetee avec leur cible", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.ajusterBudget(1000);
    });
    act(() => {
      result.current.ameliorerAtelier();
    });
    act(() => {
      result.current.ameliorerStockage();
    });
    act(() => {
      result.current.acheterCamion(2);
    });
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.ameliorationAchetee).map((a) => a.params.quoi),
    ).toEqual(["atelier", "stockage", "camion"]);
  });

  // Régression : un rappel no-op (fonds insuffisants, palier déjà maximal,
  // niveau déjà adjacent atteint…) ne doit pas gonfler les métriques d'un
  // achat qui n'a pas eu lieu.
  it("un ameliorerAtelier sans les fonds du palier suivant n'émet rien de plus", async () => {
    const result = await setupNouvellePartie();
    // L'atelier niveau 1 coûte 100 et le budget de départ est 150 : ce
    // premier appel réussit réellement et émet. Le niveau 2 coûte 200, il ne
    // reste que 50 : le second appel est refusé et ne doit rien émettre de
    // plus.
    act(() => {
      result.current.ameliorerAtelier();
    });
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.ameliorationAchetee),
    ).toHaveLength(1);
    act(() => {
      // Palier suivant (niveau 2) coûte 200, budget restant 50 : refus.
      result.current.ameliorerAtelier();
    });
    expect(
      stub.appels.filter((a) => a.nom === EVENEMENTS.ameliorationAchetee),
    ).toHaveLength(1);
  });
});
