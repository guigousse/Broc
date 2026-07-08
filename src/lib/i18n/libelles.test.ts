import { describe, expect, it } from "vitest";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { libelleEtat, libelleRarete } from "@/lib/i18n/libelles";

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
