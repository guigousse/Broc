import { describe, expect, it } from "vitest";
import { calculerDevine, etapeA, APPARITION } from "./devine.js";

const cfg = { nbObjets: 3, dureeCompte: 3, dureeRevele: 2, dernierMystere: false };

describe("calculerDevine", () => {
  it("enchaîne les objets : apparition, compte, révélation ; durée = n × (0,5 + compte + révélation)", () => {
    const r = calculerDevine(cfg);
    expect(r.type).toBe("devine");
    expect(r.duree).toBeCloseTo(3 * (APPARITION + 3 + 2), 9);
    expect(r.etapes).toHaveLength(3);
    expect(r.etapes[1]).toEqual({ index: 1, debut: 5.5, compte: 6, revelation: 9, fin: 11, mystere: false });
    expect(r.geleAuFlash).toBe(false);
    expect(r.instantsCentrage).toEqual([]);
  });
  it("un tic par chiffre du compte à rebours, pour chaque objet", () => {
    const r = calculerDevine(cfg);
    expect(r.instantsTics.map((x) => x.t)).toEqual([0.5, 1.5, 2.5, 6, 7, 8, 11.5, 12.5, 13.5]);
    expect(r.instantsTics[0]).toEqual({ t: 0.5, index: 0, estCible: false });
  });
  it("un compte de 2,5 s donne 3 chiffres (3, 2, 1) : le dernier tic reste avant la révélation", () => {
    const r = calculerDevine({ ...cfg, nbObjets: 1, dureeCompte: 2.5 });
    expect(r.instantsTics.map((x) => x.t)).toEqual([0.5, 1.5, 2.5]);
  });
  it("une célébration à chaque révélation ; l'overlay dès la dernière", () => {
    const r = calculerDevine(cfg);
    expect(r.instantsCelebration).toEqual([3.5, 9, 14.5]);
    expect(r.arretDepuis).toBe(14.5);
    expect(r.instantCelebration).toBeNull();
    expect(r.fenetrePauseMs).toBe(2000);
  });
  it("dernier mystère : pas de célébration ni de prix pour le dernier", () => {
    const r = calculerDevine({ ...cfg, dernierMystere: true });
    expect(r.instantsCelebration).toEqual([3.5, 9]);
    expect(r.etapes[2].mystere).toBe(true);
    expect(r.etapes[1].mystere).toBe(false);
  });
});

describe("etapeA", () => {
  const r = calculerDevine(cfg);
  it("phase et avancement dans la phase", () => {
    expect(etapeA(0.25, r)).toMatchObject({ index: 0, phase: "apparition", u: 0.5 });
    expect(etapeA(1.2, r)).toMatchObject({ index: 0, phase: "compte", reste: 3 });
    expect(etapeA(2.0, r)).toMatchObject({ index: 0, phase: "compte", reste: 2 });
    expect(etapeA(3.4, r)).toMatchObject({ index: 0, phase: "compte", reste: 1 });
    expect(etapeA(4.5, r)).toMatchObject({ index: 0, phase: "revelation", u: 0.5 });
    expect(etapeA(5.5, r)).toMatchObject({ index: 1, phase: "apparition", u: 0 });
  });
  it("après la fin : dernière révélation, u = 1", () => {
    expect(etapeA(99, r)).toMatchObject({ index: 2, phase: "revelation", u: 1 });
  });
});
