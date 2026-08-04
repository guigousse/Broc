import { describe, expect, it } from "vitest";
import { objetsAtteignables } from "./atteignables";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { samediBraderie } from "@/lib/evenements";

describe("objetsAtteignables", () => {
  it("au départ, ne renvoie que des objets tier 1 (brocante de départ débloquée)", () => {
    const state = createMockGameState();
    const objets = objetsAtteignables(state);
    expect(objets.length).toBeGreaterThan(0);
    // aucun unique / légendaire
    expect(objets.every((o) => !o.unique && o.rarete !== "legendaire")).toBe(true);
    // pas de templateId en double
    const ids = objets.map((o) => o.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("n'inclut jamais l'unique des bijoux de la reine", () => {
    const state = createMockGameState();
    const ids = objetsAtteignables(state).map((o) => o.templateId);
    expect(ids).not.toContain("uniq.mo.bijou_marie_antoinette");
  });

  it("ignore la braderie même le week-end de septembre où elle est débloquée : le pool tier 4 ne doit pas apparaître", () => {
    const samedi = samediBraderie(1924);
    const baseline = objetsAtteignables(createMockGameState({ jourActuel: 1 }))
      .map((o) => o.templateId)
      .sort();
    const pendantBraderie = objetsAtteignables(
      createMockGameState({ jourActuel: samedi }),
    )
      .map((o) => o.templateId)
      .sort();
    // Sans la garde, le pool générique de la braderie (tier 4 = pool complet)
    // apparaîtrait alors même qu'aucune autre brocante tier 2-4 n'est débloquée.
    expect(pendantBraderie).toEqual(baseline);
  });
});
