import { describe, expect, test } from "vitest";
import { QUETES_GABARITS_EN } from "@/lib/i18n/contenu/en/quetesGabarits";
import { QUETES_GABARITS_ES } from "@/lib/i18n/contenu/es/quetesGabarits";
import { QUETES_GABARITS_EL } from "@/lib/i18n/contenu/el/quetesGabarits";
import { titreCourrier, corpsCourrier } from "@/lib/i18n/contenu";

const CLES = ["generique", "jeux-video", "set-designer", "mode", "art"];

describe.each([
  ["EN", QUETES_GABARITS_EN],
  ["ES", QUETES_GABARITS_ES],
  ["EL", QUETES_GABARITS_EL],
] as const)(
  "gabarits périodiques %s", (_, ov) => {
    test("chaque clé a ≥1 variante indexée depuis #0, placeholders {objets} présents", () => {
      for (const cle of CLES) {
        expect(ov[`${cle}#0`]).toBeDefined();
        const tous = Object.entries(ov).filter(([k]) => k.startsWith(`${cle}#`));
        for (const [, g] of tous) expect(g.corps.join(" ")).toContain("{objets}");
      }
    });
  },
);

test("courrier périodique avec gabaritId : régénéré dans la locale, cibles localisées", () => {
  const payload = {
    type: "mission" as const, categorie: "quotidienne" as const, expediteurId: "jeux-video",
    titre: "TITRE FR PERSISTÉ", corps: ["CORPS FR PERSISTÉ"],
    cibles: [{ templateId: "jx.playbox_pocket", etatMin: "Bon" as const }],
    recompense: { argent: 10 },
    gabaritId: "jeux-video#0", gabaritParams: { etatMin: "Bon" as const },
  };
  const courrier = { id: "quo_test_1", payload };
  expect(titreCourrier(courrier, "en")).toBe(QUETES_GABARITS_EN["jeux-video#0"].titre);
  const corps = corpsCourrier(courrier, "en").join(" ");
  expect(corps).toContain("PlayBox Pocket"); // nomTemplate EN
  expect(corps).not.toContain("CORPS FR PERSISTÉ");
  // fallback : sans gabaritId ni id connu → payload FR
  const legacy = { id: "quo_legacy_1", payload: { ...payload, gabaritId: undefined } };
  expect(corpsCourrier(legacy, "en")).toEqual(["CORPS FR PERSISTÉ"]);
});
