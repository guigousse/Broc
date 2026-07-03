import { describe, it, expect } from "vitest";
import {
  ENERGIE_MAX,
  PUBS_ENERGIE_MAX_PAR_JOUR,
  RECHARGE_INTERVAL_MS,
  enregistrerPubEnergie,
  pubsEnergieRestantes,
  settleEnergie,
  energieCourante,
  secondesAvantProchaine,
  secondesAvantPlein,
  type EnergieState,
} from "./energie";

const T0 = 1_700_000_000_000; // ancre de référence arbitraire (epoch ms)

function etat(partial: Partial<EnergieState> = {}): EnergieState {
  return {
    energie: 0,
    energieDerniereMaj: T0,
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

describe("secondesAvantPlein", () => {
  it("renvoie null si déjà plein", () => {
    expect(secondesAvantPlein(etat({ energie: ENERGIE_MAX }), T0)).toBeNull();
  });

  it("4/5 fraîchement settle → 30 min", () => {
    expect(secondesAvantPlein(etat({ energie: 4 }), T0)).toBe(30 * 60);
  });

  it("0/5 fraîchement settle → 5 paliers de 30 min", () => {
    // 1 palier pour le prochain +1, puis 4 paliers jusqu'à 5/5.
    expect(secondesAvantPlein(etat({ energie: 0 }), T0)).toBe(5 * 30 * 60);
  });

  it("3/5 avec 10 min déjà écoulées sur le prochain palier", () => {
    const r = secondesAvantPlein(etat({ energie: 3 }), T0 + 10 * 60 * 1000);
    // 20 min pour le prochain +1, puis 1 palier de 30 min → 50 min.
    expect(r).toBe(20 * 60 + 30 * 60);
  });
});

/* ===================================================================== */
/* Plafond quotidien des pubs énergie (conformité régies publicitaires)  */
/* ===================================================================== */

describe("pubs énergie — plafond quotidien", () => {
  // 3 juillet 2026, 10 h heure locale (clé de jour local, comme les quêtes).
  const MATIN = new Date(2026, 6, 3, 10, 0, 0).getTime();
  const SOIR = new Date(2026, 6, 3, 23, 30, 0).getTime();
  const LENDEMAIN = new Date(2026, 6, 4, 0, 5, 0).getTime();

  it("le plafond est petit et positif (hygiène régie, pas un robinet)", () => {
    expect(PUBS_ENERGIE_MAX_PAR_JOUR).toBeGreaterThanOrEqual(1);
    expect(PUBS_ENERGIE_MAX_PAR_JOUR).toBeLessThanOrEqual(10);
  });

  it("sans compteur, tout le quota du jour est disponible", () => {
    expect(pubsEnergieRestantes(undefined, MATIN)).toBe(PUBS_ENERGIE_MAX_PAR_JOUR);
  });

  it("chaque pub enregistrée décrémente le quota du même jour", () => {
    let pubs = enregistrerPubEnergie(undefined, MATIN);
    expect(pubsEnergieRestantes(pubs, SOIR)).toBe(PUBS_ENERGIE_MAX_PAR_JOUR - 1);
    pubs = enregistrerPubEnergie(pubs, SOIR);
    expect(pubsEnergieRestantes(pubs, SOIR)).toBe(PUBS_ENERGIE_MAX_PAR_JOUR - 2);
  });

  it("le quota ne descend jamais sous zéro", () => {
    let pubs = enregistrerPubEnergie(undefined, MATIN);
    for (let i = 0; i < PUBS_ENERGIE_MAX_PAR_JOUR + 3; i++) {
      pubs = enregistrerPubEnergie(pubs, MATIN);
    }
    expect(pubsEnergieRestantes(pubs, MATIN)).toBe(0);
  });

  it("le compteur repart à zéro au minuit local suivant", () => {
    let pubs = enregistrerPubEnergie(undefined, MATIN);
    for (let i = 0; i < PUBS_ENERGIE_MAX_PAR_JOUR; i++) {
      pubs = enregistrerPubEnergie(pubs, SOIR);
    }
    expect(pubsEnergieRestantes(pubs, SOIR)).toBe(0);
    expect(pubsEnergieRestantes(pubs, LENDEMAIN)).toBe(PUBS_ENERGIE_MAX_PAR_JOUR);
    // et l'enregistrement du lendemain ouvre bien un nouveau compteur
    const apres = enregistrerPubEnergie(pubs, LENDEMAIN);
    expect(pubsEnergieRestantes(apres, LENDEMAIN)).toBe(PUBS_ENERGIE_MAX_PAR_JOUR - 1);
  });
});
