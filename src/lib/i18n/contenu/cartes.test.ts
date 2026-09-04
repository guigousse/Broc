import { describe, expect, test } from "vitest";
import { CARTES } from "@/data/cartes";
import { CARTES_EN } from "@/lib/i18n/contenu/en/cartes";
import { CARTES_ES } from "@/lib/i18n/contenu/es/cartes";
import { CARTES_EL } from "@/lib/i18n/contenu/el/cartes";
import { manquants, nomObjet, orphelins } from "@/lib/i18n/contenu";

const IDS = CARTES.map((c) => c.id);

describe.each([
  ["EN", CARTES_EN],
  ["ES", CARTES_ES],
  ["EL", CARTES_EL],
] as const)("overlay cartes %s", (_, overlay) => {
  test("complétude : chaque id de CARTES a son nom", () => {
    expect(manquants(IDS, overlay)).toEqual([]);
  });
  test("pas d'entrée orpheline", () => {
    expect(orphelins(IDS, overlay)).toEqual([]);
  });
  test("pas de nom vide", () => {
    expect(Object.entries(overlay).filter(([, v]) => !v.trim())).toEqual([]);
  });
});

describe("nomObjet d'une carte", () => {
  // La carte porte le nom de son monstre, pas celui de l'objet source
  // (2026-09-04) — en FR comme dans les autres langues.
  test("FR : le nom de la carte, pas celui de l'objet", () => {
    expect(nomObjet({ templateId: "carte.borne_arcade_mini", nom: "x" }, "fr")).toBe("Borgne d'arcade");
  });
  test("EN : le jeu de mots anglais, pas la traduction de l'objet", () => {
    expect(nomObjet({ templateId: "carte.borne_arcade_mini", nom: "x" }, "en")).toBe(CARTES_EN["carte.borne_arcade_mini"]);
  });
});
