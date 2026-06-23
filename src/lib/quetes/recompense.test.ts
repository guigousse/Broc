import { describe, expect, it } from "vitest";
import { calculerRecompense } from "./recompense";
import type { ObjetTemplate } from "@/data/objetTemplates";

function tpl(prix: number): ObjetTemplate {
  return { templateId: "x", nom: "X", categorie: "Maison", rarete: "commun", prixRefBase: prix } as ObjetTemplate;
}

describe("calculerRecompense", () => {
  it("applique la prime sur la valeur de marché", () => {
    const r = calculerRecompense([{ templateId: "x" }], new Map([["x", tpl(100)]]));
    // 100 × 1.45 = 145 → arrondi multiple de 5
    expect(r).toBe(145);
  });

  it("majore selon l'état min exigé", () => {
    const base = calculerRecompense([{ templateId: "x" }], new Map([["x", tpl(100)]]));
    const exigeant = calculerRecompense([{ templateId: "x", etatMin: "Pristin état" }], new Map([["x", tpl(100)]]));
    expect(exigeant).toBeGreaterThan(base);
  });

  it("bonus pour objets multiples", () => {
    const map = new Map([["x", tpl(100)]]);
    const un = calculerRecompense([{ templateId: "x" }], map);
    const deux = calculerRecompense([{ templateId: "x" }, { templateId: "x" }], map);
    expect(deux).toBeGreaterThan(un * 2 * 0.9); // ~ 2× + bonus
  });
});
