import { describe, expect, it } from "vitest";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
  VOL_MS,
  phasesEnvoiItems,
  phasesEnvoiXp,
} from "./ceremonie";

describe("phasesEnvoiItems — acte 1", () => {
  it("2 items et 2 lignes XP : envols décalés, atterrissages 620 ms plus tard", () => {
    const etapes = phasesEnvoiItems(2, 2);
    expect(etapes).toContainEqual({ at: 0, etape: { type: "envolItem", index: 0 } });
    expect(etapes).toContainEqual({
      at: DECALAGE_ITEM_MS,
      etape: { type: "envolItem", index: 1 },
    });
    expect(etapes).toContainEqual({
      at: VOL_MS,
      etape: { type: "atterrissageItem", index: 0 },
    });
    expect(etapes).toContainEqual({
      at: DECALAGE_ITEM_MS + VOL_MS,
      etape: { type: "atterrissageItem", index: 1 },
    });
  });

  it("le décompte démarre à l'atterrissage du dernier item et finit sur la pastille", () => {
    const finItems = DECALAGE_ITEM_MS + VOL_MS; // 2 items
    const etapes = phasesEnvoiItems(2, 2);
    expect(etapes).toContainEqual({ at: finItems, etape: { type: "ligneXp", index: 0 } });
    expect(etapes).toContainEqual({
      at: finItems + CASCADE_XP_MS,
      etape: { type: "ligneXp", index: 1 },
    });
    expect(etapes[etapes.length - 1]).toEqual({
      at: finItems + 2 * CASCADE_XP_MS,
      etape: { type: "pastille" },
    });
  });

  it("l'acte 1 ne dégèle ni ne sort : c'est au joueur d'enchaîner", () => {
    const types = phasesEnvoiItems(3, 2).map((e) => e.etape.type);
    expect(types).not.toContain("volPastille");
    expect(types).not.toContain("degel");
    expect(types).not.toContain("sortie");
  });

  it("session sans achat : le décompte démarre à 0", () => {
    const etapes = phasesEnvoiItems(0, 3);
    expect(etapes.some((e) => e.etape.type === "envolItem")).toBe(false);
    expect(etapes[0]).toEqual({ at: 0, etape: { type: "ligneXp", index: 0 } });
  });

  it("des achats sans XP : aucune pastille, la frise s'arrête aux envols", () => {
    const etapes = phasesEnvoiItems(2, 0);
    expect(etapes.some((e) => e.etape.type === "pastille")).toBe(false);
    expect(etapes[etapes.length - 1]).toEqual({
      at: DECALAGE_ITEM_MS + VOL_MS,
      etape: { type: "atterrissageItem", index: 1 },
    });
  });

  it("ni achat ni XP : frise vide", () => {
    expect(phasesEnvoiItems(0, 0)).toEqual([]);
  });

  it("les étapes sont triées par date croissante", () => {
    const dates = phasesEnvoiItems(4, 3).map((e) => e.at);
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });
});

describe("phasesEnvoiXp — acte 2", () => {
  it("avec pastille : envol, dégel à l'atterrissage, sortie 1 s après", () => {
    expect(phasesEnvoiXp(true)).toEqual([
      { at: 0, etape: { type: "volPastille" } },
      { at: VOL_MS, etape: { type: "degel" } },
      { at: VOL_MS + PAUSE_FINALE_MS, etape: { type: "sortie" } },
    ]);
  });

  it("sans pastille : rien à envoyer, on dégèle et on sort", () => {
    expect(phasesEnvoiXp(false)).toEqual([
      { at: 0, etape: { type: "degel" } },
      { at: PAUSE_FINALE_MS, etape: { type: "sortie" } },
    ]);
  });
});
