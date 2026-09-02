import { describe, expect, it } from "vitest";
import { DECK_A, DECK_B } from "@/lib/duel/__test__/helpers";
import { creerRng } from "@/lib/duel/rng";
import { finirTour, nouvellePartie } from "@/lib/duel/partie";
import { MAIN_MAX, VITRINE_INITIALE } from "@/lib/duel/etat";

describe("nouvellePartie", () => {
  it("vitrines à 20, premier joueur 4 cartes + 1 piochée, second 5 cartes, énergie 1/1 au tour 1", () => {
    const e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    expect(e.joueurs[0].vitrine).toBe(VITRINE_INITIALE);
    expect(e.joueurs[1].vitrine).toBe(VITRINE_INITIALE);
    expect(e.actif).toBe(0);
    expect(e.tour).toBe(1);
    expect(e.joueurs[0].main).toHaveLength(5); // 4 + la pioche du tour 1
    expect(e.joueurs[1].main).toHaveLength(5); // compensation du second joueur
    expect(e.joueurs[0].deck).toHaveLength(15);
    expect(e.joueurs[1].deck).toHaveLength(15);
    expect(e.joueurs[0].plafond).toBe(1);
    expect(e.joueurs[0].energie).toBe(1);
    expect(e.joueurs[1].plafond).toBe(0);
    expect(e.fini).toBeNull();
  });

  it("est déterministe : même graine, mêmes mains", () => {
    const a = nouvellePartie(DECK_A, DECK_B, creerRng(9));
    const b = nouvellePartie(DECK_A, DECK_B, creerRng(9));
    expect(a).toEqual(b);
  });
});

describe("finirTour", () => {
  it("passe la main, monte le plafond jusqu'à 5 et recharge l'énergie", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = finirTour(e).etat;
    expect(e.actif).toBe(1);
    expect(e.tour).toBe(2);
    expect(e.joueurs[1].plafond).toBe(1);
    expect(e.joueurs[1].main).toHaveLength(6);
    for (let i = 0; i < 10; i++) e = finirTour(e).etat;
    expect(e.joueurs[0].plafond).toBe(5);
    expect(e.joueurs[0].energie).toBe(5);
  });

  it("ne rend pas un état muté : l'ancien état reste intact", () => {
    const e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    const copie = JSON.parse(JSON.stringify(e));
    finirTour(e);
    expect(e).toEqual(copie);
  });

  it("main pleine : la carte piochée part à la casse", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    // Le joueur 0 ne joue rien : sa main gonfle d'une carte par tour.
    for (let i = 0; i < 8; i++) e = finirTour(e).etat;
    expect(e.joueurs[0].main).toHaveLength(MAIN_MAX);
    expect(e.joueurs[0].casse.length).toBeGreaterThan(0);
  });

  it("deck vide : fatigue 1, 2, 3… sur la vitrine", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = { ...e, joueurs: [{ ...e.joueurs[0], deck: [], main: [] }, e.joueurs[1]] };
    e = finirTour(e).etat; // tour 2 (joueur 1)
    e = finirTour(e).etat; // tour 3 : joueur 0 échoue à piocher
    expect(e.joueurs[0].vitrine).toBe(19);
    e = finirTour(e).etat;
    e = finirTour(e).etat;
    expect(e.joueurs[0].vitrine).toBe(17);
    expect(e.joueurs[0].echecsPioche).toBe(2);
  });

  it("une vitrine à 0 termine la partie ; finirTour refuse ensuite", () => {
    let e = nouvellePartie(DECK_A, DECK_B, creerRng(1));
    e = { ...e, joueurs: [{ ...e.joueurs[0], deck: [], main: [], vitrine: 1 }, e.joueurs[1]] };
    e = finirTour(e).etat;
    e = finirTour(e).etat; // fatigue 1 → 0
    expect(e.fini).toEqual({ vainqueur: 1 });
    expect(finirTour(e).ok).toBe(false);
  });
});
