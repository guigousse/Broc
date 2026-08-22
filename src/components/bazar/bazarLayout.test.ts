import { describe, expect, it } from "vitest";
import { BAZAR_LAYOUT, CLES_ARTICLES, CLES_LOTS, type BazarObjetKey } from "./bazarLayout";
import { qgPct, QG_LAYOUT } from "@/components/mobile/qg/layout";
import { CHAT_BALADEUR_ORDER } from "@/lib/chatBaladeur";

/**
 * Vrai si `[left, left+width]` tient ENTIÈREMENT dans une seule des trois
 * zones de 100 vw.
 *
 * L'arête droite est ramenée à sa zone par `ceil(x/100) - 1` et non par
 * `floor(x/100)` : une arête posée exactement sur 100, 200 ou 300 appartient
 * ainsi à la zone de GAUCHE — l'objet y est collé au bord, il n'est pas à
 * cheval, et `floor` le déclarait fautif à tort.
 *
 * L'arrondi au millionième absorbe les miettes de virgule flottante :
 * 177,9 + 22,1 vaut 200,00000000000003 en machine, ce qui suffirait à faire
 * échouer une position pourtant écrite à ras de la frontière.
 */
function tientDansUneZone({ left, width }: { left: number; width: number }): boolean {
  const droite = Math.round((left + width) * 1e6) / 1e6;
  return Math.floor(left / 100) === Math.ceil(droite / 100) - 1;
}

