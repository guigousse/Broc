// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCeremonieLivraison } from "./useCeremonieLivraison";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { estGele } from "@/lib/affichageGele";
import type { Courrier, GameState } from "@/types/game";

function courrier(id: string, categorie: "principale" | "quotidienne"): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "grand-pere",
      titre: "T", corps: ["c"], cibles: [], recompense: { argent: 60 },
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
    // Les DEUX compteurs réellement gelés par cette récompense, pas seulement
    // la caisse : `recompense.xp` est absent, donc `recompenseEffective`
    // applique l'XP de catégorie (> 0) et le gel XP part aussi. Ne vérifier
    // que `budget` laissait le dégel de l'XP hors du filet.
    expect(estGele().budget).toBe(true);
    expect(estGele().xp).toBe(true);
    vue.unmount();
    expect(estGele()).toEqual({ xp: false, budget: false, energie: false });
  });
});
