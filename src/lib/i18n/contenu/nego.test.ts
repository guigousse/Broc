import { describe, expect, test } from "vitest";
import { POOLS_NEGO_FR, POOLS_NEGO_TEMPERAMENT_FR } from "@/lib/negociation";
import { NEGO_EN, NEGO_TEMPERAMENT_EN } from "@/lib/i18n/contenu/en/nego";
import { NEGO_ES, NEGO_TEMPERAMENT_ES } from "@/lib/i18n/contenu/es/nego";
import { NEGO_EL, NEGO_TEMPERAMENT_EL } from "@/lib/i18n/contenu/el/nego";
import { texteNego } from "@/lib/i18n/contenu";
import type { CleMessageNego, Temperament } from "@/types/game";

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

/* ------------------------------------------------------------------ */
/* Pools colorés par tempérament                                       */
/* ------------------------------------------------------------------ */

const TEMPERAMENTS = Object.keys(POOLS_NEGO_TEMPERAMENT_FR) as Temperament[];

describe.each([
  ["EN", NEGO_TEMPERAMENT_EN],
  ["ES", NEGO_TEMPERAMENT_ES],
  ["EL", NEGO_TEMPERAMENT_EL],
] as const)("pools tempérament %s", (_, overlay) => {
  test("mêmes tempéraments et mêmes clés que le FR, aucun pool vide", () => {
    expect(Object.keys(overlay).sort()).toEqual([...TEMPERAMENTS].sort());
    for (const t of TEMPERAMENTS) {
      const clesFr = Object.keys(POOLS_NEGO_TEMPERAMENT_FR[t]).sort();
      expect(Object.keys(overlay[t] ?? {}).sort()).toEqual(clesFr);
      for (const cle of clesFr as CleMessageNego[]) {
        expect(overlay[t]?.[cle]?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
  test("placeholders : sous-ensemble de l'union FR générique par clé", () => {
    for (const t of TEMPERAMENTS) {
      for (const [cle, variantes] of Object.entries(
        POOLS_NEGO_TEMPERAMENT_FR[t],
      ) as [CleMessageNego, string[]][]) {
        const ensemble = autorises(cle);
        for (const v of [...variantes, ...(overlay[t]?.[cle] ?? [])]) {
          for (const ph of placeholders(v)) {
            expect(ensemble, `${t}/${cle} : « ${v} » utilise ${ph} hors ensemble FR`).toContain(ph);
          }
        }
      }
    }
  });
});

test("texteNego : un message avec tempérament résout dans le pool coloré, fallback générique sinon", () => {
  const msg = {
    cle: "fache" as const,
    variante: 0,
    temperament: "bourru" as const,
  };
  expect(texteNego(msg, "fr")).toBe(POOLS_NEGO_TEMPERAMENT_FR.bourru.fache![0]);
  expect(texteNego(msg, "en")).toBe(NEGO_TEMPERAMENT_EN.bourru!.fache![0]);
  // Clé non couverte par les pools colorés → pool générique.
  const msgDiplomate = {
    cle: "diplomate" as const,
    variante: 0,
    params: { cibleSecrete: 30 },
    temperament: "bourru" as const,
  };
  expect(texteNego(msgDiplomate, "fr")).toBe(
    POOLS_NEGO_FR.diplomate[0].replace("{cibleSecrete}", "30"),
  );
});
