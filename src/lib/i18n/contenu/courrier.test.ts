import { describe, expect, test } from "vitest";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { creerLettreMamanDebut, ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";
import { COURRIER_EN } from "@/lib/i18n/contenu/en/courrier";
import { COURRIER_ES } from "@/lib/i18n/contenu/es/courrier";
import { corpsCourrier, manquants, orphelins, titreCourrier } from "@/lib/i18n/contenu";

const IDS = [ID_LETTRE_MAMAN_DEBUT, ...QUETES_PRINCIPALES.map((c) => c.id)];

describe.each([["EN", COURRIER_EN], ["ES", COURRIER_ES]] as const)("overlay courrier %s", (_, ov) => {
  test("complétude + zéro orphelin", () => {
    expect(manquants(IDS, ov)).toEqual([]);
    expect(orphelins(IDS, ov)).toEqual([]);
  });
  test("même nombre de paragraphes que le FR (mise en page des lettres)", () => {
    const maman = creerLettreMamanDebut(1);
    expect(ov[ID_LETTRE_MAMAN_DEBUT].corps.length).toBe(maman.payload.corps.length);
    for (const ch of QUETES_PRINCIPALES) {
      expect(ov[ch.id].corps.length).toBe(ch.payload.corps.length);
    }
  });
});

test("résolution par id + fallback payload FR", () => {
  const maman = creerLettreMamanDebut(1);
  expect(titreCourrier(maman, "fr")).toBe(maman.payload.titre);
  expect(titreCourrier(maman, "en")).toBe(COURRIER_EN[ID_LETTRE_MAMAN_DEBUT].titre);
  const inconnu = { id: "quo_x_1", payload: { titre: "Titre FR généré", corps: ["p"] } };
  expect(titreCourrier(inconnu, "es")).toBe("Titre FR généré");
  expect(corpsCourrier(inconnu, "es")).toEqual(["p"]);
});
