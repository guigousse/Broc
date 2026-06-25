// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  construireRappels,
  programmerRappelRetour,
  annulerRappelRetour,
} from "./rappelRetour";
import { NOTIF_IDS } from "./ids";

const JOUR_MS = 24 * 60 * 60 * 1000;

describe("construireRappels (pur)", () => {
  it("programme 3 rappels aux offsets J+1 / J+3 / J+7 avec les bons IDs", () => {
    const now = 1_000_000_000_000;
    const specs = construireRappels(now);

    expect(specs).toHaveLength(3);
    expect(specs.map((s) => s.id)).toEqual([...NOTIF_IDS.RAPPEL_RETOUR]);
    expect(specs.map((s) => s.atMs)).toEqual([
      now + 1 * JOUR_MS,
      now + 3 * JOUR_MS,
      now + 7 * JOUR_MS,
    ]);
  });

  it("chaque rappel a un titre et un corps non vides", () => {
    for (const s of construireRappels(0)) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

describe("rappelRetour hors Tauri", () => {
  it("programmerRappelRetour() est un no-op sans lever (pas de permission)", async () => {
    await expect(programmerRappelRetour(Date.now())).resolves.toBeUndefined();
  });

  it("annulerRappelRetour() est un no-op sans lever", async () => {
    await expect(annulerRappelRetour()).resolves.toBeUndefined();
  });
});
