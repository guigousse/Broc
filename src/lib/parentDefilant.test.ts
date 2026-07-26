// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  decalageDansParentDefilant,
  trouverParentDefilant,
} from "./parentDefilant";

afterEach(() => {
  document.body.innerHTML = "";
});

/** Crée une chaîne d'éléments imbriqués et la rattache au body. */
function chaine(...styles: Array<Partial<CSSStyleDeclaration>>): HTMLElement[] {
  const noeuds = styles.map((s) => {
    const el = document.createElement("div");
    Object.assign(el.style, s);
    return el;
  });
  noeuds.forEach((el, i) => (i === 0 ? document.body : noeuds[i - 1]).appendChild(el));
  return noeuds;
}

describe("trouverParentDefilant", () => {
  it("retourne le premier ancêtre en overflow-y: auto", () => {
    const [scroller, , cible] = chaine({ overflowY: "auto" }, {}, {});
    expect(trouverParentDefilant(cible)).toBe(scroller);
  });

  it("reconnaît overflow: scroll écrit en raccourci", () => {
    const [scroller, cible] = chaine({ overflow: "scroll" }, {});
    expect(trouverParentDefilant(cible)).toBe(scroller);
  });

  it("retourne le plus proche quand plusieurs ancêtres défilent", () => {
    const [, proche, cible] = chaine(
      { overflowY: "auto" },
      { overflowY: "auto" },
      {},
    );
    expect(trouverParentDefilant(cible)).toBe(proche);
  });

  it("null quand aucun ancêtre ne défile (body verrouillé)", () => {
    const [, cible] = chaine({ overflow: "hidden" }, {});
    expect(trouverParentDefilant(cible)).toBeNull();
  });
});

describe("decalageDansParentDefilant", () => {
  it("exclut ce qui précède le conteneur (header, bandeau collant)", () => {
    // Cas réel : body est l'offsetParent commun (il est en position: fixed).
    // Le <main> défilant démarre à 150px (header + sticky), la grille à 162px
    // → la marge dans le contenu défilant vaut 12px, pas 162.
    const [scroller, cible] = chaine({ overflowY: "auto" }, {});
    Object.defineProperty(scroller, "offsetTop", { value: 150 });
    Object.defineProperty(scroller, "offsetParent", { value: document.body });
    Object.defineProperty(cible, "offsetTop", { value: 162 });
    Object.defineProperty(cible, "offsetParent", { value: document.body });

    expect(decalageDansParentDefilant(cible, scroller)).toBe(12);
  });

  it("remonte la chaîne des offsetParent intermédiaires", () => {
    const [scroller, relatif, cible] = chaine(
      { overflowY: "auto" },
      { position: "relative" },
      {},
    );
    Object.defineProperty(scroller, "offsetTop", { value: 0 });
    Object.defineProperty(scroller, "offsetParent", { value: document.body });
    // `relatif` est positionné : il devient l'offsetParent de la cible.
    Object.defineProperty(relatif, "offsetTop", { value: 20 });
    Object.defineProperty(relatif, "offsetParent", { value: document.body });
    Object.defineProperty(cible, "offsetTop", { value: 30 });
    Object.defineProperty(cible, "offsetParent", { value: relatif });

    expect(decalageDansParentDefilant(cible, scroller)).toBe(50);
  });
});
