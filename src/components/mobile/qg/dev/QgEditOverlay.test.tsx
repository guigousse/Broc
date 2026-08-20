// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QgEditOverlay, pxVersDeltaCoord } from "./QgEditOverlay";
import { QgEditProvider } from "./QgEditContext";
import { QG_LAYOUT, qgPct } from "../layout";
import { BAZAR_LAYOUT } from "@/components/bazar/bazarLayout";

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

// ── Le cadre doit être exprimé dans la MÊME unité que l'objet ──────────────
// La scène est dimensionnée par sa HAUTEUR (aspect-ratio) : sa largeur n'est
// JAMAIS `panoramaWidth` vw pile. `qgPct()` est la seule conversion valable
// (coordonnée authorée → % de la largeur de SCÈNE) ; c'est celle qu'utilisent
// les objets (`QgScene`, `ArticleBazar`…). Le cadre doit passer par la même
// voie — un `left`/`width` en `vw` brut ne coïncide avec l'objet que si la
// scène fait par hasard exactement 300 vw de large, ce qui n'arrive jamais.
describe("QgEditOverlay — le cadre suit qgPct, pas des vw bruts", () => {
  it("left/width du cadre sont des % dérivés de qgPct, jamais des vw", () => {
    render(
      <QgEditProvider enabled>
        <QgEditOverlay cles={["case4"]} />
      </QgEditProvider>,
    );
    const conteneur = outerDiv("case4");
    const { left, width } = BAZAR_LAYOUT.objets.case4;
    expect(conteneur.style.left).toBe(`${qgPct(left)}%`);
    expect(conteneur.style.width).toBe(`${qgPct(width)}%`);
    expect(conteneur.style.left.endsWith("vw")).toBe(false);
    expect(conteneur.style.width.endsWith("vw")).toBe(false);
  });

  it("bottom reste un % de la hauteur de scène, inchangé", () => {
    render(
      <QgEditProvider enabled>
        <QgEditOverlay cles={["carnet"]} />
      </QgEditProvider>,
    );
    const conteneur = outerDiv("carnet");
    expect(conteneur.style.bottom).toBe(`${QG_LAYOUT.objets.carnet.bottom}%`);
  });
});

// ── Arithmétique du drag : la largeur de SCÈNE, pas celle de la fenêtre ────
// Un pixel de déplacement du pointeur vaut `panoramaWidth / largeurScène`
// unités de coordonnée — jamais `100 / window.innerWidth` (ce dernier ne
// coïncide que si la scène fait par hasard 300 vw pile). C'est l'arithmétique
// exacte qui, avant correctif, faisait glisser l'objet ~12 % plus vite que le
// doigt sur un iPhone où la scène mesure 338 vw.
describe("pxVersDeltaCoord — conversion px → coordonnée via la largeur de scène", () => {
  it("convertit un delta de N px selon N × panoramaWidth / largeurScène", () => {
    const largeurScenePx = 1329; // mesuré : 338 vw sur un viewport de 393 px
    const dx = 100;
    const attendu = (dx * QG_LAYOUT.panoramaWidth) / largeurScenePx;
    expect(pxVersDeltaCoord(dx, largeurScenePx)).toBeCloseTo(attendu, 10);
  });

  it("diffère de l'ancienne formule (100 / window.innerWidth) dès que la scène n'est pas 300 vw", () => {
    const windowWidth = 393;
    const largeurScenePx = 1329; // 338 vw réel, pas 300 vw
    const dx = 100;
    const ancienneFormule = dx / (windowWidth / 100);
    const nouvelleFormule = pxVersDeltaCoord(dx, largeurScenePx);
    expect(nouvelleFormule).not.toBeCloseTo(ancienneFormule, 1);
    // La nouvelle formule suit 1:1 le doigt une fois reconvertie en px de
    // scène : dx unités-scène = dx px d'écran.
    expect((nouvelleFormule / QG_LAYOUT.panoramaWidth) * largeurScenePx).toBeCloseTo(
      dx,
      10,
    );
  });
});
