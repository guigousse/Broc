import { describe, expect, it } from "vitest";
import {
  appliquerGainXPBrocanteur,
  emptyAffinites,
  emptyBrocanteur,
  progressionNiveauBrocanteur,
  xpRequisPourNiveauBrocanteur,
} from "./xp";
import { CATEGORIES } from "@/data/categories";

const freshBrocanteur = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveauBrocanteur — courbe quadratique 17N²+83N (aplatie 2026-07-06)", () => {
  it("seuils cumulés post-aplatissement", () => {
    expect(xpRequisPourNiveauBrocanteur(0)).toBe(0);
    expect(xpRequisPourNiveauBrocanteur(1)).toBe(100);
    expect(xpRequisPourNiveauBrocanteur(2)).toBe(234);
    expect(xpRequisPourNiveauBrocanteur(3)).toBe(402);
    expect(xpRequisPourNiveauBrocanteur(5)).toBe(840);
    expect(xpRequisPourNiveauBrocanteur(10)).toBe(2530);
    expect(xpRequisPourNiveauBrocanteur(20)).toBe(8460);
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(17790);
  });

  it("l'incrément entre niveaux vaut 34N+66", () => {
    for (const n of [1, 2, 5, 10, 25]) {
      expect(
        xpRequisPourNiveauBrocanteur(n) - xpRequisPourNiveauBrocanteur(n - 1),
      ).toBe(34 * n + 66);
    }
  });

  it("niveaux négatifs traités comme 0", () => {
    expect(xpRequisPourNiveauBrocanteur(-3)).toBe(0);
  });
});

describe("appliquerGainXPBrocanteur", () => {
  it("gain sous le seuil : pas de level-up", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 99);
    expect(res).toEqual({ xp: 99, niveau: 0, pointsDisponibles: 0 });
  });

  it("level-up simple : +1 niveau, +1 point", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 100);
    expect(res).toEqual({ xp: 100, niveau: 1, pointsDisponibles: 1 });
  });

  it("multi-level-up en un seul gain (480 XP → niveau 3, 3 points)", () => {
    const res = appliquerGainXPBrocanteur(freshBrocanteur(), 480);
    expect(res.niveau).toBe(3);
    expect(res.pointsDisponibles).toBe(3);
  });

  it("conserve les points déjà présents", () => {
    const res = appliquerGainXPBrocanteur(
      { xp: 100, niveau: 1, pointsDisponibles: 5 },
      160,
    );
    expect(res).toEqual({ xp: 260, niveau: 2, pointsDisponibles: 6 });
  });

  it("gain nul ou négatif : état inchangé", () => {
    const b = { xp: 300, niveau: 2, pointsDisponibles: 1 };
    expect(appliquerGainXPBrocanteur(b, 0)).toEqual(b);
    expect(appliquerGainXPBrocanteur(b, -10)).toEqual(b);
  });
});

describe("progressionNiveauBrocanteur", () => {
  it("0 juste après un level-up, 0.5 à mi-chemin", () => {
    expect(progressionNiveauBrocanteur({ xp: 100, niveau: 1, pointsDisponibles: 0 })).toBe(0);
    // niveau 1 → 2 : seuils 100 → 234, span 134 ; 100+67=167 → 0.5
    expect(progressionNiveauBrocanteur({ xp: 167, niveau: 1, pointsDisponibles: 0 })).toBe(0.5);
  });
});

describe("états initiaux Brocanteur", () => {
  it("emptyBrocanteur : tout à zéro", () => {
    expect(emptyBrocanteur()).toEqual({ xp: 0, niveau: 0, pointsDisponibles: 0 });
  });
  it("emptyAffinites : une entrée à 0 par catégorie", () => {
    const a = emptyAffinites();
    for (const c of CATEGORIES) expect(a[c]).toBe(0);
    expect(Object.keys(a)).toHaveLength(CATEGORIES.length);
  });
});
