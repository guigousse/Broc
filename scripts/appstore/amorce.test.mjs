import { describe, expect, it } from "vitest";
import { scriptAmorce } from "./amorce.mjs";

const SAVE = JSON.stringify({ version: 17, budget: 8420 });

describe("amorçage du localStorage", () => {
  it("écrit la save dans le slot 1 et sa copie de secours", () => {
    const js = scriptAmorce(SAVE, "fr");
    expect(js).toContain("projet-broc:slot:1:v1");
    expect(js).toContain("projet-broc:slot:1:v1:backup");
    expect(js).toContain("projet-broc:slots:v1");
  });

  it("fixe la langue demandée", () => {
    expect(scriptAmorce(SAVE, "el")).toContain('{"locale":"el"}');
    expect(scriptAmorce(SAVE, "es")).toContain('{"locale":"es"}');
  });

  it("désigne le slot 1 comme actif", () => {
    expect(scriptAmorce(SAVE, "fr")).toContain('"actif":1');
  });

  it("produit du JavaScript syntaxiquement valide", () => {
    expect(() => new Function(scriptAmorce(SAVE, "fr"))).not.toThrow();
  });

  it("échappe une save contenant des guillemets sans casser le script", () => {
    const piege = JSON.stringify({ nom: 'un "beau" vase', chemin: "a\\b" });
    expect(() => new Function(scriptAmorce(piege, "fr"))).not.toThrow();
  });

  it("refuse une langue hors des quatre", () => {
    expect(() => scriptAmorce(SAVE, "de")).toThrow(/de/);
  });
});
