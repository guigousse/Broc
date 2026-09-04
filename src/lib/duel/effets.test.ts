import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { attaquer, finirTour, nouvellePartie, poser } from "@/lib/duel/partie";
import { MAIN_MAX, trouverObjet } from "@/lib/duel/etat";
import { appliquerAction, blesserObjet, cibleRequise } from "@/lib/duel/effets";
import { avecMain, avecObjet, DECK_A, DECK_B } from "@/lib/duel/__test__/helpers";
import { CARTES_DUEL, statsDuel } from "@/data/duel/cartesDuel";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const RADIO = "carte.radio_cassette_annees_80"; // Cri pioche
const LAMPE_HUILE = "carte.lampe_huile_biblio"; // Cri 1 dégât (Livres & Papeterie)
const SERVICE = "carte.service_the_faience"; // Cri +2 PV
const VASE_DECO = "carte.vase_art_deco_bebert_germain"; // 1/2
const YOYO = "carte.yo_yo_duncan_alu"; // 2/2 (Jeux & Loisirs, dominé par Livres & Papeterie)
const MARTEAU = "carte.marteau_menuisier"; // 2/1 (Bricolage, dominé par Objets d'art)
const SAXO = "carte.saxophone_alto_professionnel"; // pose : alliés +1 att
const VIOLON = "carte.violon_de_maitre_cremonais_1715"; // debutTour : Musique +1 att
const GUITARE = "carte.guitare_classique_ancienne"; // attaque : pioche 1
const STYLO_PLUME = "carte.stylo_plume_haut_de_gamme_a_l_etoile_blanche_d"; // casse : pioche 1
const FLIPPER = "carte.flipper_a_plateau_annees_60"; // blesse : 2 à la vitrine adverse
const SMOKING = "carte.veste_smoking_msg"; // pose : retour en main
const BABYFOOT = "carte.baby_foot_de_competition_minibon_homologue"; // pose : 1 à tous + pioche 1
const SCULPTURE = "carte.vase_en_verre_moule_laluck_signe"; // pose : 2 à tous (Objets d'art)
const ENCRIER_ARGENT = "carte.encrier_argent_xixe"; // pose : 2 à un objet
const TERRE_CUITE = "carte.boite_marqueterie_florentine"; // 1/2 Solide (Objets d'art)
const BOITE_OUTILS = "carte.boite_outils_complete"; // 3/4, sans mot-clé (Bricolage, dominé par Objets d'art)
const BOITE_MANUF = "carte.boite_d_outils_de_manufacture_signee"; // casse : 2 à tous
const SCIE = "carte.scie_egoine_de_charpentier"; // 5/4
const BOTTES = "carte.bottes_camperos_cuir"; // 2/2 Ruse
const SAC_A_MAIN = "carte.sac_a_main_talaria"; // 2/4, attaque : +1 attaque soi
const TABOURET = "carte.tabouret_bois_patine"; // 2/4 Barrage

describe("Cri", () => {
  it("pioche : +1 carte en main à la pose", () => {
    const e = avecMain(base(), 0, [RADIO], 5);
    const r = poser(e, RADIO);
    expect(r.etat.joueurs[0].main).toHaveLength(1);
    expect(r.etat.joueurs[0].deck).toHaveLength(e.joueurs[0].deck.length - 1);
  });

  it("1 dégât à l'objet adverse choisi (sans bonus de roue, malgré la domination) ; s'éteint sans cible", () => {
    // LAMPE_HUILE (Livres & Papeterie) domine YOYO (Jeux & Loisirs) : si la roue s'appliquait, 2
    // dégâts casseraient YOYO (2 PV) ; le Cri ne fait que 1, il survit à 1 PV.
    let s = avecObjet(avecMain(base(), 0, [LAMPE_HUILE], 5), 1, YOYO);
    const r = poser(s.etat, LAMPE_HUILE, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1);
    expect(poser(avecMain(base(), 0, [LAMPE_HUILE], 5), LAMPE_HUILE).ok).toBe(true);
  });

  it("+2 PV à la vitrine, plafonnée à 20", () => {
    let e = avecMain(base(), 0, [SERVICE], 5);
    e = { ...e, joueurs: [{ ...e.joueurs[0], vitrine: 19 }, e.joueurs[1]] };
    expect(poser(e, SERVICE).etat.joueurs[0].vitrine).toBe(20);
  });

  it("une action à choix exige une cible quand il y en a une de possible", () => {
    const s = avecObjet(avecMain(base(), 0, [LAMPE_HUILE], 5), 1, VASE_DECO);
    expect(cibleRequise(LAMPE_HUILE)).toBe(true);
    expect(poser(s.etat, LAMPE_HUILE).ok).toBe(false);
  });

  it("une action à choix s'efface sans exiger de cible quand le seul objet adverse est sous Ruse", () => {
    let e = base(); // tour de J0
    e = finirTour(e).etat; // tour de J1
    const s = avecObjet(e, 1, BOTTES, e.tour); // BOTTES posée « maintenant » par J1, sous Ruse
    e = finirTour(s.etat).etat; // tour adverse qui suit : BOTTES toujours sous Ruse
    e = avecMain(e, 0, [LAMPE_HUILE], 5);
    const r = poser(e, LAMPE_HUILE);
    expect(r.ok).toBe(true);
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(2); // aucun dégât porté
  });
});

