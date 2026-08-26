// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  degelerEnergieAffichage, degelerJetonsAffichage, estGele,
  gelerEnergieAffichage, gelerJetonsAffichage, useEnergieAffiche, useJetonsAffiche,
} from "./affichageGele";

afterEach(() => {
  degelerEnergieAffichage();
  degelerJetonsAffichage();
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

/**
 * Le compteur de Bazarcoins gèle comme les trois autres, et pour la même
 * raison : pendant la cérémonie de livraison, il ne doit monter qu'au moment
 * où le jeton s'y pose. La monnaie, elle, est créditée tout de suite dans la
 * partie — rien n'est perdu si l'app meurt en pleine animation.
 */
describe("gel d'affichage — Bazarcoins", () => {
  it("sans gel : renvoie la valeur réelle", () => {
    const { result } = renderHook(() => useJetonsAffiche(7));
    expect(result.current).toBe(7);
  });

  it("gelé : renvoie l'instantané, puis la valeur réelle au dégel", () => {
    gelerJetonsAffichage(4);
    const { result, rerender } = renderHook(() => useJetonsAffiche(7));
    expect(result.current).toBe(4);
    degelerJetonsAffichage();
    rerender();
    expect(result.current).toBe(7);
  });

  it("zéro est un instantané comme un autre", () => {
    // Le cas courant : une quête donne les tout premiers jetons du joueur. Un
    // gel à 0 traité comme « rien de gelé » ferait apparaître le gain avant
    // que la pièce ne se pose.
    gelerJetonsAffichage(0);
    const { result } = renderHook(() => useJetonsAffiche(3));
    expect(result.current).toBe(0);
  });

  it("s'annonce dans le lecteur d'état", () => {
    expect(estGele().jetons).toBe(false);
    gelerJetonsAffichage(2);
    expect(estGele().jetons).toBe(true);
    degelerJetonsAffichage();
    expect(estGele().jetons).toBe(false);
  });
});
