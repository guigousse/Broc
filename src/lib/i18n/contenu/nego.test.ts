import { describe, expect, test } from "vitest";
import { POOLS_NEGO_FR } from "@/lib/negociation";
import { NEGO_EN } from "@/lib/i18n/contenu/en/nego";
import { NEGO_ES } from "@/lib/i18n/contenu/es/nego";
import { texteNego } from "@/lib/i18n/contenu";

const CLES = Object.keys(POOLS_NEGO_FR) as (keyof typeof POOLS_NEGO_FR)[];
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe.each([["EN", NEGO_EN], ["ES", NEGO_ES]] as const)("pools négo %s", (_, pool) => {
  test("mêmes clés que le FR, aucun pool vide", () => {
    expect(Object.keys(pool).sort()).toEqual([...CLES].sort());
    for (const cle of CLES) expect(pool[cle].length).toBeGreaterThan(0);
  });
  test("placeholders identiques au FR (par clé, ensemble uniforme)", () => {
    for (const cle of CLES) {
      const attendu = placeholders(POOLS_NEGO_FR[cle][0]);
      for (const v of [...POOLS_NEGO_FR[cle], ...pool[cle]]) {
        expect(placeholders(v)).toBe(attendu);
      }
    }
  });
});

test("texteNego : résolution, interpolation, modulo variante", () => {
  const msg = { cle: "accord" as const, variante: 7, params: { prix: 45 } };
  expect(texteNego(msg, "fr")).toBe(
    POOLS_NEGO_FR.accord[7 % POOLS_NEGO_FR.accord.length].replace("{prix}", "45"),
  );
  expect(texteNego(msg, "en")).toContain("45");
  expect(texteNego(msg, "es")).toContain("45");
});
