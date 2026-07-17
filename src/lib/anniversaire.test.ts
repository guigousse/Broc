import { describe, expect, it } from "vitest";
import {
  cadeauAnniversaireVisible,
  estVinyle,
  ID_DECLENCHEUR_CADEAU,
  JOUR_ANNIVERSAIRE,
  objetCadeauAnniversaire,
  TEMPLATE_VINYLE_CADEAU,
} from "./anniversaire";

describe("cadeau d'anniversaire (11 juin = jour 6)", () => {
  const base = {
    jourActuel: JOUR_ANNIVERSAIRE,
    tutorielEtape: "termine" as const,
    declencheursDeclenches: [] as string[],
  };

  it("visible au jour 6 (et au-delà), tutoriel terminé, pas encore récupéré", () => {
    expect(cadeauAnniversaireVisible(base)).toBe(true);
    expect(cadeauAnniversaireVisible({ ...base, jourActuel: 12 })).toBe(true);
  });

  it("invisible avant le 11 juin, pendant le tutoriel, ou déjà récupéré", () => {
    expect(cadeauAnniversaireVisible({ ...base, jourActuel: 5 })).toBe(false);
    expect(
      cadeauAnniversaireVisible({ ...base, tutorielEtape: "accueil" as never }),
    ).toBe(false);
    expect(
      cadeauAnniversaireVisible({
        ...base,
        declencheursDeclenches: [ID_DECLENCHEUR_CADEAU],
      }),
    ).toBe(false);
  });

  it("le cadeau est le 33 tours de jazz, en Très bon état", () => {
    const objet = objetCadeauAnniversaire();
    expect(objet.templateId).toBe(TEMPLATE_VINYLE_CADEAU);
    expect(objet.etat).toBe("Très bon");
    expect(estVinyle(objet.templateId)).toBe(true);
  });

  it("estVinyle reconnaît les deux préfixes et rejette le reste", () => {
    expect(estVinyle("mus.vinyle_swing")).toBe(true);
    expect(estVinyle("mus.33tours_jazz_2")).toBe(true);
    expect(estVinyle("ma.lampe_petrole_ancienne")).toBe(false);
  });
});
