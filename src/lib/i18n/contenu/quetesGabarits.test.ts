import { describe, expect, test } from "vitest";
import { QUETES_GABARITS_EN } from "@/lib/i18n/contenu/en/quetesGabarits";
import { QUETES_GABARITS_ES } from "@/lib/i18n/contenu/es/quetesGabarits";
import { QUETES_GABARITS_EL } from "@/lib/i18n/contenu/el/quetesGabarits";
import { titreCourrier, corpsCourrier } from "@/lib/i18n/contenu";
import {
  nombreVariantesChiffrees,
  nombreVariantesCommanditaire,
} from "@/lib/quetes/textes";

/** Familles « formes chiffrées » (Task 6) — les autres sont « objet nommé ». */
const FAMILLES_CHIFFREES = ["rares", "benefice", "chiffre", "marge", "categorie"];

/** Marques obligatoires dans le CORPS de chaque famille de gabarits. */
const MARQUES_PAR_FAMILLE: Record<string, string[]> = {
  generique: ["{objets}"],
  "jeux-video": ["{objets}"],
  "set-designer": ["{objets}"],
  mode: ["{objets}"],
  art: ["{objets}"],
  rares: ["{nombre}"],
  benefice: ["{montant}"],
  chiffre: ["{montant}"],
  marge: ["{montant}"],
  categorie: ["{nombre}", "{categorie}"],
};

/**
 * Nombre de variantes attendu par famille, dérivé du FR canonique
 * (`src/lib/quetes/textes.ts`) plutôt que recopié en dur ici : si une 3ᵉ
 * variante FR est ajoutée un jour, ce nombre suit automatiquement — un
 * overlay qui resterait à 2 variantes ferait alors échouer le test au lieu
 * de laisser `resoudreGabaritCore` absorber silencieusement l'index hors
 * borne (`idx % variantes.length`) vers la mauvaise phrase.
 */
const NB_VARIANTES_ATTENDU: Record<string, number> = Object.fromEntries(
  Object.keys(MARQUES_PAR_FAMILLE).map((cle) => [
    cle,
    FAMILLES_CHIFFREES.includes(cle)
      ? nombreVariantesChiffrees(cle)
      : nombreVariantesCommanditaire(cle),
  ]),
);

describe.each([
  ["EN", QUETES_GABARITS_EN],
  ["ES", QUETES_GABARITS_ES],
  ["EL", QUETES_GABARITS_EL],
] as const)("gabarits périodiques %s", (_, ov) => {
  test("chaque famille a EXACTEMENT le nombre de variantes du FR, chacune avec ses marques", () => {
    for (const [cle, marques] of Object.entries(MARQUES_PAR_FAMILLE)) {
      const attendu = NB_VARIANTES_ATTENDU[cle];
      for (let i = 0; i < attendu; i++) {
        const g = ov[`${cle}#${i}`];
        expect(g, `${cle}#${i} manquant`).toBeDefined();
        for (const marque of marques) {
          expect(g.corps.join(" "), `${cle}#${i} devrait contenir ${marque}`).toContain(marque);
        }
      }
      const tous = Object.entries(ov).filter(([k]) => k.startsWith(`${cle}#`));
      expect(tous.length, `${cle} : ${attendu} variante(s) attendue(s) côté FR`).toBe(attendu);
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
