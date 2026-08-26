import { describe, expect, it } from "vitest";
import { formaterMontantCompact } from "./montantCompact";

describe("formaterMontantCompact", () => {
  it("laisse les montants sous le millier intacts", () => {
    expect(formaterMontantCompact(0, "fr")).toBe("0");
    expect(formaterMontantCompact(840, "fr")).toBe("840");
    expect(formaterMontantCompact(999, "fr")).toBe("999");
  });

  it("écrit les milliers en k, avec au plus une décimale", () => {
    expect(formaterMontantCompact(1_000, "fr")).toBe("1k");
    expect(formaterMontantCompact(1_200, "fr")).toBe("1,2k");
    expect(formaterMontantCompact(9_999, "fr")).toBe("9,9k");
    expect(formaterMontantCompact(10_610, "fr")).toBe("10,6k");
    expect(formaterMontantCompact(128_450, "fr")).toBe("128,4k");
  });

  it("écrit les millions en m", () => {
    expect(formaterMontantCompact(1_000_000, "fr")).toBe("1m");
    expect(formaterMontantCompact(3_400_000, "fr")).toBe("3,4m");
  });

  /**
   * Tronquer et non arrondir : une caisse ne doit jamais annoncer plus que ce
   * qu'elle contient. 10 690 € affichés « 10,7k » promettraient dix euros qui
   * n'existent pas.
   */
  it("tronque au lieu d'arrondir", () => {
    expect(formaterMontantCompact(10_690, "fr")).toBe("10,6k");
    expect(formaterMontantCompact(1_999, "fr")).toBe("1,9k");
  });

  /** Le seuil du million ne s'atteint pas par arrondi du dernier k. */
  it("garde 999 999 dans les milliers", () => {
    expect(formaterMontantCompact(999_999, "fr")).toBe("999,9k");
  });

  it("laisse tomber la décimale quand elle est nulle", () => {
    expect(formaterMontantCompact(2_000, "fr")).toBe("2k");
    expect(formaterMontantCompact(2_050, "fr")).toBe("2k");
  });

  it("prend le séparateur décimal de la langue", () => {
    expect(formaterMontantCompact(10_610, "en")).toBe("10.6k");
    expect(formaterMontantCompact(10_610, "es")).toBe("10,6k");
    expect(formaterMontantCompact(10_610, "el")).toBe("10,6k");
  });

  /** Le budget ne descend pas sous zéro en jeu, mais un signe perdu en route
   *  vaut mieux qu'un « 1,5k » trompeur. */
  it("conserve le signe des montants négatifs", () => {
    expect(formaterMontantCompact(-1_500, "fr")).toBe("-1,5k");
    expect(formaterMontantCompact(-840, "fr")).toBe("-840");
  });
});
