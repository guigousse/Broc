import { describe, expect, it } from "vitest";
import { estMissionLivrable } from "./missions";
import type { CourrierPayloadMission, Objet } from "@/types/game";

function payload(templateId: string, etatMin?: CourrierPayloadMission["cible"]["etatMin"]): CourrierPayloadMission {
  return {
    type: "mission",
    expediteurId: "x",
    titre: "t",
    corps: [],
    cible: etatMin ? { templateId, etatMin } : { templateId },
    recompense: { argent: 0 },
  };
}

function objet(patch: Partial<Objet>): Objet {
  return {
    id: "1",
    templateId: "t1",
    nom: "n",
    categorie: "Bricolage",
    prixReferenceReel: 10,
    etat: "Bon",
    rarete: "commun",
    ...patch,
  };
}

describe("estMissionLivrable", () => {
  it("livrable si templateId match et état suffisant", () => {
    expect(estMissionLivrable(payload("t1", "Bon"), [objet({ templateId: "t1", etat: "Bon" })])).toBe(true);
  });

  it("non livrable si templateId différent", () => {
    expect(estMissionLivrable(payload("t1"), [objet({ templateId: "autre" })])).toBe(false);
  });

  it("non livrable si état strictement inférieur à etatMin", () => {
    expect(estMissionLivrable(payload("t1", "Très bon"), [objet({ templateId: "t1", etat: "Bon" })])).toBe(false);
  });

  it("livrable si état supérieur à etatMin", () => {
    expect(estMissionLivrable(payload("t1", "Bon"), [objet({ templateId: "t1", etat: "Pristin état" })])).toBe(true);
  });

  it("non livrable si objet en restauration même si état OK", () => {
    expect(
      estMissionLivrable(payload("t1"), [
        objet({ templateId: "t1", etat: "Bon", enRestauration: { etatCible: "Très bon", jourFin: 99 } }),
      ]),
    ).toBe(false);
  });

  it("livrable sans etatMin = tout état accepté", () => {
    expect(estMissionLivrable(payload("t1"), [objet({ templateId: "t1", etat: "Mauvais" })])).toBe(true);
  });

  it("non livrable si inventaire vide", () => {
    expect(estMissionLivrable(payload("t1"), [])).toBe(false);
  });
});
