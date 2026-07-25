import { describe, expect, it } from "vitest";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
  POP_PASTILLE_MS,
  RESPIRATION_MS,
  VOL_MS,
  phasesCeremonie,
} from "./ceremonie";

describe("phasesCeremonie", () => {
  it("2 items et 2 lignes XP : envols décalés, atterrissages 620 ms plus tard", () => {
    const etapes = phasesCeremonie(2, 2);
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

  it("le bloc XP démarre à l'atterrissage du dernier item", () => {
    const finItems = DECALAGE_ITEM_MS + VOL_MS; // 2 items
    const etapes = phasesCeremonie(2, 2);
    expect(etapes).toContainEqual({ at: finItems, etape: { type: "ligneXp", index: 0 } });
    expect(etapes).toContainEqual({
      at: finItems + CASCADE_XP_MS,
      etape: { type: "ligneXp", index: 1 },
    });
    expect(etapes).toContainEqual({
      at: finItems + 2 * CASCADE_XP_MS,
      etape: { type: "pastille" },
    });
    expect(etapes).toContainEqual({
      at: finItems + 2 * CASCADE_XP_MS + POP_PASTILLE_MS + RESPIRATION_MS,
      etape: { type: "volPastille" },
    });
  });

  it("le dégel suit l'atterrissage de la pastille, la sortie 700 ms après", () => {
    const etapes = phasesCeremonie(1, 1);
    const vol = etapes.find((e) => e.etape.type === "volPastille");
    const degel = etapes.find((e) => e.etape.type === "degel");
    const sortie = etapes.find((e) => e.etape.type === "sortie");
    expect(degel?.at).toBe((vol?.at ?? 0) + VOL_MS);
    expect(sortie?.at).toBe((degel?.at ?? 0) + PAUSE_FINALE_MS);
  });

  it("session sans achat : le bloc XP démarre à 0", () => {
    const etapes = phasesCeremonie(0, 3);
    expect(etapes.some((e) => e.etape.type === "envolItem")).toBe(false);
    expect(etapes[0]).toEqual({ at: 0, etape: { type: "ligneXp", index: 0 } });
  });

  it("sans achat ni XP : dégel immédiat puis sortie, aucune pastille", () => {
    const etapes = phasesCeremonie(0, 0);
    expect(etapes.some((e) => e.etape.type === "pastille")).toBe(false);
    expect(etapes.some((e) => e.etape.type === "volPastille")).toBe(false);
    expect(etapes).toEqual([
      { at: 0, etape: { type: "degel" } },
      { at: PAUSE_FINALE_MS, etape: { type: "sortie" } },
    ]);
  });

  it("les étapes sont triées par date croissante", () => {
    const dates = phasesCeremonie(4, 3).map((e) => e.at);
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });
});
