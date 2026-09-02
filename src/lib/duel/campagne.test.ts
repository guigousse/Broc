import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import {
  campagne, deckAEstAggro, estVictoireAggro, formaterRapport, horsCible, mesuresDepuis, paireBicolore,
  type Cumul, type MesureCarte,
} from "@/lib/duel/campagne";
import { creerRng } from "@/lib/duel/rng";
import { ROUE } from "@/data/duel/roue";

/** Compteurs neutres : chaque test ne renseigne que ce qu'il mesure. */
function cumul(partiel: Partial<Cumul> = {}): Cumul {
  const cartes: Record<string, MesureCarte> = Object.fromEntries(
    CARTES.map((c) => [c.id, { parties: 0, victoires: 0, pioches: 0, poses: 0 }]),
  );
  return { cartes, decidees: 0, premier: 0, manches: 0, manchesMax: 0, nuls: 0, epuisees: 0, aggroV: 0, aggroN: 0, ...partiel };
}

describe("campagne", () => {
  it("mesure 120 parties : toutes les cartes vues, taux bornés, rapport formaté", () => {
    const m = campagne({ graine: 1, nParties: 120 });
    expect(m.parties).toBe(120);
    expect(Object.keys(m.cartes)).toHaveLength(CARTES.length);
    for (const c of Object.values(m.cartes)) expect(c.victoires).toBeLessThanOrEqual(c.parties);
    expect(m.premierJoueur).toBeGreaterThanOrEqual(0);
    expect(m.premierJoueur).toBeLessThanOrEqual(1);
    expect(Object.keys(m.categories)).toHaveLength(7);
    const texte = formaterRapport(m, 1);
    expect(texte).toContain("| Carte |");
    expect(Array.isArray(horsCible(m))).toBe(true);
  });

  it("est déterministe", () => {
    expect(campagne({ graine: 4, nParties: 30 })).toEqual(campagne({ graine: 4, nParties: 30 }));
  });
});

describe("mesures — dénominateurs", () => {
  it("premier joueur et agressif/contrôle ne divisent que par les parties décidées", () => {
    // 100 parties jouées, 80 décidées (10 nulles, 10 épuisées) : 48 victoires du premier joueur.
    const m = mesuresDepuis(cumul({ decidees: 80, premier: 48, nuls: 10, epuisees: 10, aggroN: 20, aggroV: 9 }), 100);
    expect(m.premierJoueur).toBeCloseTo(48 / 80, 10); // et surtout pas 48 / 100
    expect(m.agressifVsControle).toBeCloseTo(9 / 20, 10);
    expect(m.nuls).toBeCloseTo(0.1, 10);
    expect(m.epuisees).toBeCloseTo(0.1, 10);
  });

  it("le taux d'une catégorie est la moyenne non pondérée des taux de ses cartes", () => {
    const cat = ROUE[0];
    const ids = CARTES.filter((c) => c.serie === cat).map((c) => c.id);
    const c = cumul();
    // Une carte à 100 % sur 1 seule partie, les autres à 0 % sur 1000 : la moyenne pondérée serait
    // quasi nulle, la moyenne des taux vaut 1/n.
    c.cartes[ids[0]] = { parties: 1, victoires: 1, pioches: 0, poses: 0 };
    for (const id of ids.slice(1)) c.cartes[id] = { parties: 1000, victoires: 0, pioches: 0, poses: 0 };
    const m = mesuresDepuis(c, 1);
    expect(m.categories[cat]).toBeCloseTo(1 / ids.length, 10);
  });
});

describe("estVictoireAggro", () => {
  const aggro = CARTES.map((c) => c.id).filter((id) => deckAEstAggro([id])).slice(0, 20);
  const controle = CARTES.map((c) => c.id).filter((id) => !deckAEstAggro([id])).slice(0, 20);

  it("crédite le camp agressif quel que soit son siège", () => {
    expect(deckAEstAggro(aggro)).toBe(true);
    expect(deckAEstAggro(controle)).toBe(false);
    expect(estVictoireAggro(0, aggro)).toBe(true); // aggro en A, A gagne
    expect(estVictoireAggro(1, aggro)).toBe(false); // aggro en A, B gagne
    expect(estVictoireAggro(1, controle)).toBe(true); // aggro en B, B gagne
    expect(estVictoireAggro(0, controle)).toBe(false); // aggro en B, A gagne
  });
});

describe("paireBicolore", () => {
  it("ne tire jamais deux fois le même cran, et couvre les 7", () => {
    const rng = creerRng(7);
    const vus = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const [a, b] = paireBicolore(rng);
      expect(b).not.toBe(a);
      expect(ROUE).toContain(a);
      expect(ROUE).toContain(b);
      vus.add(a);
    }
    expect(vus.size).toBe(7);
  });

  it("le décalage 1..6 modulo 7 ne peut pas retomber sur le cran de départ", () => {
    for (let a = 0; a < 7; a++) {
      for (let d = 1; d <= 6; d++) expect((a + d) % 7).not.toBe(a);
    }
  });
});
