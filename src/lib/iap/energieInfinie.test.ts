// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EVENEMENT_ENERGIE_INFINIE,
  definirEnergieInfinie,
  energieInfinieActive,
} from "./energieInfinie";

afterEach(() => {
  window.localStorage.clear();
});

describe("energieInfinie — drapeau device hors save", () => {
  it("inactif par défaut (localStorage vierge)", () => {
    expect(energieInfinieActive()).toBe(false);
  });

  it("definirEnergieInfinie(true) pose le drapeau et le relit", () => {
    definirEnergieInfinie(true);
    expect(energieInfinieActive()).toBe(true);
  });

  it("definirEnergieInfinie(false) retombe (cas remboursement)", () => {
    definirEnergieInfinie(true);
    definirEnergieInfinie(false);
    expect(energieInfinieActive()).toBe(false);
  });

  it("notifie l'UI via l'événement broc:energie-infinie", () => {
    const espion = vi.fn();
    window.addEventListener(EVENEMENT_ENERGIE_INFINIE, espion);
    definirEnergieInfinie(true);
    window.removeEventListener(EVENEMENT_ENERGIE_INFINIE, espion);
    expect(espion).toHaveBeenCalledTimes(1);
  });

  it("survit à une valeur corrompue en storage", () => {
    window.localStorage.setItem("broc.energieInfinie", "{pas-du-json");
    expect(energieInfinieActive()).toBe(false);
  });
});
