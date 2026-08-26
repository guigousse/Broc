// @vitest-environment jsdom
/**
 * Préférence joueur « vibrations ». Activée par défaut (le retour haptique
 * fait partie du jeu ; on ne demande pas au joueur de l'allumer), persistée
 * hors sauvegarde : c'est un réglage d'appareil, il ne voyage pas d'un slot
 * de partie à l'autre.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { vibrationsActives, setVibrationsActives } from "./prefs";

beforeEach(() => {
  window.localStorage.clear();
});

describe("préférence vibrations", () => {
  it("est active tant que le joueur n'a rien choisi", () => {
    expect(vibrationsActives()).toBe(true);
  });

  it("retient une coupure", () => {
    setVibrationsActives(false);
    expect(vibrationsActives()).toBe(false);
  });

  it("retient un rallumage", () => {
    setVibrationsActives(false);
    setVibrationsActives(true);
    expect(vibrationsActives()).toBe(true);
  });

  it("survit à un rechargement (la valeur est dans localStorage, pas en mémoire)", () => {
    setVibrationsActives(false);
    expect(window.localStorage.getItem("projet-broc:haptique:v1")).toContain(
      "false",
    );
  });
});
