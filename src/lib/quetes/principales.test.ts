import { describe, expect, it } from "vitest";
import { accepterChapitre, chapitrePret } from "./principales";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import {
  appliquerGainXPBrocanteur,
  POINTS_BONUS_CHAPITRE,
  XP_QUETE_PRINCIPALE,
} from "@/lib/xp";
import type { Courrier, GameState, MissionResolution } from "@/types/game";

/**
 * Courrier minimal pour un chapitre de la trame, utilisé UNIQUEMENT pour
 * peupler `state.courriers` dans les fixtures (chapitrePret/accepterChapitre
 * ne lisent que `id`/`payload.type` sur les courriers déjà présents).
 */
function courrierChapitreMinimal(id: string): Courrier {
  return {
    id,
    type: "mission",
    jourRecu: 1,
    lu: true,
    payload: {
      type: "mission",
      categorie: "principale",
      expediteurId: "grand-pere",
      titre: id,
      corps: [],
      cibles: [],
      recompense: { argent: 0 },
    },
  };
}

function missionLivree(courrierId: string, jourResolution = 2): MissionResolution {
  return { courrierId, statut: "livree", jourResolution };
}

/** Fixture : état où trame_ch1..chN sont livrés (précédents de `chapitreId`). */
function stateAvecChapitresLivres(nb: number, patch: Partial<GameState> = {}): GameState {
  const courriers = Array.from({ length: nb }, (_, i) =>
    courrierChapitreMinimal(`trame_ch${i + 1}`),
  );
  const missions = Array.from({ length: nb }, (_, i) =>
    missionLivree(`trame_ch${i + 1}`),
  );
  return createMockGameState({
    tutorielEtape: "termine",
    courriers,
    missions,
    ...patch,
  });
}

describe("chapitrePret", () => {
  it("null pendant le tutoriel", () => {
    const state = createMockGameState({ tutorielEtape: "accueil" });
    expect(chapitrePret(state)).toBeNull();
  });

  it("propose trame_ch1 au départ, puis rien tant que ch1 n'est pas livré", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(chapitrePret(state)?.id).toBe("trame_ch1");

    const avecCh1 = accepterChapitre(state, "trame_ch1", 1000);
    expect(chapitrePret(avecCh1)).toBeNull(); // ch1 actif, pas encore livré
  });

  it("propose le chapitre suivant quand le précédent est livré", () => {
    const state = createMockGameState({
      tutorielEtape: "termine",
      courriers: [courrierChapitreMinimal("trame_ch1")],
      missions: [missionLivree("trame_ch1")],
    });
    expect(chapitrePret(state)?.id).toBe("trame_ch2");
  });

  it("ne propose rien si déjà 12/12 chapitres livrés", () => {
    const state = stateAvecChapitresLivres(12);
    expect(chapitrePret(state)).toBeNull();
  });
});

describe("accepterChapitre", () => {
  it("crée courrier lu + mission active avec timestampAcceptation", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    const next = accepterChapitre(state, "trame_ch1", 1234);
    const courrier = next.courriers.find((c) => c.id === "trame_ch1");
    expect(courrier?.lu).toBe(true);
    expect(next.missions.find((m) => m.courrierId === "trame_ch1")).toMatchObject({
      statut: "active",
      timestampAcceptation: 1234,
    });
  });

  it("le courrier créé porte payload.objectifs (issus du chapitre)", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    const next = accepterChapitre(state, "trame_ch1", 1);
    const courrier = next.courriers.find((c) => c.id === "trame_ch1");
    expect(courrier?.payload.type).toBe("mission");
    if (courrier?.payload.type === "mission") {
      expect(courrier.payload.objectifs).toEqual([
        { type: "objet", templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" },
      ]);
    }
  });

  it("idempotent : ré-accepter un chapitre présent ne change rien (même référence)", () => {
    const state = accepterChapitre(
      createMockGameState({ tutorielEtape: "termine" }),
      "trame_ch1",
      1,
    );
    expect(accepterChapitre(state, "trame_ch1", 2)).toBe(state);
  });

  it("id de chapitre inconnu : ne change rien (même référence)", () => {
    const state = createMockGameState({ tutorielEtape: "termine" });
    expect(accepterChapitre(state, "trame_ch_inexistant", 1)).toBe(state);
  });

  it("chapitre à objectifs (ch1) : mission active, pas de récompense créditée", () => {
    const state = createMockGameState({ tutorielEtape: "termine", budget: 1000 });
    const next = accepterChapitre(state, "trame_ch1", 1);
    expect(next.budget).toBe(1000);
    expect(next.brocanteur).toEqual(state.brocanteur);
  });

  it("chapitre narratif (ch10) : livré immédiatement, récompense créditée + XP", () => {
    const state = stateAvecChapitresLivres(9, { budget: 1000 });
    const next = accepterChapitre(state, "trame_ch10", 99);

    const mission = next.missions.find((m) => m.courrierId === "trame_ch10");
    expect(mission).toMatchObject({
      statut: "livree",
      timestampAcceptation: 99,
      jourResolution: state.jourActuel,
    });
    expect(next.budget).toBe(state.budget + 150);
    expect(next.grandLivre.some((e) => e.kind === "mission_recompense" && e.courrierId === "trame_ch10")).toBe(true);
    const avecXPAttendu = appliquerGainXPBrocanteur(
      state.brocanteur,
      XP_QUETE_PRINCIPALE,
    );
    expect(next.brocanteur.xp).toBe(avecXPAttendu.xp);
    expect(next.brocanteur.pointsDisponibles).toBe(
      avecXPAttendu.pointsDisponibles + POINTS_BONUS_CHAPITRE,
    );
  });

  it("livraison narrative de trame_ch10 : injecte l'invitation tier 4", () => {
    const state = stateAvecChapitresLivres(9);
    const next = accepterChapitre(state, "trame_ch10", 99);
    expect(next.courriers.some((c) => c.id === "invitation_tier4")).toBe(true);
  });

  it("chapitre à objectifs (ch4, invitationTier 2) : mission active, pas d'invitation avant livraison", () => {
    const state = stateAvecChapitresLivres(3);
    const next = accepterChapitre(state, "trame_ch4", 1);
    expect(next.courriers.some((c) => c.id === "invitation_tier2")).toBe(false);
  });
});
