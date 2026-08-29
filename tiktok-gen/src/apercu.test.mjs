import { describe, expect, it } from "vitest";
import { construireCfg, messageIncomplet } from "./apercu.js";

const catalogue = [{ id: "a", nom: "A", prix: 5 }, { id: "b", nom: "B", prix: 9 }];

describe("construireCfg", () => {
  it("roulette : 2 objets et une cible obligatoires", () => {
    expect(construireCfg({ type: "pause", objets: ["a"], cible: "a" }, catalogue)).toBeNull();
    expect(construireCfg({ type: "pause", objets: ["a", "b"], cible: null }, catalogue)).toBeNull();
    expect(construireCfg({ type: "pause", objets: ["a", "b"], cible: "b" }, catalogue).cfg.indexCible).toBe(1);
  });
  it("devine : 1 objet suffit, la cible est ignorée, les durées passent", () => {
    const d = construireCfg({ type: "devine", objets: ["a"], cible: null, dureeCompte: 4, dureeRevele: 1.5 }, catalogue);
    expect(d.cible).toBeNull();
    expect(d.cfg).toMatchObject({ type: "devine", nbObjets: 1, dureeCompte: 4, dureeRevele: 1.5 });
    expect(construireCfg({ type: "devine", objets: [] }, catalogue)).toBeNull();
  });
  it("message d'invite selon le type", () => {
    expect(messageIncomplet("devine")).toMatch(/1 objet/);
    expect(messageIncomplet("pause")).toMatch(/2 objets/);
  });
});
