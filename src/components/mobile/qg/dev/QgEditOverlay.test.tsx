// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QgEditOverlay } from "./QgEditOverlay";
import { QgEditProvider } from "./QgEditContext";

afterEach(cleanup);

// ── Le cadre de calage doit COÏNCIDER avec la case qu'il calibre ───────────
// `ArticleBazar` pose ses articles dans une case CARRÉE (`aspectRatio: 1/1`).
// L'auteur cale le Bazar à la souris avec ce cadre : s'il ne suit pas la même
// forme que la case, il vise dans le vide. Le QG (bureau) reste une image
// ancrée au pied, de hauteur libre (`minHeight: 4vh`) — calage déjà fait et
// livré, à ne pas casser.
//
// jsdom n'a pas de moteur de layout : la seule trace observable est le style
// en ligne. Le dépôt n'installe pas jest-dom, on lit donc `element.style.*`
// directement.
function outerDiv(editKeyLabel: string): HTMLElement {
  // structure : div(container) > div(pointillé) > span(libellé de la clé)
  const label = screen.getByText(editKeyLabel);
  return label.parentElement!.parentElement as HTMLElement;
}

describe("QgEditOverlay — forme du cadre par famille", () => {
  it("le cadre d'un article du Bazar est carré : aspectRatio 1/1, pas de minHeight", () => {
    render(
      <QgEditProvider enabled>
        <QgEditOverlay cles={["case1"]} />
      </QgEditProvider>,
    );
    const conteneur = outerDiv("case1");
    expect(conteneur.style.aspectRatio).toBe("1 / 1");
    expect(conteneur.style.minHeight).toBe("");
  });

  it("le cadre d'un objet du QG garde son minHeight 4vh, sans aspectRatio", () => {
    render(
      <QgEditProvider enabled>
        <QgEditOverlay cles={["carnet"]} />
      </QgEditProvider>,
    );
    const conteneur = outerDiv("carnet");
    expect(conteneur.style.minHeight).toBe("4vh");
    expect(conteneur.style.aspectRatio).toBe("");
  });

  it("le corps pointillé (celui qu'on tire à la souris) porte la même forme que le conteneur", () => {
    render(
      <QgEditProvider enabled>
        <QgEditOverlay cles={["case1"]} />
      </QgEditProvider>,
    );
    const conteneur = outerDiv("case1");
    const pointille = conteneur.firstElementChild as HTMLElement;
    expect(pointille.style.aspectRatio).toBe("1 / 1");
  });
});
