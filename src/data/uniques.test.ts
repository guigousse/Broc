import { describe, expect, it } from "vitest";
import { UNIQUES } from "./uniques";

describe("UNIQUES", () => {
  it("expose l'unique des bijoux de la reine", () => {
    const u = UNIQUES.find((t) => t.templateId === "uniq.mo.bijou_marie_antoinette");
    expect(u).toBeDefined();
    expect(u!.nom).toBe("Les bijoux de la reine");
  });
});
