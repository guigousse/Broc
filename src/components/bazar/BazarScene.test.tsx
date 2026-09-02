// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { BazarScene, ZONES_BAZAR } from "./BazarScene";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";
import { ETAT_ARTICLE_BAZAR } from "@/lib/bazar/achat";
import { etoileCount } from "@/lib/etat";
import { ECLAT_PRISTIN } from "@/components/ui/ItemSticker";
import { initAlbums } from "@/lib/albums";
import type { EtalBazar } from "@/types/game";

afterEach(cleanup);

const ETAL: EtalBazar = {
  cleSemaine: "2026-W34",
  lotsPieces: [{ categorie: "Mode", quantite: 5, prix: 1 }],
  // L'étagère du haut, une gamme par case (cf. `GAMMES_BAZAR`) : trouvaille
  // modeste, vitrine de la semaine, pièce de caractère.
  articles: [
    { templateId: "mus.harmonica_chromatique_de_bluesman", valeurBase: 50, prix: 2 },
    { templateId: "jx.jeu_magnatimmo_annees_80", valeurBase: 200, prix: 8 },
    { templateId: "jx.flipper_a_plateau_annees_60", valeurBase: 750, prix: 30 },
  ],
};

/**
 * L'étal après l'achat de la case `index`. L'article n'est plus EFFACÉ mais
 * marqué vendu (2026-08-26) : il reste sur l'étagère pour s'y montrer en noir
 * et blanc sous son cachet.
 */
function vendu(index: number): EtalBazar {
  return {
    ...ETAL,
    articles: ETAL.articles.map((a, i) => (i === index && a ? { ...a, vendu: true } : a)),
  };
}

/** L'étal d'une partie d'AVANT le marquage : la case est vide, sans rien à montrer. */
function sansArticle(index: number): EtalBazar {
  return { ...ETAL, articles: ETAL.articles.map((a, i) => (i === index ? null : a)) };
}

function monter(
  etal: EtalBazar = ETAL,
  jetons = 25,
  resultat: { ok: boolean; raison?: string } = { ok: true },
  onZoneIndex?: (idx: number) => void,
  albums = initAlbums(),
) {
  // Le retour n'est pas décoratif : la fiche de l'article ne se referme que
  // s'il est `ok`, et affiche sinon la raison.
  const onAcheter = vi.fn().mockReturnValue(resultat);
  const onSortir = vi.fn();
  const jeux = JEUX_ARCADE.map((templateId) => ({ templateId, trouve: false }));
  render(
    <BazarScene
      etal={etal}
      jetons={jetons}
      jeuxArcade={jeux}
      albums={albums}
      onAcheter={onAcheter}
      onSortir={onSortir}
      onZoneIndex={onZoneIndex}
    />,
  );
  return { onAcheter, onSortir };
}

