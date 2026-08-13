import { describe, it, test, expect } from "vitest";
import { genererLot } from "./periodiques";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { FAMILLE, type FormeQuete } from "./formes";
import { objetsAtteignables } from "./atteignables";
import type { Courrier } from "@/types/game";

function rngSeq(vals: number[]): () => number {
  let i = 0;
  return () => vals[i++ % vals.length];
}

/** Générateur pseudo-aléatoire déterministe, pour rejouer une graine. */
function rngGraine(graine: number): () => number {
  let s = graine >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Forme d'un courrier généré, déduite de son unique objectif. */
function formeDe(c: Courrier): FormeQuete {
  if (c.payload.type !== "mission") throw new Error("pas une mission");
  const o = c.payload.objectifs?.[0];
  switch (o?.type) {
    case "objetsRares": return "objetsRares";
    case "beneficeCumule": return "beneficeCumule";
    case "ventesCumulees": return "chiffreAffaires";
    case "profitVente": return "profitVente";
    case "ventesCategorie": return "ventesCategorie";
    default: return "objet";
  }
}

describe("genererLot", () => {
  it("quotidienne : missions de catégorie quotidienne, 1 cible chacune", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.1, 0.5, 0.9]));
    expect(lot.length).toBeGreaterThan(0);
    expect(lot.length).toBeLessThanOrEqual(3);
    for (const c of lot) {
      expect(c.payload.type).toBe("mission");
      if (c.payload.type === "mission") {
        if (c.payload.cibles.length === 0) continue; // quête chiffrée : pas de cible
        expect(c.payload.categorie).toBe("quotidienne");
        expect(c.payload.cibles).toHaveLength(1);
      }
      expect(c.id).toContain("2026-06-25");
    }
  });

  it("hebdomadaire : 2 à 3 cibles par commande", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "hebdomadaire", "2026-W26", rngSeq([0.1, 0.5, 0.9, 0.3]));
    for (const c of lot) {
      if (c.payload.type === "mission") {
        if (c.payload.cibles.length === 0) continue; // quête chiffrée : pas de cible
        expect(c.payload.cibles.length).toBeGreaterThanOrEqual(2);
        expect(c.payload.cibles.length).toBeLessThanOrEqual(3);
        expect(c.payload.categorie).toBe("hebdomadaire");
      }
    }
  });

  it("ids uniques dans le lot", () => {
    const state = createMockGameState();
    const lot = genererLot(state, "quotidienne", "2026-06-25", rngSeq([0.2, 0.7, 0.4]));
    const ids = lot.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("composition des lots", () => {
  test("quotidienne : deux quêtes d'objet et une de rares", () => {
    for (let g = 1; g <= 30; g++) {
      const lot = genererLot(createMockGameState(), "quotidienne", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe).sort();
      expect(formes).toEqual(["objet", "objet", "objetsRares"].sort());
    }
  });

  test("hebdomadaire : trois formes distinctes, dont au moins une de vente", () => {
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      expect(lot).toHaveLength(3);
      const formes = lot.map(formeDe);
      expect(new Set(formes).size).toBe(3);
      expect(formes.some((f) => FAMILLE[f] === "vente")).toBe(true);
    }
  });

  test("hebdomadaire : la composition varie d'une graine à l'autre", () => {
    const vues = new Set<string>();
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      vues.add(lot.map(formeDe).sort().join("|"));
    }
    expect(vues.size).toBeGreaterThan(3);
  });

  test("les identifiants de courrier restent uniques dans un lot", () => {
    const lot = genererLot(createMockGameState(), "hebdomadaire", "cle", rngGraine(7));
    expect(new Set(lot.map((c) => c.id)).size).toBe(lot.length);
  });

  test("la catégorie demandée est toujours accessible au joueur", () => {
    const state = createMockGameState();
    const accessibles = new Set(objetsAtteignables(state).map((t) => t.categorie));
    for (let g = 1; g <= 60; g++) {
      const lot = genererLot(state, "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        const o = c.payload.objectifs?.[0];
        if (o?.type === "ventesCategorie") expect(accessibles.has(o.categorie)).toBe(true);
      }
    }
  });

  test("les quêtes chiffrées portent un gabaritId et un texte sans marque", () => {
    for (let g = 1; g <= 30; g++) {
      const lot = genererLot(createMockGameState(), "hebdomadaire", `c${g}`, rngGraine(g));
      for (const c of lot) {
        if (c.payload.type !== "mission") continue;
        if (c.payload.cibles.length > 0) continue; // quête d'objet : autre voie
        expect(c.payload.gabaritId).toBeDefined();
        expect([c.payload.titre, ...c.payload.corps].join(" ")).not.toMatch(/\{[a-z]+\}/);
      }
    }
  });
});
