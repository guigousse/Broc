import { describe, expect, it } from "vitest";
import { calculerDevine, etapeA, intro, opaciteOverlay, APPARITION, INTRO, INTRO_MONTEE, OVERLAY_FONDU } from "./devine.js";

const cfg = { nbObjets: 3, dureeCompte: 3, dureeRevele: 2 };
const I = INTRO;   // 1,8 s de titre avant le premier objet
const d = (xs) => xs.map((x) => Math.round((x + I) * 1e6) / 1e6);

describe("calculerDevine", () => {
  it("enchaîne les objets : apparition, compte, révélation ; durée = n × (0,5 + compte + révélation)", () => {
    const r = calculerDevine(cfg);
    expect(r.type).toBe("devine");
    expect(r.duree).toBeCloseTo(I + 3 * (APPARITION + 3 + 2), 9);
    expect(r.etapes).toHaveLength(3);
    expect(r.etapes[1]).toEqual({ index: 1, debut: I + 5.5, compte: I + 6, revelation: I + 9, fin: I + 11, mystere: false });
    expect(r.geleAuFlash).toBe(false);
    expect(r.instantsCentrage).toEqual([]);
  });
  it("un tic par chiffre du compte à rebours, pour chaque objet", () => {
    const r = calculerDevine(cfg);
    expect(r.instantsTics.map((x) => Math.round(x.t * 1e6) / 1e6)).toEqual(d([0.5, 1.5, 2.5, 6, 7, 8, 11.5, 12.5, 13.5]));
    expect(r.instantsTics[0]).toEqual({ t: I + 0.5, index: 0, estCible: false });
  });
  it("un compte de 2,5 s donne 3 chiffres (3, 2, 1) : le dernier tic reste avant la révélation", () => {
    const r = calculerDevine({ ...cfg, nbObjets: 1, dureeCompte: 2.5 });
    expect(r.instantsTics.map((x) => x.t)).toEqual(d([0.5, 1.5, 2.5]));
  });
  it("une célébration à chaque révélation sauf la dernière (mystère) ; l'overlay dès la dernière", () => {
    const r = calculerDevine(cfg);
    expect(r.instantsCelebration).toEqual(d([3.5, 9]));
    expect(r.arretDepuis).toBe(I + 14.5);
    expect(r.instantCelebration).toBeNull();
    expect(r.fenetrePauseMs).toBe(2000);
  });
  it("le dernier objet est toujours mystère, les autres non", () => {
    const r = calculerDevine(cfg);
    expect(r.etapes[2].mystere).toBe(true);
    expect(r.etapes[1].mystere).toBe(false);
  });
});

describe("etapeA", () => {
  const r = calculerDevine(cfg);
  it("phase et avancement dans la phase", () => {
    expect(etapeA(I / 2, r)).toMatchObject({ index: 0, phase: "intro", u: 0.5 });
    expect(etapeA(I + 0.25, r)).toMatchObject({ index: 0, phase: "apparition" });
    expect(etapeA(I + 0.25, r).u).toBeCloseTo(0.5, 9);
    expect(etapeA(I + 1.2, r)).toMatchObject({ index: 0, phase: "compte", reste: 3 });
    expect(etapeA(I + 2.0, r)).toMatchObject({ index: 0, phase: "compte", reste: 2 });
    expect(etapeA(I + 3.4, r)).toMatchObject({ index: 0, phase: "compte", reste: 1 });
    expect(etapeA(I + 4.5, r).phase).toBe("revelation");
    expect(etapeA(I + 4.5, r).u).toBeCloseTo(0.5, 9);
    expect(etapeA(I + 5.5, r)).toMatchObject({ index: 1, phase: "apparition" });
  });
  it("après la fin : dernière révélation, u = 1", () => {
    expect(etapeA(99, r)).toMatchObject({ index: 2, phase: "revelation", u: 1 });
  });
});

describe("intro", () => {
  it("invisible avant 0 et après INTRO ; claque avec dépassement ; s'efface à la fin", () => {
    expect(intro(-1).opacite).toBe(0);
    expect(intro(INTRO).opacite).toBe(0);
    expect(intro(0).opacite).toBe(0);
    expect(intro(0).echelle).toBeCloseTo(0.2, 9);
    expect(intro(0).angle).toBeLessThan(0);
    const max = Math.max(...Array.from({ length: 50 }, (_, k) => intro((k / 50) * INTRO_MONTEE).echelle));
    expect(max).toBeGreaterThan(1.05);   // le dépassement
    expect(intro(INTRO_MONTEE).echelle).toBeCloseTo(1, 6);
    expect(intro(INTRO_MONTEE).opacite).toBe(1);
    expect(intro(INTRO - 0.2).opacite).toBeCloseTo(0.5, 9);
  });
});

describe("opaciteOverlay", () => {
  it("0 avant la dernière révélation, 1 après le fondu", () => {
    const r = calculerDevine({ nbObjets: 1, dureeCompte: 3, dureeRevele: 2 });
    expect(opaciteOverlay(r.arretDepuis - 0.1, r)).toBe(0);
    expect(opaciteOverlay(r.arretDepuis + OVERLAY_FONDU / 2, r)).toBeCloseTo(0.5, 9);
    expect(opaciteOverlay(r.arretDepuis + 5, r)).toBe(1);
  });
});
