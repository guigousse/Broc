import { describe, expect, it, test } from "vitest";
import { CATEGORIES } from "@/data/categories";
import { DEBLOCAGES_PAR_NIVEAU } from "@/data/deblocagesNiveau";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { DEBLOCAGES_EN } from "@/lib/i18n/contenu/en/deblocages";
import type { ActiveId } from "@/lib/actives";
import {
  libelleActive,
  libelleCategorie,
  libelleEtat,
  libelleFamille,
  libelleJourSemaine,
  libelleRarete,
} from "@/lib/i18n/libelles";

const ACTIVE_IDS: ActiveId[] = [
  "flair",
  "lotGarni",
  "fouille",
  "boniment",
  "tchatche",
  "criee",
  "diplomate",
];

test("libelleCategorie couvre les 7 catégories dans les 3 langues", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    for (const cat of CATEGORIES) {
      const l = libelleCategorie(cat, DICTIONNAIRES[locale]);
      expect(l.trim()).not.toBe("");
    }
  }
  expect(libelleCategorie("Musique", DICTIONNAIRES.en)).toBe("Music");
});

describe("libelles état / rareté", () => {
  it("traduit les 4 états dans les 3 langues", () => {
    expect(libelleEtat("Pristin état", DICTIONNAIRES.fr)).toBe("Pristin état");
    expect(libelleEtat("Pristin état", DICTIONNAIRES.en)).toBe("Pristine");
    expect(libelleEtat("Pristin état", DICTIONNAIRES.es)).toBe("Impecable");
    expect(libelleEtat("Mauvais", DICTIONNAIRES.en)).toBe("Poor");
    expect(libelleEtat("Bon", DICTIONNAIRES.es)).toBe("Bueno");
    expect(libelleEtat("Très bon", DICTIONNAIRES.en)).toBe("Very good");
  });

  it("traduit les 3 raretés dans les 3 langues", () => {
    expect(libelleRarete("commun", DICTIONNAIRES.fr)).toBe("commun");
    expect(libelleRarete("legendaire", DICTIONNAIRES.en)).toBe("legendary");
    expect(libelleRarete("rare", DICTIONNAIRES.es)).toBe("raro");
  });
});

test("libelleFamille couvre les 5 familles dans les 3 langues", () => {
  const familles = [...new Set(DEBLOCAGES_PAR_NIVEAU.map((d) => d.famille))];
  for (const locale of ["fr", "en", "es"] as const) {
    for (const f of familles) {
      expect(libelleFamille(f, DICTIONNAIRES[locale]).trim()).not.toBe("");
    }
  }
  expect(libelleFamille("active", DICTIONNAIRES.en)).toBe("Active skill");
  expect(libelleFamille("jalon", DICTIONNAIRES.es)).toBe("Hito");
});

describe("libelleActive", () => {
  it("couvre les 7 ActiveId dans les 3 langues, jamais vide", () => {
    for (const locale of ["fr", "en", "es"] as const) {
      for (const id of ACTIVE_IDS) {
        expect(libelleActive(id, DICTIONNAIRES[locale]).trim()).not.toBe("");
      }
    }
  });

  it("cohérence avec les titres de déblocage EN : le nom EN de l'active y apparaît", () => {
    expect(DEBLOCAGES_EN["Active 🔍 Le Flair"]).toContain(
      libelleActive("flair", DICTIONNAIRES.en),
    );
    expect(DEBLOCAGES_EN["Active 🧺 Le Lot garni"]).toContain(
      libelleActive("lotGarni", DICTIONNAIRES.en),
    );
    expect(DEBLOCAGES_EN["Active 🧹 La Fouille"]).toContain(
      libelleActive("fouille", DICTIONNAIRES.en),
    );
    expect(DEBLOCAGES_EN["Active 🎩 Le Boniment"]).toContain(
      libelleActive("boniment", DICTIONNAIRES.en),
    );
    expect(DEBLOCAGES_EN["Active 💬 La Tchatche"]).toContain(
      libelleActive("tchatche", DICTIONNAIRES.en),
    );
    expect(DEBLOCAGES_EN["Active 📣 La Criée"]).toContain(
      libelleActive("criee", DICTIONNAIRES.en),
    );
  });
});

describe("libelleJourSemaine", () => {
  it("couvre les 7 index dans les 3 langues, jamais vide", () => {
    for (const locale of ["fr", "en", "es"] as const) {
      for (let i = 0; i < 7; i++) {
        expect(libelleJourSemaine(i, DICTIONNAIRES[locale]).trim()).not.toBe("");
      }
    }
  });

  it("abréviations attendues par langue", () => {
    expect(libelleJourSemaine(0, DICTIONNAIRES.en)).toBe("Mon");
    expect(libelleJourSemaine(0, DICTIONNAIRES.fr)).toBe("Lun");
    expect(libelleJourSemaine(2, DICTIONNAIRES.es)).toBe("Mié");
    expect(libelleJourSemaine(6, DICTIONNAIRES.en)).toBe("Sun");
  });
});
