// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCeremonieLivraison } from "./useCeremonieLivraison";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { estGele } from "@/lib/affichageGele";
import { audioManager } from "@/lib/audio/audioManager";
import { DECALAGE_VOL_MS, VOL_MS } from "@/lib/quetes/ceremonieLivraison";
import type { Courrier, GameState } from "@/types/game";

function courrier(
  id: string,
  categorie: "principale" | "quotidienne",
  recompense: { argent: number; jetons?: number } = { argent: 60 },
): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "grand-pere",
      titre: "T", corps: ["c"], cibles: [], recompense,
      objectifs: [{ type: "ventesCumulees", montant: 10 }],
    },
  };
}

function etat(c: Courrier): GameState {
  return createMockGameState({ courriers: [c], missions: [{ courrierId: c.id, statut: "active" }] });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useCeremonieLivraison", () => {
  it("une livraison refusée ne démarre aucune cérémonie", () => {
    const c = courrier("m1", "quotidienne");
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: false, raison: "x" }) }),
    );
    act(() => result.current.lancer("m1"));
    expect(result.current.ceremonieId).toBeNull();
  });

  it("une livraison acceptée arme la cérémonie puis la referme", () => {
    const c = courrier("m1", "quotidienne");
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => result.current.lancer("m1"));
    expect(result.current.ceremonieId).toBe("m1");
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.ceremonieId).toBeNull();
  });

  it("une seconde livraison est refusée pendant la première", () => {
    const c = courrier("m1", "quotidienne");
    const onLivrerMission = vi.fn(() => ({ ok: true }));
    const { result } = renderHook(() => useCeremonieLivraison({ state: etat(c), onLivrerMission }));
    act(() => result.current.lancer("m1"));
    act(() => result.current.lancer("m1"));
    expect(onLivrerMission).toHaveBeenCalledTimes(1);
  });

  it("onChapitreLivre est appelé pour une principale, à la toute fin", () => {
    const c = courrier("m1", "principale");
    const onChapitreLivre = vi.fn();
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }), onChapitreLivre }),
    );
    act(() => result.current.lancer("m1"));
    expect(onChapitreLivre).not.toHaveBeenCalled(); // pas pendant
    act(() => vi.advanceTimersByTime(10_000));
    expect(onChapitreLivre).toHaveBeenCalledWith("m1");
  });

  it("onChapitreLivre n'est PAS appelé pour une quotidienne", () => {
    const c = courrier("m1", "quotidienne");
    const onChapitreLivre = vi.fn();
    const { result } = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }), onChapitreLivre }),
    );
    act(() => result.current.lancer("m1"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onChapitreLivre).not.toHaveBeenCalled();
  });

  it("le démontage en pleine cérémonie dégèle les compteurs", () => {
    // La commande a une récompense argent > 0 : la caisse est gelée dès `lancer`.
    // Un démontage avant la fin de la frise ne doit pas la laisser figée pour
    // le reste de la partie (piège n°2 du hook) — vérifié via `estGele()`,
    // le lecteur sans effet de bord de `affichageGele`.
    const c = courrier("m1", "principale");
    const vue = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => vue.result.current.lancer("m1"));
    // La caisse est gelée (argent > 0). L'XP, elle, ne l'est PLUS : depuis le
    // 2026-08-18 les quêtes ne versent plus d'XP, donc `rEff.xp` vaut 0 et le
    // gel conditionnel ne se déclenche pas. Assertion conservée en NÉGATIF
    // plutôt que supprimée : geler un compteur dont aucun jeton ne volera le
    // laisserait figé pour toute la partie — c'est le piège n°2 du hook.
    expect(estGele().budget).toBe(true);
    expect(estGele().xp).toBe(false);
    vue.unmount();
    expect(estGele()).toEqual({ xp: false, budget: false, energie: false, jetons: false });
  });

  /**
   * LES BAZARCOINS (2026-08-26). Ils volent en dernier, et leur compteur est
   * figé comme les autres jusqu'à ce que la pièce s'y pose — sinon le gain
   * apparaîtrait dans la caisse avant d'avoir quitté le carnet.
   */
  it("les Bazarcoins gèlent leur compteur, et l'atterrissage le dégèle en tintant", () => {
    const tinte = vi
      .spyOn(audioManager, "playJetonBazar")
      .mockResolvedValue(undefined);
    const c = courrier("m1", "quotidienne", { argent: 0, jetons: 3 });
    const vue = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => vue.result.current.lancer("m1"));
    expect(estGele().jetons).toBe(true);
    // Seuls les Bazarcoins volent : leur atterrissage tombe à VOL_MS.
    expect(tinte).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(VOL_MS + 10);
    });
    expect(estGele().jetons).toBe(false);
    expect(tinte).toHaveBeenCalledTimes(1);
    vue.unmount();
    tinte.mockRestore();
  });

  it("une quête sans Bazarcoins ne gèle pas leur compteur ni ne tinte", () => {
    const tinte = vi
      .spyOn(audioManager, "playJetonBazar")
      .mockResolvedValue(undefined);
    const c = courrier("m1", "quotidienne", { argent: 60 });
    const vue = renderHook(() =>
      useCeremonieLivraison({ state: etat(c), onLivrerMission: () => ({ ok: true }) }),
    );
    act(() => vue.result.current.lancer("m1"));
    expect(estGele().jetons).toBe(false);
    act(() => {
      vi.advanceTimersByTime(DECALAGE_VOL_MS + VOL_MS + 500);
    });
    expect(tinte).not.toHaveBeenCalled();
    vue.unmount();
    tinte.mockRestore();
  });
});
