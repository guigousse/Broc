import { describe, expect, it } from "vitest";
import { QUETES_PRINCIPALES } from "./quetesPrincipales";
import { getTemplate } from "@/data/objetTemplates";

describe("QUETES_PRINCIPALES", () => {
  it("a des ordres uniques et croissants à partir de 1", () => {
    const ordres = QUETES_PRINCIPALES.map((q) => q.ordre);
    expect(ordres).toEqual([...ordres].sort((a, b) => a - b));
    expect(new Set(ordres).size).toBe(ordres.length);
    expect(ordres[0]).toBe(1);
  });

  it("le premier chapitre se débloque au départ", () => {
    expect(QUETES_PRINCIPALES[0].condition).toEqual({ type: "depart" });
  });

  it("le dernier chapitre cible l'unique des bijoux de la reine", () => {
    const last = QUETES_PRINCIPALES[QUETES_PRINCIPALES.length - 1];
    expect(last.payload.cibles.some((c) => c.templateId === "uniq.mo.bijou_marie_antoinette")).toBe(true);
  });

  it("toutes les cibles référencent des templates existants", () => {
    for (const q of QUETES_PRINCIPALES) {
      for (const c of q.payload.cibles) {
        expect(getTemplate(c.templateId), `${q.id}:${c.templateId}`).toBeDefined();
      }
    }
  });
});
