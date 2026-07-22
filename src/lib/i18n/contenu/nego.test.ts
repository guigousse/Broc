import { describe, expect, test } from "vitest";
import { POOLS_NEGO_FR } from "@/lib/negociation";
import { NEGO_EN } from "@/lib/i18n/contenu/en/nego";
import { NEGO_ES } from "@/lib/i18n/contenu/es/nego";
import { NEGO_EL } from "@/lib/i18n/contenu/el/nego";
import { texteNego } from "@/lib/i18n/contenu";

const CLES = Object.keys(POOLS_NEGO_FR) as (keyof typeof POOLS_NEGO_FR)[];
const placeholders = (s: string) => s.match(/\{\w+\}/g) ?? [];

/** Ensemble autorisé par clé = union des placeholders de TOUTES les variantes FR. */
const autorises = (cle: keyof typeof POOLS_NEGO_FR) =>
  new Set(POOLS_NEGO_FR[cle].flatMap(placeholders));

describe.each([
  ["EN", NEGO_EN],
  ["ES", NEGO_ES],
  ["EL", NEGO_EL],
] as const)("pools négo %s", (_, pool) => {
  test("mêmes clés que le FR, aucun pool vide", () => {
    expect(Object.keys(pool).sort()).toEqual([...CLES].sort());
    for (const cle of CLES) expect(pool[cle].length).toBeGreaterThan(0);
  });
  test("placeholders : sous-ensemble de l'union FR par clé (une variante peut en omettre — tr ignore les params inutilisés)", () => {
    for (const cle of CLES) {
      const ensemble = autorises(cle);
      for (const v of [...POOLS_NEGO_FR[cle], ...pool[cle]]) {
        for (const ph of placeholders(v)) {
          expect(ensemble, `${cle} : « ${v} » utilise ${ph} hors ensemble FR`).toContain(ph);
        }
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
