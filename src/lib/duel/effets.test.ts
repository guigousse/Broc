import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { attaquer, finirTour, nouvellePartie, poser } from "@/lib/duel/partie";
import { MAIN_MAX, trouverObjet } from "@/lib/duel/etat";
import { appliquerAction, blesserObjet, cibleRequise } from "@/lib/duel/effets";
import { avecMain, avecObjet, DECK_A, DECK_B } from "@/lib/duel/__test__/helpers";
import { statsDuel } from "@/data/duel/cartesDuel";

const base = () => nouvellePartie(DECK_A, DECK_B, creerRng(1));
const LOUPS = "carte.vinyle_des_loups_des_steppes_bark_to_be_free"; // Cri pioche
const TITOU = "carte.les_aventures_de_titou_cap_sur_la_lune"; // Cri 1 dégât (Livres & Papeterie)
const SERVICE = "carte.service_the_faience"; // Cri +2 PV
const AQUARELLE = "carte.aquarelle_paysage_anonyme"; // 1/2
const PLAYBOX = "carte.playbox_pocket"; // 2/2 (Jeux & Loisirs, dominé par Livres & Papeterie)
const MARTEAU = "carte.marteau_menuisier"; // 2/1 (Bricolage, dominé par Objets d'art)
const TEST_PRESSING = "carte.test_pressing_des_trolling_sons"; // pose : alliés +1 att
const VIOLON = "carte.violon_de_maitre_cremonais_1715"; // debutTour : Musique +1 att
const GUITARE = "carte.guitare_classique_ancienne"; // attaque : pioche 1
const CONTE = "carte.conte_de_l_aviateur_et_de_l_enfant_roi_edition"; // casse : pioche 1
const FLIPPER = "carte.flipper_a_plateau_annees_60"; // blesse : 2 à la vitrine adverse
const BROCHE = "carte.broche_emaillee_artdeco"; // pose : retour en main
const STADIUM = "carte.cartouche_stadium_events"; // pose : 1 à tous + pioche 1
const DESSIN = "carte.dessin_surrealiste_aux_montres_molles_signe"; // pose : 2 à tous (Objets d'art)
const MOUSTACHU = "carte.le_petit_moustachu_edition_originale_1961"; // pose : 2 à un objet
const TERRE_CUITE = "carte.terre_cuite_buste"; // 1/2 Solide (Objets d'art)
const BOITE_MANUF = "carte.boite_d_outils_de_manufacture_signee"; // casse : 2 à tous
const SCIE = "carte.scie_egoine_de_charpentier"; // 5/4
const VESTE = "carte.veste_jean_delavee"; // 2/2 Ruse
const SAC_A_MAIN = "carte.sac_a_main_talaria"; // 2/4, attaque : +1 attaque soi
const TABOURET = "carte.tabouret_bois_patine"; // 2/4 Barrage

describe("Cri", () => {
  it("pioche : +1 carte en main à la pose", () => {
    const e = avecMain(base(), 0, [LOUPS], 5);
    const r = poser(e, LOUPS);
    expect(r.etat.joueurs[0].main).toHaveLength(1);
    expect(r.etat.joueurs[0].deck).toHaveLength(e.joueurs[0].deck.length - 1);
  });

  it("1 dégât à l'objet adverse choisi (sans bonus de roue, malgré la domination) ; s'éteint sans cible", () => {
    // TITOU (Livres & Papeterie) domine PLAYBOX (Jeux & Loisirs) : si la roue s'appliquait, 2
    // dégâts casseraient PLAYBOX (2 PV) ; le Cri ne fait que 1, il survit à 1 PV.
    let s = avecObjet(avecMain(base(), 0, [TITOU], 5), 1, PLAYBOX);
    const r = poser(s.etat, TITOU, { type: "objet", uid: s.uid });
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(1);
    expect(poser(avecMain(base(), 0, [TITOU], 5), TITOU).ok).toBe(true);
  });

  it("+2 PV à la vitrine, plafonnée à 20", () => {
    let e = avecMain(base(), 0, [SERVICE], 5);
    e = { ...e, joueurs: [{ ...e.joueurs[0], vitrine: 19 }, e.joueurs[1]] };
    expect(poser(e, SERVICE).etat.joueurs[0].vitrine).toBe(20);
  });

  it("une action à choix exige une cible quand il y en a une de possible", () => {
    const s = avecObjet(avecMain(base(), 0, [TITOU], 5), 1, AQUARELLE);
    expect(cibleRequise(TITOU)).toBe(true);
    expect(poser(s.etat, TITOU).ok).toBe(false);
  });

  it("une action à choix s'efface sans exiger de cible quand le seul objet adverse est sous Ruse", () => {
    let e = base(); // tour de J0
    e = finirTour(e).etat; // tour de J1
    const s = avecObjet(e, 1, VESTE, e.tour); // VESTE posée « maintenant » par J1, sous Ruse
    e = finirTour(s.etat).etat; // tour adverse qui suit : VESTE toujours sous Ruse
    e = avecMain(e, 0, [TITOU], 5);
    const r = poser(e, TITOU);
    expect(r.ok).toBe(true);
    expect(trouverObjet(r.etat, s.uid)?.objet.pv).toBe(2); // aucun dégât porté
  });
});

