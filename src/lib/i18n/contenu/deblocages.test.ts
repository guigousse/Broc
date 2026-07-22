import { describe, expect, it } from "vitest";
import { DEBLOCAGES_PAR_NIVEAU } from "@/data/deblocagesNiveau";
import { DEBLOCAGES_EN, DEBLOCAGES_DESC_EN } from "./en/deblocages";
import { DEBLOCAGES_ES, DEBLOCAGES_DESC_ES } from "./es/deblocages";
import { DEBLOCAGES_EL, DEBLOCAGES_DESC_EL } from "./el/deblocages";
import { descriptionDeblocage } from "./index";

describe("déblocages — descriptions et parité i18n", () => {
  it("chaque déblocage a une description FR non vide", () => {
    for (const dep of DEBLOCAGES_PAR_NIVEAU) {
      expect(dep.description, dep.titre).toBeTruthy();
    }
  });
  it("chaque titre FR a sa description EN, ES et EL", () => {
    for (const dep of DEBLOCAGES_PAR_NIVEAU) {
      expect(DEBLOCAGES_DESC_EN[dep.titre], `EN: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_DESC_ES[dep.titre], `ES: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_DESC_EL[dep.titre], `EL: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_EN[dep.titre], `EN titre: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_ES[dep.titre], `ES titre: ${dep.titre}`).toBeTruthy();
      expect(DEBLOCAGES_EL[dep.titre], `EL titre: ${dep.titre}`).toBeTruthy();
    }
  });
  it("descriptionDeblocage résout l'overlay et retombe sur le FR", () => {
    const dep = DEBLOCAGES_PAR_NIVEAU[0];
    expect(descriptionDeblocage(dep, "fr")).toBe(dep.description);
    expect(descriptionDeblocage(dep, "en")).toBe(DEBLOCAGES_DESC_EN[dep.titre]);
  });
});
