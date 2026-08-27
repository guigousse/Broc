import { describe, expect, it } from "vitest";
import { calculerRoulette, positionsA, estFlash, tempsBoucle, CENTRE_X, FPS } from "./roulette.js";

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
