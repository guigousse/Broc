import { describe, expect, it } from "vitest";
import {
  XP_PAR_NIVEAU,
  appliquerGainXP,
  appliquerGainXPBrocanteur,
  emptyAffinites,
  emptyBrocanteur,
  progressionNiveau,
  progressionNiveauBrocanteur,
  xpRequisPourNiveau,
  xpRequisPourNiveauBrocanteur,
} from "./xp";
import { CATEGORIES } from "@/data/categories";

const fresh = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveau", () => {
  it("niveau 0 = 0 XP", () => {
    expect(xpRequisPourNiveau(0)).toBe(0);
  });

  it("est linéaire : niveau N = N × XP_PAR_NIVEAU", () => {
    for (const n of [1, 2, 3, 10, 50]) {
      expect(xpRequisPourNiveau(n)).toBe(n * XP_PAR_NIVEAU);
    }
  });

  it("traite les niveaux négatifs comme 0 (jamais en-dessous)", () => {
    expect(xpRequisPourNiveau(-1)).toBe(0);
    expect(xpRequisPourNiveau(-100)).toBe(0);
  });
});

describe("appliquerGainXP — pas de level-up", () => {
  it("ajoute le gain à l'XP sans changer le niveau", () => {
    const res = appliquerGainXP(fresh(), 50);
    expect(res.xp).toBe(50);
    expect(res.niveau).toBe(0);
    expect(res.pointsDisponibles).toBe(0);
  });

  it("gain de 0 = pas de changement", () => {
    const res = appliquerGainXP({ xp: 30, niveau: 0, pointsDisponibles: 0 }, 0);
    expect(res).toEqual({ xp: 30, niveau: 0, pointsDisponibles: 0 });
  });
});

describe("appliquerGainXP — level-up simple", () => {
  it("XP_PAR_NIVEAU exactement = passage au niveau 1, +1 point", () => {
    const res = appliquerGainXP(fresh(), XP_PAR_NIVEAU);
    expect(res.xp).toBe(XP_PAR_NIVEAU);
    expect(res.niveau).toBe(1);
    expect(res.pointsDisponibles).toBe(1);
  });

  it("100 XP de plus alors qu'on est niveau 1 ⇒ niveau 2, +1 point", () => {
    const start = { xp: XP_PAR_NIVEAU, niveau: 1, pointsDisponibles: 1 };
    const res = appliquerGainXP(start, XP_PAR_NIVEAU);
    expect(res.niveau).toBe(2);
    expect(res.pointsDisponibles).toBe(2);
  });
});

describe("appliquerGainXP — multi level-up en un seul gain", () => {
  it("gain qui couvre 3 niveaux en une fois donne 3 points", () => {
    const res = appliquerGainXP(fresh(), XP_PAR_NIVEAU * 3);
    expect(res.niveau).toBe(3);
    expect(res.pointsDisponibles).toBe(3);
  });

  it("gain qui couvre 5 niveaux conserve l'XP cumulé exact", () => {
    const res = appliquerGainXP(fresh(), XP_PAR_NIVEAU * 5 + 42);
    expect(res.xp).toBe(XP_PAR_NIVEAU * 5 + 42);
    expect(res.niveau).toBe(5);
    expect(res.pointsDisponibles).toBe(5);
  });
});

describe("appliquerGainXP — préserve les points existants", () => {
  it("les pointsDisponibles déjà présents ne sont pas remis à zéro", () => {
    const start = { xp: 50, niveau: 0, pointsDisponibles: 7 };
    const res = appliquerGainXP(start, 20);
    expect(res.pointsDisponibles).toBe(7);
  });

  it("level-up cumule sur les points existants", () => {
    const start = { xp: 50, niveau: 0, pointsDisponibles: 7 };
    const res = appliquerGainXP(start, XP_PAR_NIVEAU * 2);
    expect(res.pointsDisponibles).toBe(9);
  });
});

describe("appliquerGainXP — immutabilité", () => {
  it("ne mute pas l'objet d'entrée", () => {
    const start = fresh();
    const snapshot = { ...start };
    appliquerGainXP(start, XP_PAR_NIVEAU * 3);
    expect(start).toEqual(snapshot);
  });
});

describe("progressionNiveau", () => {
  it("retourne 0 si xp = seuil du niveau courant", () => {
    expect(progressionNiveau({ xp: 0, niveau: 0, pointsDisponibles: 0 })).toBe(0);
    expect(
      progressionNiveau({ xp: XP_PAR_NIVEAU, niveau: 1, pointsDisponibles: 0 }),
    ).toBe(0);
  });

  it("retourne 0.5 à mi-chemin", () => {
    const res = progressionNiveau({
      xp: XP_PAR_NIVEAU / 2,
      niveau: 0,
      pointsDisponibles: 0,
    });
    expect(res).toBe(0.5);
  });

  it("est capée à 1 (ne déborde pas)", () => {
    const res = progressionNiveau({
      xp: XP_PAR_NIVEAU * 99,
      niveau: 0,
      pointsDisponibles: 0,
    });
    expect(res).toBe(1);
  });

  it("est toujours dans [0, 1]", () => {
    for (let n = 0; n < 10; n++) {
      for (let bonus = 0; bonus <= XP_PAR_NIVEAU; bonus += 25) {
        const p = progressionNiveau({
          xp: n * XP_PAR_NIVEAU + bonus,
          niveau: n,
          pointsDisponibles: 0,
        });
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });
});

const freshBrocanteur = () => ({ xp: 0, niveau: 0, pointsDisponibles: 0 });

describe("xpRequisPourNiveauBrocanteur — courbe quadratique 30N²+70N", () => {
  it("seuils cumulés du rapport de design", () => {
    expect(xpRequisPourNiveauBrocanteur(0)).toBe(0);
    expect(xpRequisPourNiveauBrocanteur(1)).toBe(100);
    expect(xpRequisPourNiveauBrocanteur(2)).toBe(260);
    expect(xpRequisPourNiveauBrocanteur(3)).toBe(480);
    expect(xpRequisPourNiveauBrocanteur(5)).toBe(1100);
    expect(xpRequisPourNiveauBrocanteur(10)).toBe(3700);
    expect(xpRequisPourNiveauBrocanteur(20)).toBe(13400);
    expect(xpRequisPourNiveauBrocanteur(30)).toBe(29100);
  });

  it("l'incrément entre niveaux vaut 60N+40", () => {
    for (const n of [1, 2, 5, 10, 25]) {
      expect(
        xpRequisPourNiveauBrocanteur(n) - xpRequisPourNiveauBrocanteur(n - 1),
      ).toBe(60 * n + 40);
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
    // niveau 1 → 2 : seuils 100 → 260, span 160 ; 100+80=180 → 0.5
    expect(progressionNiveauBrocanteur({ xp: 180, niveau: 1, pointsDisponibles: 0 })).toBe(0.5);
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
