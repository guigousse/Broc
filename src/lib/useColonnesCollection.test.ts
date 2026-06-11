// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { CLE_COLONNES, useColonnesCollection } from "./useColonnesCollection";

afterEach(() => window.localStorage.clear());

describe("useColonnesCollection", () => {
  it("défaut 3 sans valeur stockée", () => {
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });

  it("relit une valeur stockée valide", () => {
    window.localStorage.setItem(CLE_COLONNES, "1");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(1);
  });

  it("ignore une valeur stockée invalide (défaut 3)", () => {
    window.localStorage.setItem(CLE_COLONNES, '"abc"');
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });

  it("persiste le changement dans le localStorage", () => {
    const { result } = renderHook(() => useColonnesCollection());
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(window.localStorage.getItem(CLE_COLONNES)).toBe("2");
  });

  it("accepte 5 (nouvelle borne haute)", () => {
    window.localStorage.setItem(CLE_COLONNES, "5");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(5);
  });

  it("accepte 4", () => {
    window.localStorage.setItem(CLE_COLONNES, "4");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(4);
  });

  it("rejette un nombre hors plage (0, 6) → défaut 3", () => {
    window.localStorage.setItem(CLE_COLONNES, "6");
    const { result } = renderHook(() => useColonnesCollection());
    expect(result.current[0]).toBe(3);
  });
});