describe("BAZAR_LAYOUT", () => {
  it("porte les six cases de l'étagère et les quatre emplacements du décor", () => {
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    expect(cles.sort()).toEqual(
      [
        "case1", "case2", "case3",
        "case4", "case5", "case6",
        "borne", "sortie", "table", "vendeur",
      ].sort(),
    );
  });

  it("ne partage aucune clé avec le QG — le dictionnaire de calage est plat", () => {
    const bazar = Object.keys(BAZAR_LAYOUT.objets);
    const qg = Object.keys(QG_LAYOUT.objets);
    expect(bazar.filter((k) => qg.includes(k))).toEqual([]);
  });

  it("ne partage aucune clé avec le chat baladeur — même raison", () => {
    const bazar = Object.keys(BAZAR_LAYOUT.objets);
    const chat = CHAT_BALADEUR_ORDER as readonly string[];
    expect(bazar.filter((k) => chat.includes(k))).toEqual([]);
  });

  it("désigne la planche du bas pour les lots et celle du haut pour les trois objets", () => {
    expect(CLES_LOTS).toEqual(["case4", "case5", "case6"]);
    expect(CLES_ARTICLES).toEqual(["case1", "case2", "case3"]);
  });

  // L'ordre des clés EST l'ordre des index de `EtalBazar.articles`, et le prix
  // monte le long de la planche : une permutation ici mettrait la pièce de
  // caractère à la place de la trouvaille modeste, sans qu'aucun autre test ne
  // s'en aperçoive.
  //
  // La hauteur est vérifiée À UNE UNITÉ PRÈS, et non à l'identique, alors que
  // l'intention EST une hauteur commune : les trois reposent sur une seule
  // planche peinte. La tolérance absorbe les dixièmes qu'un calage à la souris
  // laisse derrière lui, sans jamais laisser un objet dériver sur l'autre
  // planche — c'est ça, l'erreur à attraper, et elle vaut dix unités.
  it("les trois objets sont sur la MÊME planche, de gauche à droite", () => {
    const cases = CLES_ARTICLES.map((c) => BAZAR_LAYOUT.objets[c]);
    for (const c of cases) expect(Math.abs(c.bottom - cases[0].bottom)).toBeLessThan(1);
    for (let i = 1; i < cases.length; i++) {
      expect(cases[i].left).toBeGreaterThan(cases[i - 1].left);
    }
  });

  it("utilise le même repère que le QG (300vw), sinon l'outil de calage ment", () => {
    // Le repère n'est PAS redéclaré côté Bazar : `qgPct` est la seule voie de
    // conversion, et elle divise par `QG_LAYOUT.panoramaWidth`.
    expect(QG_LAYOUT.panoramaWidth).toBe(300);
    expect(qgPct(150)).toBe(50);
    expect("panoramaWidth" in BAZAR_LAYOUT).toBe(false);
  });

  it("range la grille de gauche à droite et de haut en bas", () => {
    const o = BAZAR_LAYOUT.objets;
    // Deux planches : même ordre horizontal sur chacune.
    for (const [g, c, d] of [
      ["case1", "case2", "case3"],
      ["case4", "case5", "case6"],
    ] as const) {
      expect(o[g].left).toBeLessThan(o[c].left);
      expect(o[c].left).toBeLessThan(o[d].left);
    }
    // La planche du haut est plus haute (bottom décroît vers le bas).
    expect(o.case1.bottom).toBeGreaterThan(o.case4.bottom);
  });

  it("garde CHAQUE emplacement entier dans une seule zone de swipe", () => {
    // Trois zones de 100vw : [0,100] arcade, [100,200] comptoir, [200,300]
    // antiquités. Un objet à cheval sur une frontière est coupé en deux par le
    // snap. Le garde couvre TOUTES les clés (pas seulement les cases) : c'est
    // la passe de calage à la souris qui va réécrire ces nombres à la main,
    // et rien d'autre ne la rattraperait.
    const cles = Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[];
    for (const cle of cles) {
      const c = BAZAR_LAYOUT.objets[cle];
      expect({ cle, tient: tientDansUneZone(c) }).toEqual({ cle, tient: true });
      expect(c.width).toBeGreaterThan(0);
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.left + c.width).toBeLessThanOrEqual(300);
    }
  });

  it("une arête posée pile sur une frontière est légale, un vrai chevauchement non", () => {
    // Le garde ci-dessus doit dire NON à ce qui est coupé en deux, et OUI à
    // ce qui est simplement collé au bord de sa zone. Un objet calé à ras de
    // la frontière est une position parfaitement jouable : la refuser
    // enverrait Guillaume chasser un bug qui n'existe pas, en pleine passe de
    // calage à la main.
    expect(tientDansUneZone({ left: 178, width: 22 })).toBe(true); // finit pile sur 200
    expect(tientDansUneZone({ left: 200, width: 22 })).toBe(true); // part pile de 200
    expect(tientDansUneZone({ left: 78, width: 22 })).toBe(true); // finit pile sur 100
    expect(tientDansUneZone({ left: 195, width: 10 })).toBe(false); // 195 → 205, à cheval
    expect(tientDansUneZone({ left: 90, width: 30 })).toBe(false); // 90 → 120, à cheval
  });

  it("ne pose jamais deux emplacements l'un sur l'autre sur la même planche", () => {
    // Remplace un ancien test sans mordant (`cases.length <= utilisees.size * 2`,
    // soit 6 ≤ 8 : toujours vrai). Ce qui compte vraiment après le calage
    // manuel, c'est que deux articles d'une même planche ne se superposent pas.
    const cases = (Object.keys(BAZAR_LAYOUT.objets) as BazarObjetKey[]).filter((k) =>
      k.startsWith("case"),
    );
    for (const a of cases) {
      for (const b of cases) {
        if (a >= b) continue;
        const ca = BAZAR_LAYOUT.objets[a];
        const cb = BAZAR_LAYOUT.objets[b];
        if (ca.bottom !== cb.bottom) continue;
        const chevauche = ca.left < cb.left + cb.width && cb.left < ca.left + ca.width;
        expect({ paire: `${a}/${b}`, chevauche }).toEqual({ paire: `${a}/${b}`, chevauche: false });
      }
    }
  });

  // ── La zone ne suffit pas : ce qui compte, c'est la FENÊTRE VISIBLE ──────
  //
  // Tenir dans les 100 vw de sa zone ne garantit PAS d'être vu en entier. La
  // scène est dimensionnée par sa hauteur : sa largeur mesure 338 vw sur le
  // téléphone de référence (393 px, mesuré le 2026-08-20), donc un écran n'en
  // montre que 300 × 100/338 ≈ 88,8 unités. Le snap centre la zone arcade sur
  // 50 → la fenêtre va de ~5,6 à ~94,4, pas de 0 à 100.
  //
  // La borne est le seul objet auquel ce garde s'applique : c'est une pièce de
  // décor haute et large, elle ne se lit que d'un bloc. Les autres clés ne
  // sont pas rattrapées ici — `sortie` déborde de 3,6 unités par construction
  // (le montant droit de la porte fuit vers le bord de l'image, et le voir
  // coupé est exactement ce que la perspective raconte).
  const FENETRE_UNITES = (300 * 100) / 338;

  /**
   * Tolérance, en unités. 338 vw n'est pas une constante du code mais une
   * MESURE, et elle a sa dispersion : 338,1 vw sur un écran de 393 px, 337,9
   * sur un de 375, 346 sur un Android de 360. Serrer la borne au millième
   * ferait échouer un calage qui dépasse de 0,02 unité, soit 0,09 px — un
   * faux positif qui enverrait Guillaume corriger du vide. Une demi-unité
   * vaut ~2 px : invisible, là où la coupe que ce garde existe pour attraper
   * en faisait 17.
   */
  const TOLERANCE_UNITES = 0.5;

  it("montre la borne d'arcade EN ENTIER quand la zone arcade est centrée", () => {
    const centre = 300 / 6;
    const gauche = centre - FENETRE_UNITES / 2 - TOLERANCE_UNITES;
    const droite = centre + FENETRE_UNITES / 2 + TOLERANCE_UNITES;
    const borne = BAZAR_LAYOUT.objets.borne;
    expect(borne.left).toBeGreaterThanOrEqual(gauche);
    expect(borne.left + borne.width).toBeLessThanOrEqual(droite);
  });

  it("pose la borne sur le pan de mur nu, devant la plinthe et avant le comptoir", () => {
    // Bord mesuré sur `fond-bazar.webp` (2752 px pour 300 unités) : le
    // comptoir commence à ~104. Rien ne garde le bord GAUCHE, et c'est
    // délibéré — la borne chevauche le montant droit de la bibliothèque
    // (angle à ~66), seul moyen de la montrer entière à sa taille réglée.
    const borne = BAZAR_LAYOUT.objets.borne;
    expect(borne.left + borne.width).toBeLessThanOrEqual(104);
    // Debout sur le plancher, devant la plinthe (~25 %) et non dessus : une
    // borne a de la profondeur, son pied avant descend sous la ligne du mur.
    expect(borne.bottom).toBeLessThan(25);
    expect(borne.bottom).toBeGreaterThan(15);
  });

  it("les emplacements que la scène désigne existent bel et bien", () => {
    for (const cle of [...CLES_LOTS, ...CLES_ARTICLES]) {
      expect(BAZAR_LAYOUT.objets[cle]).toBeDefined();
    }
  });
});
