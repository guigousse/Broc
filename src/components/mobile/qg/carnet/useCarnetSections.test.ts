// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCarnetSections, CLE_STOCKAGE_CARNET } from "./useCarnetSections";

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
    const vraiSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    try {
      const { result } = renderHook(() => useCarnetSections());
      act(() => result.current.basculer("histoire"));
      expect(result.current.estRepliee("histoire")).toBe(true); // l'UI suit quand même
    } finally {
      window.localStorage.setItem = vraiSetItem;
    }
  });
});
