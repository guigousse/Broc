// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  degelerEnergieAffichage, gelerEnergieAffichage, useEnergieAffiche,
} from "./affichageGele";

afterEach(() => {
  degelerEnergieAffichage();
  cleanup();
});

describe("gel d'affichage — énergie", () => {
  it("sans gel : renvoie la valeur réelle", () => {
    const { result } = renderHook(() => useEnergieAffiche(4));
    expect(result.current).toBe(4);
  });

  it("gelé : renvoie l'instantané, puis la valeur réelle au dégel", () => {
    gelerEnergieAffichage(2);
    const { result, rerender } = renderHook(() => useEnergieAffiche(4));
    expect(result.current).toBe(2);
    degelerEnergieAffichage();
    rerender();
    expect(result.current).toBe(4);
  });
});
