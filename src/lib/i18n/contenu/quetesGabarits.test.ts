import { describe, expect, test } from "vitest";
import { QUETES_GABARITS_EN } from "@/lib/i18n/contenu/en/quetesGabarits";
import { QUETES_GABARITS_ES } from "@/lib/i18n/contenu/es/quetesGabarits";
import { QUETES_GABARITS_EL } from "@/lib/i18n/contenu/el/quetesGabarits";
import { titreCourrier, corpsCourrier } from "@/lib/i18n/contenu";

/** Marque obligatoire dans le CORPS de chaque famille de gabarits. */
const MARQUES_PAR_FAMILLE: Record<string, string> = {
  generique: "{objets}",
  "jeux-video": "{objets}",
  "set-designer": "{objets}",
  mode: "{objets}",
  art: "{objets}",
  rares: "{nombre}",
  benefice: "{montant}",
  chiffre: "{montant}",
  marge: "{montant}",
  categorie: "{categorie}",
};

describe.each([
  ["EN", QUETES_GABARITS_EN],
  ["ES", QUETES_GABARITS_ES],
  ["EL", QUETES_GABARITS_EL],
] as const)("gabarits périodiques %s", (_, ov) => {
  test("chaque famille a ≥1 variante indexée depuis #0, avec sa marque", () => {
    for (const [cle, marque] of Object.entries(MARQUES_PAR_FAMILLE)) {
      expect(ov[`${cle}#0`]).toBeDefined();
      const tous = Object.entries(ov).filter(([k]) => k.startsWith(`${cle}#`));
      expect(tous.length).toBeGreaterThan(0);
      for (const [, g] of tous) expect(g.corps.join(" ")).toContain(marque);
    }
  });

  test("aucune famille orpheline dans l'overlay", () => {
    for (const k of Object.keys(ov)) {
      const famille = k.slice(0, k.lastIndexOf("#"));
      expect(Object.keys(MARQUES_PAR_FAMILLE)).toContain(famille);
    }
  });
});

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

test("quête chiffrée régénérée dans la locale, sans marque résiduelle", () => {
  const payload = {
    type: "mission" as const,
    categorie: "hebdomadaire" as const,
    expediteurId: "mode",
    titre: "TITRE FR PERSISTÉ",
    corps: ["CORPS FR PERSISTÉ"],
    cibles: [],
    recompense: { argent: 210 },
    gabaritId: "categorie#0",
    gabaritParams: { nombre: 5, categorie: "Mode" as const },
  };
  const courrier = { id: "heb_test_1", payload };
  for (const loc of ["en", "es", "el"] as const) {
    const tout = [titreCourrier(courrier, loc), ...corpsCourrier(courrier, loc)].join(" ");
    expect(tout).not.toContain("PERSISTÉ");
    expect(tout).not.toMatch(/\{[a-z]+\}/);
    expect(tout).not.toContain("Mode"); // la catégorie doit sortir TRADUITE
  }
});
