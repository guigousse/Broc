// @vitest-environment jsdom
/**
 * Régression ciblée sur `accepterChapitrePrincipal` (Task 9) : l'action qui
 * fait passer un chapitre de la trame de « prêt » (pastille du grand-père)
 * à « mission active », déclenchée en fin du dialogue de délivrance. Suit le
 * patron des tests d'actions existants du contexte (cf.
 * GameContext.utiliserActive.test.tsx) — vrai `GameProvider`, aucun mock de
 * la logique testée.
 *
 * Couvre aussi la dette de la Task 8 (validée par le contrôleur) :
 * l'intégration bout-en-bout accepterChapitrePrincipal → livrerMission qui
 * injecte la lettre d'invitation d'un chapitre à `invitationTier` (ex.
 * trame_ch4 → invitation_tier2), désormais atteignable via l'API publique
 * du contexte.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { getTemplate } from "@/data/objetTemplates";
import type { Objet } from "@/types/game";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io) déclenché
// par l'effet d'ancrage temporel du provider. Résout en "pas de temps de
// confiance" — le provider retombe sur Date.now() (dégradation gracieuse).
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

/** Monte le provider, attend l'hydratation initiale (localStorage vide → state
 *  null), puis démarre une nouvelle partie et clôt le tutoriel guidé (état
 *  requis par `accepterChapitre`/`chapitrePret` — trame accessible seulement
 *  une fois `tutorielEtape === "termine"`). Retourne le résultat du hook. */
async function setupTutorielTermine() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  act(() => {
    result.current.terminerTutoriel();
  });
  expect(result.current.state!.tutorielEtape).toBe("termine");
  return result;
}

/** Construit un Objet jouet à partir d'un template réel (categorie/rarete
 *  cohérentes), pour poser une cible de mission en inventaire. */
function objetDuTemplate(templateId: string): Objet {
  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error(`Template introuvable : ${templateId}`);
  return {
    id: `test-${templateId}`,
    templateId: tpl.templateId,
    nom: tpl.nom,
    categorie: tpl.categorie,
    etat: "Bon",
    prixReferenceReel: tpl.prixRefBase,
    rarete: tpl.rarete,
  };
}

describe("GameContext.accepterChapitrePrincipal", () => {
  it("crée la mission active du chapitre", async () => {
    const result = await setupTutorielTermine();

    act(() => {
      result.current.accepterChapitrePrincipal("trame_ch1");
    });

    expect(result.current.state!.missions).toContainEqual(
      expect.objectContaining({ courrierId: "trame_ch1", statut: "active" }),
    );
    expect(
      result.current.state!.courriers.some((c) => c.id === "trame_ch1"),
    ).toBe(true);
  });

  it("idempotent : un second appel sur un chapitre déjà présent est un no-op", async () => {
    const result = await setupTutorielTermine();

    act(() => {
      result.current.accepterChapitrePrincipal("trame_ch1");
    });
    const missionsApres1erAppel = result.current.state!.missions;

    act(() => {
      result.current.accepterChapitrePrincipal("trame_ch1");
    });

    expect(result.current.state!.missions).toBe(missionsApres1erAppel);
    expect(
      result.current.state!.missions.filter((m) => m.courrierId === "trame_ch1"),
    ).toHaveLength(1);
  });

  it("chapitre narratif (sans objectif, ex. trame_ch10) : mission livrée immédiatement", async () => {
    const result = await setupTutorielTermine();

    act(() => {
      result.current.accepterChapitrePrincipal("trame_ch10");
    });

    expect(result.current.state!.missions).toContainEqual(
      expect.objectContaining({ courrierId: "trame_ch10", statut: "livree" }),
    );
  });

  it("livraison d'un chapitre à invitationTier (trame_ch4) injecte la lettre d'invitation tier 2", async () => {
    const result = await setupTutorielTermine();

    // La trame avance un chapitre à la fois (chapitrePret), mais
    // `accepterChapitrePrincipal` — comme `accepterChapitre` sous-jacent —
    // n'impose pas que le précédent soit livré : seule la présence du
    // courrier bloque un second appel. On accepte donc ch1→ch4 en séquence
    // via l'action, pour amener ch4 à l'état « mission active ».
    act(() => {
      result.current.accepterChapitrePrincipal("trame_ch1");
      result.current.accepterChapitrePrincipal("trame_ch2");
      result.current.accepterChapitrePrincipal("trame_ch3");
      result.current.accepterChapitrePrincipal("trame_ch4");
    });

    expect(result.current.state!.missions).toContainEqual(
      expect.objectContaining({ courrierId: "trame_ch4", statut: "active" }),
    );
    expect(
      result.current.state!.courriers.some((c) => c.id === "invitation_tier2"),
    ).toBe(false);

    // Pose la cible (pichet en faïence émaillée) en inventaire puis livre.
    act(() => {
      result.current.ajouterObjet(objetDuTemplate("ma.pichet_faience_emaillee"));
    });

    let livraison: { ok: boolean; raison?: string } | undefined;
    act(() => {
      livraison = result.current.livrerMission("trame_ch4");
    });

    expect(livraison?.ok).toBe(true);
    expect(
      result.current.state!.missions.find((m) => m.courrierId === "trame_ch4"),
    ).toEqual(expect.objectContaining({ statut: "livree" }));
    expect(
      result.current.state!.courriers.some((c) => c.id === "invitation_tier2"),
    ).toBe(true);
  });
});
