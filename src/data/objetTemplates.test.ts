import { describe, it, expect } from "vitest";
import { ALL_TEMPLATES, tailleDe } from "@/data/objetTemplates";

describe("tailleDe", () => {
  it("toutes les catégories ont un défaut", () => {
    for (const t of ALL_TEMPLATES) {
      expect(tailleDe(t)).toMatch(/^(XS|S|M|L|XL)$/);
    }
  });
});
