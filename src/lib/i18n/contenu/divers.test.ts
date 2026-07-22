import { describe, expect, test } from "vitest";
import { CAMIONS } from "@/data/camion";
import { STOCKAGE_TIERS } from "@/data/stockage";
import { CELEBRITES } from "@/data/celebrites";
import { DIVERS_EN } from "@/lib/i18n/contenu/en/divers";
import { DIVERS_ES } from "@/lib/i18n/contenu/es/divers";
import { DIVERS_EL } from "@/lib/i18n/contenu/el/divers";
import {
  manquants,
  nomCamion,
  nomCelebrite,
  nomStockageTier,
  orphelins,
} from "@/lib/i18n/contenu";

const VISUELS = CAMIONS.map((c) => c.visuelId);
const NIVEAUX = STOCKAGE_TIERS.map((t) => String(t.niveau));

describe.each([["EN", DIVERS_EN], ["ES", DIVERS_ES], ["EL", DIVERS_EL]] as const)(
  "overlay divers %s",
  (_, overlay) => {
    test("camions complets", () => expect(manquants(VISUELS, overlay.camions)).toEqual([]));
    test("camions sans orphelin", () => expect(orphelins(VISUELS, overlay.camions)).toEqual([]));
    test("stockage complet", () => expect(manquants(NIVEAUX, overlay.stockage)).toEqual([]));
    test("stockage sans orphelin", () => expect(orphelins(NIVEAUX, overlay.stockage)).toEqual([]));
    test("célébrités complètes", () => expect(manquants(CELEBRITES, overlay.celebrites)).toEqual([]));
    test("célébrités sans orphelin", () =>
      expect(orphelins(CELEBRITES, overlay.celebrites)).toEqual([]));
  },
);

// Accès dynamique par clé (les records `satisfies` gardent un type littéral étroit).
const camionsEn = DIVERS_EN.camions as Record<string, string>;
const camionsEs = DIVERS_ES.camions as Record<string, string>;
const celebEn = DIVERS_EN.celebrites as Record<string, string>;
const celebEs = DIVERS_ES.celebrites as Record<string, string>;

test("nomCamion : résolution + fallback FR", () => {
  const c = CAMIONS[0];
  expect(nomCamion(c, "fr")).toBe(c.nom);
  expect(nomCamion(c, "en")).toBe(camionsEn[c.visuelId]);
  expect(nomCamion(c, "es")).toBe(camionsEs[c.visuelId]);
  expect(nomCamion({ visuelId: "inconnu", nom: "Fourgon" }, "en")).toBe("Fourgon");
});

test("nomStockageTier : résolution + fallback FR", () => {
  const t = STOCKAGE_TIERS[0];
  expect(nomStockageTier(t, "fr")).toBe(t.nom);
  expect(nomStockageTier(t, "en")).toBe("Garage");
  expect(nomStockageTier(STOCKAGE_TIERS[2], "es")).toBe(DIVERS_ES.stockage["3"]);
  expect(nomStockageTier({ niveau: 1, nom: "Réserve" }, "es")).toBe(DIVERS_ES.stockage["1"]);
});

test("nomCelebrite : résolution + fallback = chaîne passée", () => {
  const c = CELEBRITES[0];
  expect(nomCelebrite(c, "fr")).toBe(c);
  expect(nomCelebrite(c, "en")).toBe(celebEn[c]);
  expect(nomCelebrite(c, "es")).toBe(celebEs[c]);
  // Chaîne inconnue (vieille save) → renvoyée telle quelle.
  expect(nomCelebrite("inconnue au bataillon", "en")).toBe("inconnue au bataillon");
});
