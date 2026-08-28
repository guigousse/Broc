import { describe, expect, it } from "vitest";
import { calculerRoulette, positionsA, positionsVisibles, estFlash, instantDessine, tempsBoucle, CENTRE_X, LARGEUR, FPS } from "./roulette.js";

const CFG = { nbObjets: 8, indexCible: 2, vitesse: 2, espacement: 500, nbPassages: 3, largeurFlash: 4 };

describe("calculerRoulette", () => {
  it("période, durée et vitesse en px", () => {
    const r = calculerRoulette(CFG);
    expect(r.periodeTour).toBe(4);
    expect(r.duree).toBe(12);
    expect(r.vitessePx).toBe(1000);
    expect(r.longueurBande).toBe(4000);
  });
  it("la cible est centrée une fois par tour, au milieu du tour", () => {
    expect(calculerRoulette(CFG).instantsCentrage).toEqual([2, 6, 10]);
  });
  it("un tic par objet, la cible marquée", () => {
    const r = calculerRoulette(CFG);
    expect(r.instantsTics).toHaveLength(24);
    expect(r.instantsTics[0]).toEqual({ t: 0, index: 6, estCible: false });
    expect(r.instantsTics.filter((x) => x.estCible).map((x) => x.t)).toEqual([2, 6, 10]);
    expect(r.instantsTics.map((x) => x.t)).toEqual([...r.instantsTics.map((x) => x.t)].sort((a, b) => a - b));
  });
  it("fenêtre de pause et demi-flash", () => {
    const r = calculerRoulette(CFG);
    expect(r.demiFlash).toBeCloseTo(2 / FPS);
    expect(r.fenetrePauseMs).toBeCloseTo((4 / FPS) * 1000);
  });
});

describe("positionsA", () => {
  it("la cible est à CENTRE_X à l'instant de centrage", () => {
    const r = calculerRoulette(CFG);
    const x = positionsA(2, r, CFG).find((p) => p.index === 2).x;
    expect(x).toBeCloseTo(CENTRE_X);
  });
  it("les objets sont espacés d'un espacement et dans la bande", () => {
    const r = calculerRoulette(CFG);
    const xs = positionsA(0.3, r, CFG).map((p) => p.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(500);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(CENTRE_X - 2000); expect(x).toBeLessThan(CENTRE_X + 2000); }
  });
  it("ça avance vers la droite", () => {
    const r = calculerRoulette(CFG);
    const a = positionsA(0.1, r, CFG).find((p) => p.index === 6).x;
    const b = positionsA(0.2, r, CFG).find((p) => p.index === 6).x;
    expect(b - a).toBeCloseTo(100);
  });
  it("la boucle est parfaite", () => {
    const r = calculerRoulette(CFG);
    expect(positionsA(r.duree, r, CFG)).toEqual(positionsA(0, r, CFG).map((p) => ({ ...p, x: expect.closeTo(p.x, 6) })));
  });
  it("chaque tic coïncide avec le passage de son objet au centre", () => {
    const r = calculerRoulette(CFG);
    for (const tic of r.instantsTics) {
      const x = positionsA(tic.t, r, CFG).find((p) => p.index === tic.index).x;
      expect(x).toBeCloseTo(CENTRE_X, 6);
    }
  });
});

describe("positionsVisibles", () => {
  // Deux objets très espacés : la bande (2 × 700 = 1400 px) dépasse à peine
  // l'écran (1080), donc le pli de [−L/2, L/2) tombe DANS le cadre.
  const CFG2 = { nbObjets: 2, indexCible: 0, vitesse: 2.5, espacement: 700, nbPassages: 3, largeurFlash: 4 };

  it("rend les deux exemplaires d'un objet à cheval sur le pli", () => {
    const r = calculerRoulette(CFG2);
    // À t = 0, l'objet 0 est pile sur le bord du pli : il doit apparaître des deux côtés.
    const xs0 = positionsVisibles(0, r, CFG2).filter((p) => p.index === 0).map((p) => p.x).sort((a, b) => a - b);
    expect(xs0).toHaveLength(2);
    expect(xs0[0]).toBeCloseTo(CENTRE_X - 700);
    expect(xs0[1]).toBeCloseTo(CENTRE_X + 700);
  });

  it("aucun trou plus large qu'un espacement en travers du cadre", () => {
    const r = calculerRoulette(CFG2);
    for (let t = 0; t < r.duree; t += 0.05) {
      const xs = positionsVisibles(t, r, CFG2).map((p) => p.x).sort((a, b) => a - b);
      expect(xs[0]).toBeLessThanOrEqual(CENTRE_X - LARGEUR / 2);
      expect(xs[xs.length - 1]).toBeGreaterThanOrEqual(CENTRE_X + LARGEUR / 2);
      for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeLessThanOrEqual(CFG2.espacement + 1e-6);
    }
  });

  it("bande assez longue : c'est positionsA moins ce qui sort du cadre", () => {
    const r = calculerRoulette(CFG);
    const marge = LARGEUR / 2 + CFG.espacement;
    for (const t of [0, 0.3, 1.7, 5.5]) {
      const attendu = positionsA(t, r, CFG).filter((p) => Math.abs(p.x - CENTRE_X) <= marge);
      expect(positionsVisibles(t, r, CFG)).toEqual(attendu);
    }
  });

  it("la marge est réglable", () => {
    const r = calculerRoulette(CFG);
    expect(positionsVisibles(0.3, r, CFG, 0)).toEqual(
      positionsA(0.3, r, CFG).filter((p) => Math.abs(p.x - CENTRE_X) <= 0),
    );
  });
});

describe("estFlash / tempsBoucle", () => {
  it("flash seulement autour des centrages", () => {
    const r = calculerRoulette(CFG);
    expect(estFlash(2, r)).toBe(true);
    expect(estFlash(2 + 1.9 / FPS, r)).toBe(true);
    expect(estFlash(2 + 2.1 / FPS, r)).toBe(false);
    expect(estFlash(0, r)).toBe(false);
    expect(estFlash(6.02, r)).toBe(true);
  });
  it("tempsBoucle replie sur la durée", () => {
    const r = calculerRoulette(CFG);
    expect(tempsBoucle(13, r)).toBeCloseTo(1);
  });
});

describe("instantDessine", () => {
  it("gèle la roulette sur le calage exact pendant tout le flash", () => {
    const r = calculerRoulette(CFG);
    const c = r.instantsCentrage[1];
    for (const dt of [-r.demiFlash, -r.demiFlash / 2, 0, r.demiFlash / 2, r.demiFlash]) {
      expect(instantDessine(c + dt, r)).toBe(c);
    }
    // Au calage, la cible est pile au centre.
    const cible = positionsA(instantDessine(c + r.demiFlash / 2, r), r, CFG).find((p) => p.index === CFG.indexCible);
    expect(cible.x).toBeCloseTo(CENTRE_X, 6);
  });
  it("hors flash : le temps replié, inchangé", () => {
    const r = calculerRoulette(CFG);
    const t = r.instantsCentrage[0] + r.demiFlash * 3;
    expect(instantDessine(t, r)).toBeCloseTo(tempsBoucle(t, r), 12);
    expect(instantDessine(t + r.duree, r)).toBeCloseTo(tempsBoucle(t, r), 9);
  });
});
