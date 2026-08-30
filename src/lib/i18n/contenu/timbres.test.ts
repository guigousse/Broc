import { describe, expect, test } from "vitest";
import { TIMBRES } from "@/data/timbres";
import { TIMBRES_EN } from "@/lib/i18n/contenu/en/timbres";
import { TIMBRES_ES } from "@/lib/i18n/contenu/es/timbres";
import { TIMBRES_EL } from "@/lib/i18n/contenu/el/timbres";
import { manquants, orphelins } from "@/lib/i18n/contenu";

const IDS = TIMBRES.map((t) => t.id);

describe.each([
  ["EN", TIMBRES_EN],
  ["ES", TIMBRES_ES],
  ["EL", TIMBRES_EL],
] as const)("overlay timbres %s", (_, overlay) => {
  test("complétude : chaque id de TIMBRES a son nom", () => {
    expect(manquants(IDS, overlay)).toEqual([]);
  });
  test("pas d'entrée orpheline", () => {
    expect(orphelins(IDS, overlay)).toEqual([]);
  });
  test("pas de nom vide", () => {
    expect(Object.entries(overlay).filter(([, v]) => !v.trim())).toEqual([]);
  });
});
