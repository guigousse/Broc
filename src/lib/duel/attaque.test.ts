import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { attaquer, finirTour, nouvellePartie, poser } from "@/lib/duel/partie";
import { trouverObjet } from "@/lib/duel/etat";
import { avecMain, avecObjet, DECK_A, DECK_B } from "@/lib/duel/__test__/helpers";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const MARTEAU = "carte.marteau_menuisier"; // Bricolage 2/1
const TABOURET = "carte.tabouret_bois_patine"; // Maison 2/4 Barrage
const VASE_DECO = "carte.vase_art_deco_bebert_germain"; // Objets d'art 1/2
const ENCLUME = "carte.enclume_petit_modele"; // Bricolage 3/1 Prompt
const TERRE_CUITE = "carte.boite_marqueterie_florentine"; // Objets d'art 1/2 Solide
const MANETTE = "carte.manette_megadrive"; // Jeux 3/2 Fragile
const BOTTES = "carte.bottes_camperos_cuir"; // Mode 2/2 Ruse
const SCIE = "carte.scie_egoine_de_charpentier"; // Bricolage 5/4

describe("attaquer", () => {
  it("frappe la vitrine de sa valeur d'attaque, une seule fois par tour", () => {
    const { etat, uid } = avecObjet(base(), 0, MARTEAU);
    const r = attaquer(etat, uid, { type: "vitrine" });
    expect(r.ok).toBe(true);
    expect(r.etat.joueurs[1].vitrine).toBe(18);
    expect(attaquer(r.etat, uid, { type: "vitrine" }).ok).toBe(false);
  });

  it("contre un objet : riposte simultanée, +1 si l'attaquant domine la catégorie de la cible (et en riposte)", () => {
    let s = avecObjet(base(), 0, MARTEAU); // Bricolage 2/1
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TABOURET); // Maison 2/4 : Bricolage domine Maison
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(r.ok).toBe(true);
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(4 - 3); // 2 + 1 de roue
    expect(trouverObjet(r.etat, marteau)).toBeNull(); // 1 PV − 2 de riposte → casse
    expect(r.etat.joueurs[0].casse).toContain(MARTEAU);
  });

  it("la riposte porte aussi le bonus de roue quand c'est le défenseur qui domine", () => {
    let s = avecObjet(base(), 0, VASE_DECO); // Objets d'art 1/2 domine Bricolage
    const vaseDeco = s.uid;
    s = avecObjet(s.etat, 1, SCIE); // Bricolage 5/4
    const r = attaquer(s.etat, vaseDeco, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(4 - 2); // 1 + 1 de roue
  });

  it("pas de bonus contre la vitrine", () => {
    const { etat, uid } = avecObjet(base(), 0, MARTEAU);
    expect(attaquer(etat, uid, { type: "vitrine" }).etat.joueurs[1].vitrine).toBe(18);
  });

  it("Barrage : la cible doit être un Barrage tant qu'il y en a un", () => {
    let s = avecObjet(base(), 0, MARTEAU);
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TABOURET);
    const tabouret = s.uid;
    s = avecObjet(s.etat, 1, VASE_DECO);
    expect(attaquer(s.etat, marteau, { type: "vitrine" }).ok).toBe(false);
    expect(attaquer(s.etat, marteau, { type: "objet", uid: s.uid }).ok).toBe(false);
    expect(attaquer(s.etat, marteau, { type: "objet", uid: tabouret }).ok).toBe(true);
  });

  it("un objet posé ce tour ne peut pas attaquer, sauf Prompt", () => {
    const e = base();
    let s = avecObjet(e, 0, MARTEAU, e.tour);
    expect(attaquer(s.etat, s.uid, { type: "vitrine" }).ok).toBe(false);
    s = avecObjet(e, 0, ENCLUME, e.tour);
    expect(attaquer(s.etat, s.uid, { type: "vitrine" }).ok).toBe(true);
  });

  it("Solide réduit chaque dégât de 1", () => {
    let s = avecObjet(base(), 0, MARTEAU); // 2 d'attaque
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, TERRE_CUITE); // 1/2 Solide, Objets d'art (pas dominé par Bricolage)
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1);
  });

  it("Ruse : inciblable pendant son tour de pose et le tour adverse suivant, et ne compte pas comme Barrage", () => {
    let e = base();
    let s = avecObjet(e, 0, MARTEAU);
    const marteau = s.uid;
    e = finirTour(s.etat).etat; // tour 2, joueur 1
    s = avecObjet(e, 1, BOTTES, e.tour);
    const bottes = s.uid;
    e = finirTour(s.etat).etat; // tour 3, joueur 0
    expect(attaquer(e, marteau, { type: "objet", uid: bottes }).ok).toBe(false);
    expect(attaquer(e, marteau, { type: "vitrine" }).ok).toBe(true);
    e = finirTour(e).etat; e = finirTour(e).etat; // tour 5
    expect(attaquer(e, marteau, { type: "objet", uid: bottes }).ok).toBe(true);
  });

  it("un objet d'attaque 0 ne peut pas attaquer", () => {
    const s = avecObjet(base(), 0, MARTEAU);
    const etat = { ...s.etat, joueurs: [{ ...s.etat.joueurs[0], etal: s.etat.joueurs[0].etal.map((o) => ({ ...o, attaque: 0 })) }, s.etat.joueurs[1]] as typeof s.etat.joueurs };
    expect(attaquer(etat, s.uid, { type: "vitrine" }).ok).toBe(false);
  });

  it("vitrine à 0 : partie gagnée par l'attaquant", () => {
    const s = avecObjet(base(), 0, SCIE);
    const etat = { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], vitrine: 5 }] as typeof s.etat.joueurs };
    expect(attaquer(etat, s.uid, { type: "vitrine" }).etat.fini).toEqual({ vainqueur: 0 });
  });

  it("les deux vitrines à 0 en même temps : match nul", () => {
    const s = avecObjet(base(), 0, MARTEAU);
    const etat = { ...s.etat, joueurs: [{ ...s.etat.joueurs[0], vitrine: 0 }, { ...s.etat.joueurs[1], vitrine: 0 }] as typeof s.etat.joueurs };
    expect(finirTour(etat).etat.fini).toEqual({ vainqueur: null });
  });
});