describe("effets uniques", () => {
  it("pose → gain alliés : tous les objets du propriétaire, lui compris", () => {
    const s = avecObjet(avecMain(base(), 0, [TEST_PRESSING], 5), 0, MARTEAU);
    const r = poser(s.etat, TEST_PRESSING);
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
    s = avecObjet(s.etat, 1, CONTE);
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
    const s = avecObjet(avecMain(base(), 0, [BROCHE], 5), 1, SCIE);
    const r = poser(s.etat, BROCHE, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[1].main).toContain(SCIE);
  });

  it("pose → retour en main : main pleine, l'objet part en casse plutôt qu'en main", () => {
    let e = avecMain(base(), 0, [BROCHE], 5);
    e = avecMain(e, 1, Array(MAIN_MAX).fill(AQUARELLE));
    const s = avecObjet(e, 1, SCIE);
    const r = poser(s.etat, BROCHE, { type: "objet", uid: s.uid });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[1].main).toHaveLength(MAIN_MAX);
    expect(r.etat.joueurs[1].casse).toContain(SCIE);
  });

  it("légendaire à deux actions : 1 dégât à tous les objets adverses puis pioche", () => {
    let s = avecObjet(avecMain(base(), 0, [STADIUM], 5), 1, AQUARELLE);
    s = avecObjet(s.etat, 1, MARTEAU);
    const r = poser(s.etat, STADIUM);
    expect(r.etat.joueurs[1].etal).toHaveLength(1); // le marteau (1 PV) casse
    expect(r.etat.joueurs[0].main).toHaveLength(1);
  });

  it("dégâts d'effet : Solide s'applique, pas la roue (malgré la domination Objets d'art → Bricolage)", () => {
    let s = avecObjet(avecMain(base(), 0, [DESSIN], 5), 1, TERRE_CUITE);
    const terreCuite = s.uid;
    s = avecObjet(s.etat, 1, MARTEAU);
    const r = poser(s.etat, DESSIN);
    expect(trouverObjet(r.etat, terreCuite)?.objet.pv).toBe(1); // 2 − 1 Solide
    expect(trouverObjet(r.etat, s.uid)).toBeNull(); // le marteau (Bricolage, non Solide) casse sous 2, pas 3
  });

  it("chaîne de casses : un objet cassé par un effet de casse déclenche à son tour", () => {
    let s = avecObjet(avecMain(base(), 0, [MOUSTACHU], 5), 1, BOITE_MANUF); // 4/4, casse → 2 à tous
    const boite = s.uid;
    s = { etat: { ...s.etat, joueurs: [s.etat.joueurs[0], { ...s.etat.joueurs[1], etal: s.etat.joueurs[1].etal.map((o) => ({ ...o, pv: 2 })) }] }, uid: boite };
    s = avecObjet(s.etat, 0, CONTE); // 2/2, casse → pioche
    const mainAvant = s.etat.joueurs[0].main.length - 1; // moins le moustachu posé
    const r = poser(s.etat, MOUSTACHU, { type: "objet", uid: boite });
    expect(r.etat.joueurs[1].etal).toHaveLength(0);
    expect(r.etat.joueurs[0].etal.map((o) => o.id)).toEqual([MOUSTACHU]); // le conte (2 PV) a pris 2
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
    s = avecObjet(s.etat, 0, AQUARELLE);
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