describe("effets uniques", () => {
  it("pose → gain alliés : tous les objets du propriétaire, lui compris", () => {
    const s = avecObjet(avecMain(base(), 0, [SAXO], 5), 0, MARTEAU);
    const r = poser(s.etat, SAXO);
    expect(r.etat.joueurs[0].etal.map((o) => o.attaque)).toEqual([3, 2]);
  });

  it("debutTour → gain alliés d'une catégorie, à chaque début de tour du propriétaire", () => {
    let s = avecObjet(base(), 0, VIOLON);
    s = avecObjet(s.etat, 0, MARTEAU);
    let e = finirTour(s.etat).etat; // J1
    e = finirTour(e).etat; // J0 : debutTour
    // Le violon gagne 1 d'attaque (Musique), le marteau (Bricolage) reste tel quel : lu dans la
    // donnée, que la boucle d'équilibrage retouche.
    expect(e.joueurs[0].etal.map((o) => o.attaque))
      .toEqual([statsDuel(VIOLON).attaque + 1, statsDuel(MARTEAU).attaque]);
  });

  it("attaque → pioche, résolu avant les dégâts", () => {
    const s = avecObjet(base(), 0, GUITARE);
    const r = attaquer(s.etat, s.uid, { type: "vitrine" });
    expect(r.etat.joueurs[0].main).toHaveLength(s.etat.joueurs[0].main.length + 1);
  });

  it("attaque : les stats de l'attaquant sont relues après le déclencheur", () => {
    const s = avecObjet(base(), 0, SAC_A_MAIN); // 2/4, attaque → +1 attaque soi
    const r = attaquer(s.etat, s.uid, { type: "vitrine" });
    expect(r.etat.joueurs[1].vitrine).toBe(17); // 20 − 3 (2 de base + 1 du déclencheur)
    expect(trouverObjet(r.etat, s.uid)?.objet.attaque).toBe(3);
  });

  it("casse → pioche pour le propriétaire du cassé", () => {
    let s = avecObjet(base(), 0, SCIE);
    const scie = s.uid;
    s = avecObjet(s.etat, 1, STYLO_PLUME);
    const mainAvant = s.etat.joueurs[1].main.length;
    const r = attaquer(s.etat, scie, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)).toBeNull();
    expect(r.etat.joueurs[1].main).toHaveLength(mainAvant + 1);
  });

  it("blesse → 2 à la vitrine adverse", () => {
    let s = avecObjet(base(), 0, MARTEAU);
    const marteau = s.uid;
    s = avecObjet(s.etat, 1, FLIPPER);
    const r = attaquer(s.etat, marteau, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[0].vitrine).toBe(18);
  });

  it("simultanéité : un attaquant tombé à ≤ 0 PV sous la riposte déclenche quand même son blesse", () => {
    let s = avecObjet(base(), 0, FLIPPER); // 3/6, blesse : 2 à la vitrine adverse
    s = {
      etat: { ...s.etat, joueurs: [{ ...s.etat.joueurs[0], etal: s.etat.joueurs[0].etal.map((o) => ({ ...o, pv: 1 })) }, s.etat.joueurs[1]] },
      uid: s.uid,
    };
    const flipper = s.uid;
    s = avecObjet(s.etat, 1, SCIE); // 5/4, la riposte (5) tue le flipper (1 PV)
    const r = attaquer(s.etat, flipper, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, flipper)).toBeNull(); // le flipper casse
    expect(r.etat.joueurs[1].vitrine).toBe(18); // son blesse s'est quand même déclenché
  });

  it("pose → retour en main : l'objet adverse choisi revient dans la main de son propriétaire", () => {
    const s = avecObjet(avecMain(base(), 0, [SMOKING], 5), 1, SCIE);
    const r = poser(s.etat, SMOKING, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[1].main).toContain(SCIE);
  });

  it("pose → retour en main : main pleine, l'objet part en casse plutôt qu'en main", () => {
    let e = avecMain(base(), 0, [SMOKING], 5);
    e = avecMain(e, 1, Array(MAIN_MAX).fill(VASE_DECO));
    const s = avecObjet(e, 1, SCIE);
    const r = poser(s.etat, SMOKING, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[1].main).toHaveLength(MAIN_MAX);
    expect(r.etat.joueurs[1].casse).toContain(SCIE);
  });

  it("légendaire à deux actions : 1 dégât à tous les objets adverses puis pioche", () => {
    let s = avecObjet(avecMain(base(), 0, [BABYFOOT], 5), 1, VASE_DECO);
    s = avecObjet(s.etat, 1, MARTEAU);
    const r = poser(s.etat, BABYFOOT);
    expect(r.etat.joueurs[1].etal).toHaveLength(1); // le marteau (1 PV) casse
    expect(r.etat.joueurs[0].main).toHaveLength(1);
  });

  it("dégâts d'effet : Solide s'applique, pas la roue (malgré la domination Objets d'art → Bricolage)", () => {
    // BOITE_OUTILS (Bricolage, 4 PV, sans mot-clé) discrimine vraiment le bonus de roue : à 2
    // dégâts (sans bonus) il reste à 2 PV, à 3 (si le bonus s'appliquait à tort) il tomberait à 1.
    let s = avecObjet(avecMain(base(), 0, [SCULPTURE], 5), 1, TERRE_CUITE);
    const terreCuite = s.uid;
    s = avecObjet(s.etat, 1, BOITE_OUTILS);
    const boiteOutils = s.uid;
    const r = poser(s.etat, SCULPTURE);
    expect(trouverObjet(r.etat, terreCuite)?.objet.pv).toBe(1); // 2 − 1 Solide
    expect(trouverObjet(r.etat, boiteOutils)?.objet.pv).toBe(2); // 4 − 2, pas 4 − 3
  });

  it("chaîne de casses : un objet cassé par un effet de casse déclenche à son tour", () => {
    let s = avecObjet(avecMain(base(), 0, [ENCRIER_ARGENT], 5), 1, BOITE_MANUF); // 4/4, casse → 2 à tous
    const boite = s.uid;
    s = { etat: { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], etal: s.etat.joueurs[1].etal.map((o) => ({ ...o, pv: 2 })) }] }, uid: boite };
    s = avecObjet(s.etat, 0, STYLO_PLUME); // 2/2, casse → pioche
    const mainAvant = s.etat.joueurs[0].main.length - 1; // moins le moustachu posé
    const r = poser(s.etat, ENCRIER_ARGENT, { type: "objet", uid: boite });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[0].etal.map((o) => o.id)).toEqual([ENCRIER_ARGENT]); // le conte (2 PV) a pris 2
    expect(r.etat.joueurs[0].main).toHaveLength(mainAvant + 1);
  });
});

