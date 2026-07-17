import { describe, expect, test } from "vitest";
import { QUETES_PRINCIPALES } from "@/data/quetesPrincipales";
import { INVITATIONS_ORGANISATEURS } from "@/data/invitationsOrganisateurs";
import { CARTES_POSTALES } from "@/data/cartesPostales";
import { creerLettreMamanDebut, ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";
import { COURRIER_EN } from "@/lib/i18n/contenu/en/courrier";
import { corpsCourrier, manquants, orphelins, titreCourrier } from "@/lib/i18n/contenu";

const IDS = [
  ID_LETTRE_MAMAN_DEBUT,
  ...QUETES_PRINCIPALES.map((c) => c.id),
  ...([2, 3, 4] as const).map((tier) => `invitation_tier${tier}`),
  ...CARTES_POSTALES.map((c) => c.id),
];

// SP3 Task 7 : chapitres (trame_ch1..12), invitations (invitation_tier2/3/4)
// et cartes postales (carte_postale_1..5) traduits EN. ES reste à faire en
// Task 8 : on ne réactive donc que la ligne EN du describe.each pour ne pas
// faire échouer la parité ES avant sa traduction.
describe.each([
  ["EN", COURRIER_EN],
  // SP3 Task 8 : ré-ajouter la ligne ES
] as const)("overlay courrier %s", (_, ov) => {
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
    for (const tier of [2, 3, 4] as const) {
      expect(ov[`invitation_tier${tier}`].corps.length).toBe(
        INVITATIONS_ORGANISATEURS[tier].corps.length,
      );
    }
    for (const carte of CARTES_POSTALES) {
      expect(ov[carte.id].corps.length).toBe(carte.corps.length);
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