describe("BazarScene", () => {
  it("a trois zones, en tiers", () => {
    expect(ZONES_BAZAR.map((z) => z.key)).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(ZONES_BAZAR.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
  });

  // On entre au Bazar PAR LA PORTE, et la porte est peinte à droite du fond
  // (`sortie` : left 270 sur 300, donc dans la zone « antiquites »). La scène
  // s'ouvrait sur le comptoir — la zone du milieu, le défaut de
  // `UnifiedPanorama` : le joueur arrivait donc au fond de la boutique sans
  // être passé devant l'entrée. `initialZone` corrige le point d'arrivée.
  it("s'ouvre sur les antiquités, la zone de la porte, et pas sur le comptoir", () => {
    const ancres: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      ancres.push(this);
    };
    try {
      monter();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
    expect(ancres).toHaveLength(1);
    expect(ancres[0].getAttribute("data-unified-zone")).toBe("antiquites");
  });

  // L'ambiance de rue du Bazar se règle sur la distance à la porte : sans ce
  // relais, la page n'a aucun moyen de savoir où le joueur se tient.
  it("relaie la zone regardée au parent, dès le montage", () => {
    const onZoneIndex = vi.fn();
    monter(ETAL, 25, { ok: true }, onZoneIndex);
    // 2 = les antiquités, la zone centrée à l'ouverture : on entre par la
    // porte de la boutique (`initialZone="antiquites"`).
    expect(onZoneIndex).toHaveBeenCalledWith(2);
  });

  /**
   * Le rectangle détouré du tenancier chevauche les cases de la planche du
   * bas : rendu APRÈS elles, il passait devant et les paquets sous son coude
   * étaient intapables (recette du 2026-09-02). L'ordre de peinture est la
   * seule chose qui l'en empêche — pas de z-index dans la scène.
   */
  it("le tenancier est peint AVANT la marchandise, qui le recouvre", () => {
    monter();
    const tenancier = screen.getByTestId("tenancier-bazar");
    const articles = document.querySelectorAll('[data-testid^="article-case"]');
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      expect(
        tenancier.compareDocumentPosition(article) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("pose l'unique lot sur la planche du bas", () => {
    monter();
    expect(screen.getByTestId("article-case4")).toBeTruthy();
  });

  // ── Le classeur de cartes et l'album de timbres (2026-08-30) ────────────
  // Ils occupent les deux cases restantes de la planche du bas : tant qu'un
  // album n'est pas acheté, la case propose l'album lui-même ; une fois
  // acheté, elle propose un paquet/une pochette de 3 pièces.
  it("cases 5 et 6 : classeur et album avant achat, paquet et pochette après", () => {
    monter(ETAL, 25, { ok: true }, undefined, initAlbums());
    expect(screen.getByRole("button", { name: /classeur de cartes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /album de timbres/i })).toBeTruthy();
    cleanup();
    const a = initAlbums();
    a.classeur.achete = true;
    a.timbres.achete = true;
    monter(ETAL, 25, { ok: true }, undefined, a);
    expect(screen.getByRole("button", { name: /paquet de 3 cartes/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /pochette de 3 timbres/i })).toBeTruthy();
  });

  it("taper le classeur ouvre la fiche et l'achat envoie { type: 'album', album: 'classeur' }", () => {
    const { onAcheter } = monter(ETAL, 25, { ok: true }, undefined, initAlbums());
    fireEvent.click(screen.getByRole("button", { name: /classeur de cartes/i }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /acheter pour 10/i }));
    expect(onAcheter).toHaveBeenCalledWith({ type: "album", album: "classeur" });
  });

  // ── Le badge de quantité quitte l'étagère (recette du 2026-08-20) ────────
  // Il vivait sous l'engrenage (`bottom: -3`), exactement là où la plaque de
  // prix est venue mordre sur l'arête basse de la case : elle le recouvrait.
  // L'auteur a tranché — sur l'étagère, un lot montre son engrenage et son
  // prix, rien d'autre ; la quantité se lit dans la fiche, à un tap.
  //
  // Ces deux assertions vont ENSEMBLE, et c'est tout le sujet : le visuel
  // disparaît, l'information reste. Un joueur non-voyant n'avait pas de badge
  // à perdre — c'est le nom accessible qu'il entend, et il doit continuer de
  // dire combien de pièces contient le lot.
  it("un lot n'affiche AUCUN badge de quantité sur l'étagère", () => {
    monter();
    const bouton = screen.getAllByRole("button", { name: /Mode/ })[0];
    // L'engrenage est un dessin : sans badge, le bouton n'a plus un seul
    // caractère de texte. C'est la trace la plus directe de l'absence du « 5 ».
    expect(bouton.textContent).toBe("");
  });

  it("… mais son nom accessible dit toujours la quantité", () => {
    monter();
    const bouton = screen.getAllByRole("button", { name: /Mode/ })[0];
    expect(bouton.getAttribute("aria-label")).toContain("5 pièces");
  });

  it("la fiche garde le badge : c'est le seul endroit où la quantité se VOIT", () => {
    monter();
    fireEvent.click(screen.getAllByRole("button", { name: /Mode/ })[0]);
    const fiche = screen.getByRole("dialog");
    // Le titre la porte en toutes lettres…
    expect(fiche.textContent).toContain("5 pièces");
    // … et l'engrenage y garde son badge chiffré.
    expect(within(fiche).getByText("5")).toBeTruthy();
  });

  it("pose l'objet de la semaine au milieu de la planche du haut", () => {
    monter();
    expect(screen.getByTestId("article-case2")).toBeTruthy();
  });

  // Depuis la recette du 2026-08-20, le tap OUVRE la fiche de l'article ;
  // l'achat se confirme sur son bouton. Deux gestes, donc, dans tous les tests
  // d'achat de cet écran.
  function acheterDansLaFiche() {
    fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
  }

  // ── L'ÉTAT AU PIED, LE PRIX DANS LA FICHE (demande du 2026-08-26) ───────
  // L'étagère montre la marchandise et son état ; le tarif attend le tap.
  it("l'objet de la semaine montre les étoiles de son état", () => {
    monter();
    expect(screen.getByTestId("etoiles-case2").querySelectorAll("svg")).toHaveLength(3);
  });

  // Le lien qui compte : l'étagère promet l'état que l'ACHAT livre réellement
  // (`acheterArticle` pose `ETAT_ARTICLE_BAZAR`). Deux constantes séparées
  // auraient dérivé en silence, et la vitrine aurait menti.
  it("l'étagère promet l'état que l'achat livre", () => {
    monter();
    const remplies = [
      ...screen.getByTestId("etoiles-case2").querySelectorAll("svg"),
    ].filter((e) => e.getAttribute("fill") !== "transparent");
    expect(remplies).toHaveLength(etoileCount(ETAT_ARTICLE_BAZAR));
  });

  // La règle de la collection vaut au Bazar : un objet pristin brille partout
  // où il se montre. La vitrine du tenancier n'en vend pas d'autres.
  it("l'objet de la semaine porte le halo du pristin", () => {
    monter();
    const img = screen
      .getByTestId("article-case2")
      .querySelector("img") as HTMLElement;
    expect(img.style.filter).toContain(ECLAT_PRISTIN);
  });

  it("un lot de pièces n'a pas d'état : son pied reste nu", () => {
    monter();
    expect(screen.queryByTestId("etoiles-case4")).toBeNull();
  });

  // Sans template, pas de rareté pour teinter les étoiles ni d'état à
  // promettre : la case montre ce qu'elle sait, et rien de plus.
  it("template inconnu : aucune étoile inventée", () => {
    const articles = [...ETAL.articles];
    articles[1] = { templateId: "zz.template_disparu", valeurBase: 200, prix: 8 };
    monter({ ...ETAL, articles });
    expect(screen.queryByTestId("etoiles-case2")).toBeNull();
  });

  it("taper un lot ouvre SA fiche, et l'achat y porte son index", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getAllByRole("button", { name: /Mode/ })[0]);
    expect(onAcheter).not.toHaveBeenCalled();
    // La fiche montre bien le lot touché, pas un autre.
    expect(screen.getByRole("dialog").textContent).toContain("Mode");
    acheterDansLaFiche();
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 0 });
  });

  it("taper un article ouvre sa fiche, et l'achat s'y confirme", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    expect(onAcheter).not.toHaveBeenCalled();
    acheterDansLaFiche();
    expect(onAcheter).toHaveBeenCalledWith({ type: "objet", index: 1 });
  });

  // Les trois cases du haut sont interchangeables du point de vue de la scène :
  // même composant, même fiche, seul l'index change. C'est ce qui garantit
  // qu'on ne peut pas acheter la case d'à côté par erreur.
  it("chaque case du haut achète SON article, pas celui du voisin", () => {
    const attendus: [RegExp, number, string][] = [
      [/Harmonica/, 0, "case1"],
      [/Magnatimmo/, 1, "case2"],
      [/Flipper/, 2, "case3"],
    ];
    for (const [nom, index, cle] of attendus) {
      cleanup();
      const { onAcheter } = monter(ETAL, 100);
      expect(screen.getByTestId(`article-${cle}`)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: nom }));
      acheterDansLaFiche();
      expect(onAcheter).toHaveBeenCalledWith({ type: "objet", index });
    }
  });

  it("la fiche se referme après l'achat", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    acheterDansLaFiche();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("achat refusé par le jeu : la fiche reste ouverte et porte la raison", () => {
    monter(ETAL, 25, { ok: false, raison: "Stockage plein" });
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    acheterDansLaFiche();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Stockage plein");
  });

  it("aucune fiche n'est ouverte tant que rien n'est tapé", () => {
    monter();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // La fiche est posée HORS du panorama : son conteneur scrolle
  // horizontalement, une fiche placée dedans voyagerait avec la scène — et la
  // couche d'objets du panorama est en `pointer-events: none`, ce qui rendrait
  // le voile insensible au tap.
  it("la fiche n'est pas un enfant du panorama", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    const fiche = screen.getByRole("dialog");
    const panorama = screen.getByRole("button", { name: /Sortir/ }).closest("div");
    expect(panorama?.contains(fiche)).toBe(false);
  });

  // L'objet de la semaine est rendu comme partout ailleurs dans le jeu : une
  // vignette découpée (contour blanc die-cut + inclinaison déterministe), pas
  // un PNG nu. Posé sur une illustration peinte, le PNG se confondait avec le
  // mur (recette du 2026-08-20).
  it("l'objet de la semaine est une vignette découpée, en vignette légère", () => {
    monter();
    const img = screen
      .getByTestId("article-case2")
      .querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    // Le contour die-cut : quatre drop-shadow blanches autour de l'alpha.
    expect(img.style.filter).toContain("#fdfaf2");
    // `thumb` : la vignette 384 px, pas le plein format — la case fait ~22
    // unités de large, décoder un 1600 px pour ça coûte de la mémoire.
    expect(img.getAttribute("src")).toBe(
      "/items/thumbs/jx.jeu_magnatimmo_annees_80.webp",
    );
    // `fill` : le sticker remplit la case carrée au lieu d'imposer sa taille.
    expect(img.style.position).toBe("absolute");
  });

  // « Les objets sont dessinés DROITS » (recette du 2026-08-20) : le sticker
  // incline chaque objet de quelques degrés par défaut, l'auteur n'en veut pas
  // dans sa boutique. Accessoire utile : une vignette droite tient exactement
  // dans son carré, là où une vignette tournée en déborde par les coins.
  it("l'objet de la semaine est posé d'aplomb, sans inclinaison", () => {
    monter();
    const vignette = screen
      .getByTestId("article-case2")
      .querySelector("img")?.parentElement as HTMLElement;
    expect(vignette.style.transform).toBe("rotate(0deg)");
  });

  // « L'objet doit toujours être visible en entier » : le bouton rognait ce
  // qui dépassait (`overflow: hidden`), et l'auteur a vu ses articles coupés.
  // Plus rien ne peut déborder, le filet n'a plus lieu d'être.
  it("la case ne rogne rien", () => {
    monter();
    const bouton = screen.getByRole("button", { name: /Magnatimmo/ });
    expect(bouton.style.overflow).toBe("");
  });

  // Exigence de l'auteur, acquise le matin même sur `ItemImage` (commit
  // 60d94db5) et reperdue au passage à la vignette : un objet posé sur une
  // étagère touche la planche par sa base. `contain` letterboxe les objets
  // larges et bas, et le vide laissé sous eux les fait flotter.
  it("l'objet de la semaine repose sur l'arête basse de sa case, il ne flotte pas", () => {
    monter();
    const img = screen
      .getByTestId("article-case2")
      .querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center bottom");
  });

  // ... mais dans la fiche, il ne repose sur rien : il est présenté seul dans
  // une carte au large, et l'ancrer en bas le collerait à son titre.
  it("dans la fiche, en revanche, l'objet est centré", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    expect(img.style.objectPosition).toBe("center");
  });

  // ── L'ARTICLE VENDU RESTE À L'ÉTAGÈRE (2026-08-26) ──────────────────────
  // Il était effacé et remplacé par une plaque « Vendu » pendue sous la case.
  // Il reste maintenant en place, en noir et blanc, sous le cachet en diagonale
  // de la chine : le joueur revoit ce qu'il a acheté, et l'étagère ne se creuse
  // pas de trous au fil de la semaine.
  it("article vendu : l'objet reste en place, grisé et tamponné", () => {
    monter(vendu(1));
    const case2 = screen.getByTestId("article-case2");
    expect(case2).toBeTruthy();
    const img = case2.querySelector("img") as HTMLElement;
    expect(img.style.filter).toContain("grayscale(1)");
    expect(within(case2).getByTestId("tampon").textContent).toBe("Vendu");
  });

  it("article vendu : la plaque pendue sous la case a disparu", () => {
    monter(vendu(1));
    expect(screen.queryByTestId("etiquette-vendu-1")).toBeNull();
  });

  it("article vendu : il n'ouvre plus de fiche", () => {
    monter(vendu(1));
    expect(screen.queryByRole("button", { name: /Magnatimmo/ })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("article vendu : les deux autres restent en vente", () => {
    monter(vendu(1));
    expect(screen.getAllByTestId("tampon")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Harmonica/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /flipper|Flipper/ })).toBeTruthy();
  });

  it("étagère entièrement vendue : trois objets tamponnés, aucune commande", () => {
    monter({
      ...ETAL,
      articles: ETAL.articles.map((a) => (a ? { ...a, vendu: true } : a)),
    });
    expect(screen.getAllByTestId("tampon")).toHaveLength(3);
    for (const cle of ["case1", "case2", "case3"]) {
      expect(screen.getByTestId(`article-${cle}`)).toBeTruthy();
    }
  });

  /**
   * Les parties d'AVANT le marquage portent un `null` à la place de l'article
   * acheté : il n'y a alors rien à montrer, et la case reste simplement vide
   * jusqu'au renouvellement du lundi. Pas de migration pour ça — l'étal se
   * renouvelle de lui-même.
   */
  it("case vide d'une ancienne partie : rien, et rien qui plante", () => {
    monter(sansArticle(1));
    expect(screen.queryByTestId("article-case2")).toBeNull();
    expect(screen.queryByTestId("tampon")).toBeNull();
    expect(screen.getByTestId("article-case1")).toBeTruthy();
  });

  describe("le tenancier derrière le comptoir", () => {
    it("est posé à la coordonnée `vendeur` du layout, via le hook de calage", () => {
      monter();
      const el = screen.getByTestId("tenancier-bazar");
      const coord = BAZAR_LAYOUT.objets.vendeur;
      expect(parseFloat(el.style.left)).toBeCloseTo(qgPct(coord.left), 5);
      expect(parseFloat(el.style.width)).toBeCloseTo(qgPct(coord.width), 5);
      expect(parseFloat(el.style.bottom)).toBeCloseTo(coord.bottom, 5);
    });

    // Son bas se confond avec l'arête arrière du plateau : c'est ce qui le
    // met DERRIÈRE le comptoir et non posé dessus. Une hauteur imposée
    // écraserait ou étirerait le buste — la largeur commande, la hauteur suit.
    it("laisse sa hauteur suivre la largeur, sans jamais être étiré", () => {
      monter();
      const img = screen.getByTestId("tenancier-bazar").querySelector("img") as HTMLImageElement;
      expect(img.style.width).toBe("100%");
      expect(img.style.height).toBe("auto");
      expect(img.getAttribute("src")).toBe("/bazar/vendeur-bazar.webp");
    });

    /**
     * Il a longtemps été décor — muet et sourd aux taps — « faute d'avoir une
     * réplique ». Il en a depuis le 2026-08-26 : le tenancier est un bouton
     * nommé qui ouvre sa bulle. Le DESSIN, lui, reste muet : c'est le bouton
     * qui porte le nom, pas l'image qu'il contient.
     */
    it("répond au tap et porte son nom, le dessin restant muet", () => {
      monter();
      const el = screen.getByTestId("tenancier-bazar");
      expect(el.tagName).toBe("BUTTON");
      expect(el.getAttribute("aria-label")).toBe("Parler au tenancier");
      expect(el.style.pointerEvents).toBe("auto");
      expect((el.querySelector("img") as HTMLImageElement).getAttribute("alt")).toBe("");
    });

    it("le tap ouvre sa bulle, qui finit par le calendrier de l'étal", () => {
      monter();
      fireEvent.click(screen.getByTestId("tenancier-bazar"));
      fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
      expect(screen.getByText(/prochain arrivage/i)).toBeTruthy();
    });
  });

  it("la porte fait sortir", () => {
    const { onSortir } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Sortir/ }));
    expect(onSortir).toHaveBeenCalledTimes(1);
  });

  it("la borne et la table ne répondent pas", () => {
    monter();
    expect(screen.queryByTestId("article-borne")).toBeNull();
    expect(screen.queryByTestId("article-table")).toBeNull();
  });

  // La spec (§4.4) demandait la désaturation des articles hors de portée ;
  // l'auteur l'a REFUSÉE à la recette du 2026-08-20 (vue sur téléphone) : la
  // marchandise reste en couleur, quoi qu'il arrive, et c'est le prix barré
  // qui dit l'inaccessibilité. Le test garde le cas « bourse à 0 » — il
  // atteste maintenant ce que la conception dit, pas son contraire.
  it("bourse à 0 : les quatre articles restent en couleur, et aucun prix ne s'affiche", () => {
    const { onAcheter } = monter(ETAL, 0);
    // case1-3 : les trois articles de l'étagère du haut. case4 : l'unique lot
    // de pièces (`NB_LOTS_PIECES = 1` depuis 2026-08-30 — case5/case6 ne
    // rendent plus rien).
    for (const cle of ["case1", "case2", "case3", "case4"]) {
      const article = screen.getByTestId(`article-${cle}`);
      expect(article.style.filter).toBe("");
    }
    // Le prix a quitté l'étagère le 2026-08-26 : plus de plaque, ni allumée ni
    // éteinte, et donc plus rien qui dise l'inaccessibilité AVANT le tap.
    // C'était le prix à payer pour une vitrine muette, accepté en connaissance
    // de cause — la fiche, elle, dit toujours le manque.
    expect(screen.queryByRole("img", { name: /Bazarcoin/ })).toBeNull();
    // Et taper n'achète toujours rien : la fiche s'ouvre, son bouton est
    // éteint, et il ne se passe rien de plus — le « il vous manque N » a été
    // retiré le 2026-08-26, le bouton éteint porte seul le refus.
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    const acheter = screen.getByRole("button", { name: /^Acheter pour/ });
    expect(acheter.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(acheter);
    expect(onAcheter).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  // Revue du 2026-08-20 : la scène testait `etal.vitrine && template`. Un
  // templateId retiré du catalogue annonçait « Vendu — de retour lundi » sur
  // un objet pourtant en vente, et le rendait inachetable.
  it("template inconnu : l'article reste en vente, sous son identifiant brut", () => {
    const articles = [...ETAL.articles];
    articles[1] = { templateId: "zz.template_disparu", valeurBase: 200, prix: 8 };
    const { onAcheter } = monter({ ...ETAL, articles });
    expect(screen.queryByText(/Vendu/)).toBeNull();
    const bouton = screen.getByRole("button", { name: "zz.template_disparu" });
    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole("button", { name: /^Acheter pour/ }));
    expect(onAcheter).toHaveBeenCalledWith({ type: "objet", index: 1 });
  });

  it("la sortie est posée à la coordonnée du layout, via le hook de calage", () => {
    monter();
    const porte = screen.getByRole("button", { name: /Sortir/ }) as HTMLElement;
    expect(porte.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.left)}%`);
    expect(porte.style.width).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.width)}%`);
  });

  // ── La borne d'arcade ────────────────────────────────────────────────────
  //
  // Pièce de DÉCOR, pas encore un point d'entrée : le chantier ⑤ lui donnera
  // son jeu. En attendant elle meuble le coin arcade, qui sans elle n'est
  // qu'une bibliothèque et un pan de mur vide — et son nom de zone promet
  // autre chose.
  it("plante la borne d'arcade dans le coin gauche, aux coordonnées du dictionnaire", () => {
    monter();
    const borne = screen.getByTestId("borne-arcade");
    const c = BAZAR_LAYOUT.objets.borne;
    expect(borne.style.left).toBe(`${qgPct(c.left)}%`);
    expect(borne.style.bottom).toBe(`${c.bottom}%`);
    expect(borne.style.width).toBe(`${qgPct(c.width)}%`);
  });

  it("la borne garde son image muette : c'est le bouton qui porte le nom", () => {
    monter();
    const img = screen.getByTestId("borne-arcade").querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/bazar/borne-arcade.webp");
    expect(img.getAttribute("alt")).toBe("");
  });

  it("la borne d'arcade est un bouton nommé, et non plus une image muette", () => {
    monter();
    expect(screen.getByRole("button", { name: "Voir la borne d'arcade" })).toBeTruthy();
  });

  it("le tap sur la borne ouvre son plein écran", () => {
    monter();
    expect(screen.queryByRole("dialog")).toBe(null);
    fireEvent.click(screen.getByRole("button", { name: "Voir la borne d'arcade" }));
    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe("Borne d'arcade");
  });

  // Même règle que la fiche d'article : un dialogue ne vit pas DANS le
  // panorama, qui défile sous lui.
  it("le plein écran de la borne est rendu hors du panorama", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Voir la borne d'arcade" }));
    const dialogue = screen.getByRole("dialog");
    const panorama = screen.getByRole("button", { name: /Sortir/ }).closest("div");
    expect(panorama?.contains(dialogue)).toBe(false);
  });

  // Sans ombre, une image détourée posée sur un plancher peint FLOTTE : rien
  // ne dit où elle touche le sol. L'ombre suit l'alpha (`drop-shadow`) plutôt
  // qu'une ellipse dessinée sous elle — la base d'une borne est un
  // quadrilatère en fuite, pas un disque.
  it("la borne porte une ombre de contact, sinon elle flotte", () => {
    monter();
    const img = screen.getByTestId("borne-arcade").querySelector("img") as HTMLImageElement;
    expect(img.style.filter).toContain("drop-shadow");
  });
});
