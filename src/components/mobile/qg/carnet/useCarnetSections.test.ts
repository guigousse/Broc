// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCarnetSections, CLE_STOCKAGE_CARNET, lire } from "./useCarnetSections";

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("useCarnetSections", () => {
  it("toutes les sections sont dépliées au premier usage", () => {
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
    expect(result.current.estRepliee("quotidiennes")).toBe(false);
    expect(result.current.estRepliee("hebdomadaires")).toBe(false);
  });

  it("basculer replie, rebasculer déplie", () => {
    const { result } = renderHook(() => useCarnetSections());
    act(() => result.current.basculer("histoire"));
    expect(result.current.estRepliee("histoire")).toBe(true);
    act(() => result.current.basculer("histoire"));
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("le repli survit à un remontage", () => {
    const premier = renderHook(() => useCarnetSections());
    act(() => premier.result.current.basculer("quotidiennes"));
    premier.unmount();
    const second = renderHook(() => useCarnetSections());
    expect(second.result.current.estRepliee("quotidiennes")).toBe(true);
    expect(second.result.current.estRepliee("histoire")).toBe(false);
  });

  it("un JSON corrompu est ignoré, tout est déplié", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, "{ceci n'est pas du json");
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("une valeur du mauvais type est ignorée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, '"une chaîne"');
    const { result } = renderHook(() => useCarnetSections());
    expect(result.current.estRepliee("histoire")).toBe(false);
  });

  it("une écriture qui échoue ne casse pas le basculement en mémoire", () => {
    // ⚠ `window.localStorage.setItem = ...` NE MARCHE PAS en jsdom : le proxy
    // `Storage` transforme l'affectation en une entrée stockée sous la clé
    // "setItem", la vraie méthode reste en place et le test ne lève jamais.
    // Le seul point d'accroche est le prototype.
    const espion = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      const { result } = renderHook(() => useCarnetSections());
      act(() => result.current.basculer("histoire"));
      expect(espion).toHaveBeenCalled(); // garde-fou : l'écriture a bien été tentée
      expect(result.current.estRepliee("histoire")).toBe(true); // l'UI suit quand même
    } finally {
      espion.mockRestore();
    }
  });

  it("window undefined (SSR) retourne tout déplié", () => {
    // Teste la fonction lire() en isolation avec window undefined
    // (ne peut pas tester le hook entier avec window undefined car React a besoin du DOM)
    vi.stubGlobal("window", undefined);
    try {
      const etat = lire();
      expect(etat).toEqual({});
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
