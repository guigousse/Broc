import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { nouvellePartie } from "@/lib/duel/partie";
import { jouerTour } from "@/lib/duel/ia";
import { avecMain, avecObjet, DECK_A, DECK_B } from "@/lib/duel/__test__/helpers";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const MARTEAU = "carte.marteau_menuisier"; // 2/1, coût 1
const SCIE = "carte.scie_egoine_de_charpentier"; // 5/4, coût 4
const AQUARELLE = "carte.aquarelle_paysage_anonyme"; // 1/2
const TABOURET = "carte.tabouret_bois_patine"; // 2/4 Barrage

describe("IA", () => {
  it("pose la carte la plus chère qu'elle peut payer, puis finit son tour", () => {
    const e = avecMain(base(), 0, [MARTEAU, SCIE], 4);
    const r = jouerTour(e, "agressif");
    expect(r.actif).toBe(1);
    expect(r.joueurs[0].etal.map((o) => o.id)).toEqual([SCIE]);
  });

  it("agressif : frappe la vitrine plutôt que d'échanger, sauf coup fatal ou échange gagnant", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, AQUARELLE);
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "agressif");
    // la scie (5/4) tue l'aquarelle (1/2) en survivant : échange gagnant pris
    expect(r.joueurs[1].etal).toHaveLength(0);
  });

  it("agressif : avec un coup fatal disponible, va à la vitrine", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, AQUARELLE);
    const e = { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], vitrine: 5 }] as typeof s.etat.joueurs };
    const r = jouerTour(avecMain(e, 0, [], 0), "agressif");
    expect(r.fini).toEqual({ vainqueur: 0 });
  });

  it("prudent : n'attaque pas la vitrine sans étal dominant, mais prend un échange de valeur", () => {
    let s = avecObjet(base(), 0, MARTEAU); // 2/1 coût 1
    s = avecObjet(s.etat, 1, TABOURET); // 2/4 coût 3 : Barrage, l'échange est forcé de toute façon
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "prudent");
    expect(r.joueurs[1].vitrine).toBe(20);
  });

  it("respecte le Barrage", () => {
    let s = avecObjet(base(), 0, SCIE);
    s = avecObjet(s.etat, 1, TABOURET);
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "agressif");
    expect(r.joueurs[1].vitrine).toBe(20);
    expect(r.joueurs[1].etal).toHaveLength(0);
  });

  it("prudent : sans échange ni domination, tient l'étal plutôt que de frapper la vitrine", () => {
    let s = avecObjet(base(), 0, MARTEAU); // 2/1, pas d'échange gagnant contre la scie
    s = avecObjet(s.etat, 1, SCIE); // 5/4 : le marteau ne domine pas (2 < 5)
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "prudent");
    expect(r.joueurs[1].vitrine).toBe(20);
    expect(r.joueurs[0].etal.map((o) => o.id)).toEqual([MARTEAU]);
  });

  it("agressif : sur le même plateau marteau/scie, frappe quand même la vitrine (diverge du prudent)", () => {
    let s = avecObjet(base(), 0, MARTEAU);
    s = avecObjet(s.etat, 1, SCIE);
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "agressif");
    expect(r.joueurs[1].vitrine).toBe(18);
  });

  it("prudent : à étal dominant, prend quand même l'échange gagnant plutôt que la vitrine", () => {
    let s = avecObjet(base(), 0, SCIE); // 5/4, domine (5 > 2)
    s = avecObjet(s.etat, 1, MARTEAU); // 2/1 : échange gagnant pour la scie
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "prudent");
    expect(r.joueurs[1].etal).toHaveLength(0);
    expect(r.joueurs[1].vitrine).toBe(20);
  });

  it("prudent : à étal dominant sans objet adverse, frappe la vitrine", () => {
    const s = avecObjet(base(), 0, SCIE); // 5/4 seul, étal adverse vide : dominant
    const r = jouerTour(avecMain(s.etat, 0, [], 0), "prudent");
    expect(r.joueurs[1].vitrine).toBe(15);
  });
});
