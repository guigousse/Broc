// @vitest-environment jsdom
/**
 * `MobileHeader` — la puce XP ne doit jamais faire sortir d'une session
 * (chinage/vitrine) par mistap, ni deep-linker vers l'écran Compétences
 * avant que celui-ci ne soit ouvert (N0). Mêmes mocks que
 * `LevelUpOverlay.test.tsx` : useGame()/useGameActions() + next/navigation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MobileHeader } from "./MobileHeader";
import {
  degelerJetonsAffichage,
  degelerXpAffichage,
  gelerJetonsAffichage,
  gelerXpAffichage,
} from "@/lib/affichageGele";

afterEach(() => {
  degelerXpAffichage();
  cleanup();
});

let mockState: Record<string, unknown> | null = null;
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState }),
  useGameActions: () => ({ tempsConfiance: () => Date.now() }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function etat(niveau: number, energie = 5) {
  return {
    energie,
    energieDerniereMaj: Date.now(),
    brocanteur: { niveau, xp: 0, pointsDisponibles: 0 },
  };
}

/** Le `<span>` qui porte le numérateur de la jauge (« 3 » dans « 3/5 »). */
function numerateurEnergie() {
  const jauge = document.querySelector("[data-fly-target='energie-header']");
  return jauge!.querySelector("span > span") as HTMLElement;
}

describe("MobileHeader — puce XP", () => {
  it("en session (route /chiner/…) : la puce est un span, pas un lien", () => {
    mockState = etat(3);
    mockPathname = "/chiner/xxx";
    render(<MobileHeader budget={0} />);
    const puce = screen.getByLabelText("Niveau de Brocanteur 3");
    expect(puce.tagName).toBe("SPAN");
    expect(screen.queryByRole("link", { name: "Niveau de Brocanteur 3" })).toBeNull();
  });

  it("hors session, niveau ≥ 1 : la puce est un lien vers /bibliotheque", () => {
    mockState = etat(1);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const lien = screen.getByRole("link", { name: "Niveau de Brocanteur 1" });
    expect(lien.getAttribute("href")).toBe("/bibliotheque");
  });

  it("hors session, niveau 0 : la puce reste un span (écran Compétences masqué)", () => {
    mockState = etat(0);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const puce = screen.getByLabelText("Niveau de Brocanteur 0");
    expect(puce.tagName).toBe("SPAN");
    expect(screen.queryByRole("link", { name: "Niveau de Brocanteur 0" })).toBeNull();
  });
});

describe("MobileHeader — bloc niveau", () => {
  it("le libellé « Niveau » surmonte la barre, le chiffre seul la précède", () => {
    mockState = etat(4);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const bloc = screen.getByLabelText("Niveau de Brocanteur 4");
    expect(bloc.textContent).toBe("Niveau4");
    // Plus de préfixe « N » : le libellé au-dessus dit déjà de quoi il s'agit.
    expect(bloc.textContent).not.toContain("N4");
  });
});

describe("MobileHeader — jauge d'énergie", () => {
  it("aucun bouton « + » : le bloc énergie entier ouvre la recharge, même à plein", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const boutons = screen.getAllByRole("button", { name: "Recharger l'énergie" });
    expect(boutons).toHaveLength(1);
    expect(boutons[0].textContent).toContain("5/5");
    expect(boutons[0].textContent).toContain("Énergie");
  });

  it("entamée : le bloc reste cliquable et le numérateur s'assombrit", () => {
    mockState = etat(3, 2);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    expect(screen.getByRole("button", { name: "Recharger l'énergie" })).toBeTruthy();
    expect(numerateurEnergie().style.color).toBe("var(--brass-500)");
  });

  it("pleine : numérateur et dénominateur portent la même couleur", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const numerateur = numerateurEnergie();
    expect(numerateur.style.color).toBe("var(--brass-300)");
    expect((numerateur.nextElementSibling as HTMLElement).style.color).toBe(
      "var(--brass-300)",
    );
  });

  it("à sec : « 0/5 » passe entièrement au rouge", () => {
    mockState = etat(3, 0);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    const numerateur = numerateurEnergie();
    expect(numerateur.style.color).toBe("var(--red-signal-300)");
    expect((numerateur.nextElementSibling as HTMLElement).style.color).toBe(
      "var(--red-signal-300)",
    );
  });
});

