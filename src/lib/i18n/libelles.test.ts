import { describe, expect, it, test } from "vitest";
import { CATEGORIES } from "@/data/categories";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleCategorie, libelleEtat, libelleRarete } from "@/lib/i18n/libelles";

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
