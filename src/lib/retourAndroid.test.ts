import { describe, it, expect, beforeEach, vi } from "vitest";
import { empilerFermeture, fermerLePlusHaut, viderPile } from "./retourAndroid";

beforeEach(() => {
  viderPile();
});

describe("pile de fermeture", () => {
  it("faux quand rien n'est ouvert", () => {
    expect(fermerLePlusHaut()).toBe(false);
  });

  it("ferme le plus haut d'abord (dernier empilé, premier appelé)", () => {
    const ordre: string[] = [];
    empilerFermeture(() => ordre.push("bas"));
    empilerFermeture(() => ordre.push("haut"));

    expect(fermerLePlusHaut()).toBe(true);
    expect(ordre).toEqual(["haut"]);

    expect(fermerLePlusHaut()).toBe(true);
    expect(ordre).toEqual(["haut", "bas"]);

    expect(fermerLePlusHaut()).toBe(false);
  });

  it("le désenregistrement retire le fermoir sans toucher aux autres", () => {
    const bas = vi.fn();
    const haut = vi.fn();
    empilerFermeture(bas);
    const retirerHaut = empilerFermeture(haut);

    retirerHaut();

    expect(fermerLePlusHaut()).toBe(true);
    expect(haut).not.toHaveBeenCalled();
    expect(bas).toHaveBeenCalledOnce();
  });

  it("désenregistrer après fermeture ne casse rien (double retrait)", () => {
    const f = vi.fn();
    const retirer = empilerFermeture(f);
    expect(fermerLePlusHaut()).toBe(true);
    expect(() => retirer()).not.toThrow();
    expect(fermerLePlusHaut()).toBe(false);
  });
});