describe("MobileHeader — compteur de Bazarcoins", () => {
  /**
   * La caisse affiche TOUJOURS les deux devises, même à zéro. Elle les cachait
   * à zéro tant que le compteur vivait dans son propre bloc ; depuis qu'elles
   * partagent un libellé, en escamoter une fait sauter le centrage du mot
   * « Caisse » d'un écran à l'autre. Et une bourse à zéro est une information
   * — c'est ce qui dit au joueur qu'il lui faut aller en gagner.
   */
  it("affiché même à zéro", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} jetons={0} />);
    expect(screen.getByText(/^Bazarcoins /)).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("affiché sans la prop `jetons`, à zéro", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} />);
    expect(screen.getByText(/^Bazarcoins /)).toBeTruthy();
  });

  it("affiché avec le solde dès qu'il est positif", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={0} jetons={7} />);
    expect(screen.getByText(/^Bazarcoins /)).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });

  /**
   * La caisse porte les DEUX monnaies. Son libellé se centre donc sur
   * l'ensemble, et non sur les seuls euros : c'est une seule bourse, tenue en
   * deux devises, pas deux compteurs voisins.
   */
  it("la caisse rassemble les deux monnaies sous un seul libellé", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={8420} jetons={25} />);
    const caisse = container.querySelector('[data-caisse]') as HTMLElement;
    expect(caisse).toBeTruthy();
    expect(caisse.textContent).toContain("Caisse");
    expect(caisse.textContent).toContain("25");
    expect(caisse.textContent).toContain("8,4k");
    // Un seul « Caisse » dans tout le bandeau — pas un par devise.
    expect(screen.getAllByText("Caisse")).toHaveLength(1);
  });

  /**
   * Les deux devises portent leur signe de la MÊME façon : même hauteur d'œil,
   * même écart au nombre. Le Ƶ dépassait le « € » d'un tiers (14 px d'encre
   * contre 10,85, mesurés au canvas sur Cinzel à 14,93 px de corps), ce qui le
   * faisait lire comme une vignette posée là plutôt que comme un caractère de
   * la même ligne.
   */
  it("donne au signe du Bazarcoin la hauteur d'œil du signe €", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={8420} jetons={25} />);
    const svg = container.querySelector("[data-caisse] svg") as SVGElement;
    expect(svg.getAttribute("height")).toBe("0.73em");
  });

  /**
   * Les deux signes s'assoient sur la LIGNE DE BASE de leur nombre. Le Ƶ était
   * centré sur la ligne, ce qui le posait 1,6 px plus bas que le « € » voisin
   * — mesuré sur une capture ×8, invisible à l'œil nu mais bien là.
   */
  it("assied les deux signes sur la ligne de base de leur nombre", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={8420} jetons={25} />);
    const [bzc, euros] = [...container.querySelectorAll("[data-caisse] strong")];
    expect((bzc as HTMLElement).style.alignItems).toBe("baseline");
    expect(euros.querySelector<HTMLElement>("[aria-hidden]")!.style.alignItems).toBe("baseline");
  });

  /**
   * L'écart entre un montant et son signe se règle des deux côtés — il ne se
   * réglait pas du côté des euros, où il venait de l'espace littérale du
   * gabarit de traduction.
   *
   * Les deux valeurs CSS ne sont PAS égales, et c'est voulu : le Ƶ est un SVG
   * sans approche, le « € » un caractère qui en a une, et la ligne porte une
   * interlettre de 0,18 em. C'est l'écart d'ENCRE qui doit l'être, et lui se
   * mesure sur une capture, pas dans jsdom — relevé sous 1 px sur cinq cas.
   * Ce test garde donc seulement qu'un réglage existe des deux côtés.
   */
  it("règle l'écart au signe des deux côtés, sans espace littérale", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={8420} jetons={25} />);
    const [bzc, euros] = [...container.querySelectorAll("[data-caisse] strong")];
    expect((bzc as HTMLElement).style.gap).toBe("3px");
    expect(euros.querySelector<HTMLElement>("[aria-hidden]")!.style.gap).toBe("4px");
  });

  /** Plus d'espace littéral : c'est le `gap` qui règle l'écart, et lui seul. */
  it("ne laisse plus d'espace dans le texte du montant en euros", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={8420} jetons={25} />);
    const euros = [...container.querySelectorAll("[data-caisse] strong")][1];
    const vu = euros.querySelector("[aria-hidden]")!.textContent;
    expect(vu).toBe("8,4k€");
  });

  /**
   * « Le montant de Bazarcoin sera également dans ce même bleu » : c'est la
   * couleur qui sépare les deux devises d'un coup d'œil, puisqu'elles
   * partagent désormais le même libellé.
   */
  it("le montant en Bazarcoins est bleu, celui en euros reste laiton", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={8420} jetons={25} />);
    const bzc = screen.getByText("25").closest("strong") as HTMLElement;
    expect(bzc.style.color).toBe("var(--azur-400)");
    const euros = screen.getByText("8,4k").closest("strong") as HTMLElement;
    expect(euros.style.color).toBe("var(--brass-300)");
  });


  /**
   * Le header porte trois blocs sur une ligne et la caisse est le seul dont la
   * largeur suit la fortune du joueur : passé quelques milliers d'euros, elle
   * poussait le bloc NIVEAU hors du centre. La forme courte lui donne une
   * largeur bornée.
   */
  it("abrège les montants à partir du millier", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={10610} jetons={0} />);
    const caisse = container.querySelector("[data-caisse]") as HTMLElement;
    expect(caisse.textContent).toContain("10,6k");
  });

  it("laisse les montants sous le millier écrits en entier", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={840} jetons={0} />);
    const caisse = container.querySelector("[data-caisse]") as HTMLElement;
    expect(caisse.textContent).toContain("840 €");
  });

  /** Les deux devises tiennent la même règle — les jetons grossissent aussi. */
  it("abrège aussi le solde en Bazarcoins", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    const { container } = render(<MobileHeader budget={0} jetons={12500} />);
    const caisse = container.querySelector("[data-caisse]") as HTMLElement;
    expect(caisse.textContent).toContain("12,5k");
  });

  /**
   * Le libellé « CAISSE » est en capitales, et le bloc entier hérite de son
   * `text-transform` : sans contre-ordre, « 10,6k » s'affiche « 10,6K ». Le
   * DOM, lui, porte le texte d'origine — seule la règle CSS trahit le défaut,
   * d'où cette assertion sur le style et non sur le texte.
   */
  it("garde le suffixe en minuscule malgré les capitales du libellé", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={10610} jetons={12500} />);
    const euros = screen.getByText("10,6k").closest("strong") as HTMLElement;
    expect(euros.style.textTransform).toBe("none");
  });

  /**
   * L'abréviation est une commodité pour l'œil. Le montant exact reste dû :
   * le lecteur d'écran doit entendre « 10 610 € », pas « dix virgule six k ».
   */
  it("garde le montant exact pour le lecteur d'écran", () => {
    mockState = etat(3);
    mockPathname = "/bureau";
    render(<MobileHeader budget={10610} jetons={12500} />);
    expect(screen.getByText(/10[\s\u00a0]610[\s\u00a0]€/)).toBeTruthy();
    expect(screen.getByText(/Bazarcoins 12[\s\u00a0]500/)).toBeTruthy();
  });

  it("dégelé : le niveau réel est de nouveau affiché", () => {
    mockState = etat(5);
    mockPathname = "/chiner/xxx";
    gelerXpAffichage({ niveau: 3, xp: 120, pointsDisponibles: 0 });
    const { rerender } = render(<MobileHeader budget={0} />);
    act(() => degelerXpAffichage());
    rerender(<MobileHeader budget={0} />);
    expect(screen.getByLabelText("Niveau de Brocanteur 5")).toBeTruthy();
  });
});

