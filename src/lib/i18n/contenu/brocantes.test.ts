import { describe, expect, test } from "vitest";
import { BROCANTES } from "@/data/brocantes";
import { BROCANTES_EN } from "@/lib/i18n/contenu/en/brocantes";
import { BROCANTES_ES } from "@/lib/i18n/contenu/es/brocantes";
import { BROCANTES_EL } from "@/lib/i18n/contenu/el/brocantes";
import { descriptionBrocante, manquants, nomBrocante, orphelins } from "@/lib/i18n/contenu";

const IDS = BROCANTES.map((b) => b.id);

describe.each([
  ["EN", BROCANTES_EN],
  ["ES", BROCANTES_ES],
  ["EL", BROCANTES_EL],
] as const)(
  "overlay brocantes %s",
  (_, overlay) => {
    test("complétude", () => expect(manquants(IDS, overlay)).toEqual([]));
    test("zéro orphelin", () => expect(orphelins(IDS, overlay)).toEqual([]));
  },
);

test("résolution + fallback", () => {
  const b = BROCANTES[0];
  expect(nomBrocante(b, "fr")).toBe(b.nom);
  expect(nomBrocante(b, "en")).toBe(BROCANTES_EN[b.id].nom);
  expect(descriptionBrocante(b, "es")).toBe(BROCANTES_ES[b.id].description);
  expect(nomBrocante({ id: "inconnue", nom: "X" }, "en")).toBe("X");
});