describe("blesserObjet", () => {
  it("Solide ramène le dégât réel à 0 : PV inchangés (aucune carte ne cumule Solide et blesse, donc pas de preuve directe que blesse ne se déclenche pas — seul le PV observable est vérifié ici)", () => {
    const s = avecObjet(base(), 0, TERRE_CUITE); // 1/2 Solide
    blesserObjet(s.etat, s.uid, 1);
    expect(trouverObjet(s.etat, s.uid)?.objet.pv).toBe(2);
  });
});

describe("appliquerAction (unitaire)", () => {
  it("volMotCle : vole le premier mot-clé persistant de la cible", () => {
    let s = avecObjet(base(), 1, TABOURET); // Barrage
    const tabouret = s.uid;
    s = avecObjet(s.etat, 0, VASE_DECO);
    appliquerAction(s.etat, 0, s.uid, { type: "volMotCle" }, { type: "objet", uid: tabouret });
    expect(trouverObjet(s.etat, s.uid)?.objet.motsCles).toContain("barrage");
    expect(trouverObjet(s.etat, tabouret)?.objet.motsCles).not.toContain("barrage");
  });

  it("energie : augmente l'énergie du joueur ciblé", () => {
    const e = base();
    const avant = e.joueurs[0].energie;
    appliquerAction(e, 0, 0, { type: "energie", valeur: 2 });
    expect(e.joueurs[0].energie).toBe(avant + 2);
  });
});

describe("garde de récursion blesse → blesse", () => {
  it("un ping-pong blesse → tousObjetsAdverses → blesse construit à la main termine (garde à 8)", () => {
    // La garde de données (cartesDuel.test.ts) interdit ce texte à toute vraie carte du jeu :
    // deux cartes de test injectées le temps du test reproduisent la boucle que la garde de
    // profondeur (effets.ts declencher) doit couper.
    const PING = "carte.__test_ping__";
    const PONG = "carte.__test_pong__";
    const texteBoucle = {
      type: "effet" as const,
      declencheur: "blesse" as const,
      actions: [{ type: "degats" as const, cible: "tousObjetsAdverses" as const, valeur: 1 }],
      prix: 1,
    };
    CARTES_DUEL[PING] = { cout: 1, attaque: 1, pv: 3, texte: texteBoucle };
    CARTES_DUEL[PONG] = { cout: 1, attaque: 1, pv: 3, texte: texteBoucle };
    try {
      let s = avecObjet(base(), 0, PING);
      const a = s.uid;
      s = avecObjet(s.etat, 1, PONG);
      appliquerAction(s.etat, 0, a, { type: "degats", cible: "tousObjetsAdverses", valeur: 1 });
      expect(s.etat.journal).toContain("garde blesse");
    } finally {
      delete CARTES_DUEL[PING];
      delete CARTES_DUEL[PONG];
    }
  });
});