/**
 * La caisse est le point de DÉPART d'une animation depuis le 2026-08-26 : les
 * Bazarcoins en jaillissent quand le Bazar est payé. La cible est nommée sur
 * le compteur de jetons lui-même, et non sur le bloc entier : la caisse porte
 * deux monnaies, et le centre du bloc tombe entre les deux nombres — les
 * pièces sortiraient d'à côté de la somme qu'elles quittent. C'est la même
 * raison qui avait fait poser `caisse-header` sur le montant en euros.
 */
describe("MobileHeader — le compteur de jetons est une cible d'animation", () => {
  it("porte la cible nommée que cherche la célébration d'achat", () => {
    mockState = etat(5);
    mockPathname = "/bazar";
    render(<MobileHeader budget={100} jetons={42} />);
    const compteur = document.querySelector("[data-fly-target='jetons-header']");
    expect(compteur).toBeTruthy();
    expect(compteur!.textContent).toContain("42");
  });

  it("ne la confond pas avec celle des euros", () => {
    mockState = etat(5);
    mockPathname = "/bazar";
    render(<MobileHeader budget={100} jetons={42} />);
    const jetons = document.querySelector("[data-fly-target='jetons-header']");
    const euros = document.querySelector("[data-fly-target='caisse-header']");
    expect(jetons).not.toBe(euros);
    expect(euros!.textContent).toContain("100");
  });
});

/**
 * Le compteur de Bazarcoins suit le GEL d'affichage, comme la caisse en euros :
 * pendant la cérémonie de livraison d'une quête, il ne doit monter qu'au
 * moment où la pièce s'y pose. La partie, elle, est créditée bien avant.
 */
describe("MobileHeader — le compteur de jetons obéit au gel", () => {
  afterEach(() => degelerJetonsAffichage());

  it("gelé : montre l'ancienne valeur, pas la vraie", () => {
    mockState = etat(5);
    mockPathname = "/bureau";
    gelerJetonsAffichage(2);
    render(<MobileHeader budget={100} jetons={5} />);
    const compteur = document.querySelector("[data-fly-target='jetons-header']");
    expect(compteur!.textContent).toContain("2");
    expect(compteur!.textContent).not.toContain("5");
  });
});