describe("Fragile", () => {
  it("perd 1 PV en fin de tour de son propriétaire, et casse à 0", () => {
    let e = avecObjet(base(), 0, MANETTE).etat; // 3/2 Fragile
    e = finirTour(e).etat;
    expect(e.joueurs[0].etal[0].pv).toBe(1);
    e = finirTour(e).etat; // tour de J1 : rien
    expect(e.joueurs[0].etal[0].pv).toBe(1);
    e = finirTour(e).etat;
    expect(e.joueurs[0].etal).toHaveLength(0);
    expect(e.joueurs[0].casse).toContain(MANETTE);
  });
});

describe("poser", () => {
  it("paie le coût, refuse sans énergie, sans la carte, ou étal plein", () => {
    let e = avecMain(base(), 0, [MARTEAU, SCIE], 3);
    let r = poser(e, MARTEAU);
    expect(r.ok).toBe(true);
    expect(r.etat.joueurs[0].energie).toBe(2);
    expect(r.etat.joueurs[0].main).toEqual([SCIE]);
    expect(r.etat.joueurs[0].etal[0]).toMatchObject({ id: MARTEAU, attaque: 2, pv: 1, poseAuTour: e.tour, aAttaque: false });
    expect(poser(r.etat, SCIE).ok).toBe(false); // coût 4 > 2
    expect(poser(r.etat, MARTEAU).ok).toBe(false); // plus en main
    e = avecMain(base(), 0, [MARTEAU], 5);
    for (const id of [VASE_DECO, VASE_DECO, VASE_DECO, VASE_DECO]) e = avecObjet(e, 0, id).etat;
    expect(poser(e, MARTEAU).ok).toBe(false); // étal plein
  });

  it("un mot-clé persistant est porté par l'objet posé", () => {
    const e = avecMain(base(), 0, [TABOURET], 3);
    expect(poser(e, TABOURET).etat.joueurs[0].etal[0].motsCles).toEqual(["barrage"]);
  });
});
