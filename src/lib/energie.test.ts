import { describe, it, expect } from "vitest";
import {
  ENERGIE_MAX,
  RECHARGE_INTERVAL_MS,
  PUBS_MAX_PAR_JOUR,
  cleJour,
  settleEnergie,
  energieCourante,
  secondesAvantProchaine,
  compteursPubs,
  peutRegarderPub,
  type EnergieState,
} from "./energie";

const T0 = 1_700_000_000_000; // ancre de référence arbitraire (epoch ms)

function etat(partial: Partial<EnergieState> = {}): EnergieState {
  return {
    energie: 0,
    energieDerniereMaj: T0,
    pubsRecharge: { jourCle: cleJour(T0), compte: 0 },
    ...partial,
  };
}

describe("settleEnergie", () => {
  it("crédite +1 toutes les 30 min", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(1);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("conserve le reste (29 min ne créditent rien, l'ancre ne bouge pas)", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + 29 * 60 * 1000);
    expect(r.energie).toBe(0);
    expect(r.energieDerniereMaj).toBe(T0);
  });

  it("avance l'ancre du temps consommé et garde le surplus", () => {
    const r = settleEnergie(etat({ energie: 0 }), T0 + RECHARGE_INTERVAL_MS + 10 * 60 * 1000);
    expect(r.energie).toBe(1);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("plafonne à ENERGIE_MAX et ré-ancre à now (pas de banque)", () => {
    const r = settleEnergie(etat({ energie: 4 }), T0 + 10 * RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(ENERGIE_MAX);
    expect(r.energieDerniereMaj).toBe(T0 + 10 * RECHARGE_INTERVAL_MS);
  });

  it("déjà plein : ancre = now, énergie inchangée", () => {
    const r = settleEnergie(etat({ energie: ENERGIE_MAX }), T0 + RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(ENERGIE_MAX);
    expect(r.energieDerniereMaj).toBe(T0 + RECHARGE_INTERVAL_MS);
  });

  it("anti-recul : temps antérieur → ré-ancre sans créditer", () => {
    const r = settleEnergie(etat({ energie: 2 }), T0 - RECHARGE_INTERVAL_MS);
    expect(r.energie).toBe(2);
    expect(r.energieDerniereMaj).toBe(T0 - RECHARGE_INTERVAL_MS);
  });
});

describe("energieCourante / secondesAvantProchaine", () => {
  it("energieCourante reflète le settle", () => {
    expect(energieCourante(etat({ energie: 1 }), T0 + RECHARGE_INTERVAL_MS)).toBe(2);
  });

  it("secondesAvantProchaine = null si plein", () => {
    expect(secondesAvantProchaine(etat({ energie: ENERGIE_MAX }), T0)).toBeNull();
  });

  it("secondesAvantProchaine compte le temps restant jusqu'au prochain +1", () => {
    const s = secondesAvantProchaine(etat({ energie: 0 }), T0 + 10 * 60 * 1000);
    expect(s).toBe(20 * 60); // 30 - 10 min restantes
  });
});

describe("pubs", () => {
  it("compte le jour courant, restant = max - compte", () => {
    const r = compteursPubs(etat({ pubsRecharge: { jourCle: cleJour(T0), compte: 3 } }), T0);
    expect(r.compte).toBe(3);
    expect(r.restant).toBe(PUBS_MAX_PAR_JOUR - 3);
  });

  it("reset au changement de jour calendaire", () => {
    const veille = etat({ pubsRecharge: { jourCle: cleJour(T0), compte: 10 } });
    const lendemain = T0 + 24 * 60 * 60 * 1000;
    const r = compteursPubs(veille, lendemain);
    expect(r.compte).toBe(0);
    expect(r.restant).toBe(PUBS_MAX_PAR_JOUR);
  });

  it("peutRegarderPub faux au plafond du jour", () => {
    const e = etat({ pubsRecharge: { jourCle: cleJour(T0), compte: PUBS_MAX_PAR_JOUR } });
    expect(peutRegarderPub(e, T0)).toBe(false);
  });
});
