// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  FloatingRoomOverlay,
  GAP_WRAP,
  RECOUVREMENT_ONGLETS,
} from "./FloatingRoomOverlay";

afterEach(cleanup);

describe("FloatingRoomOverlay", () => {
  it("rend la bande haute et le panneau bas", () => {
    render(
      <FloatingRoomOverlay bande={<div>BANDE</div>}>
        <div>PANNEAU</div>
      </FloatingRoomOverlay>,
    );
    expect(screen.getByText("BANDE")).toBeTruthy();
    expect(screen.getByText("PANNEAU")).toBeTruthy();
  });

  it("est un overlay fixed qui couvre la zone entre header et TabBar", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector(
      '[data-floating-room="1"]',
    ) as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.style.position).toBe("fixed");
    expect(wrap.style.zIndex).toBe("35");
  });

  it("a ses keyframes dans globals.css, sans calc() dans les transforms", () => {
    // Lightning CSS (Turbopack) jette silencieusement toute règle @keyframes
    // dont un transform contient calc() mêlant % et px : les keyframes
    // n'arrivent jamais au navigateur et les blocs « popent » sans
    // animation (bug corrigé le 2026-07-10). Ce test fige les deux
    // invariants : les keyframes existent ET n'utilisent pas calc().
    const css = readFileSync(
      join(__dirname, "../../../app/globals.css"),
      "utf8",
    );
    for (const nom of ["broc-float-bande-in", "broc-float-panneau-in"]) {
      const idx = css.indexOf(`@keyframes ${nom}`);
      expect(idx, `@keyframes ${nom} absente de globals.css`).toBeGreaterThan(
        -1,
      );
      const bloc = css.slice(idx, css.indexOf("}", css.indexOf("to", idx)));
      expect(
        bloc.includes("calc("),
        `@keyframes ${nom} contient calc() — Lightning CSS jetterait la règle`,
      ).toBe(false);
    }
  });

  it("rend le bloc milieu entre bande et panneau quand fourni", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>} milieu={<div>MILIEU</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    expect(screen.getByText("MILIEU")).toBeTruthy();
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    // Ordre des blocs : bande, milieu, panneau.
    const texts = Array.from(wrap.children).map((c) => c.textContent);
    expect(texts).toEqual(["B", "MILIEU", "P"]);
  });

  it("ne rend rien de plus sans milieu", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    expect(wrap.children.length).toBe(2);
  });

  it("anime les trois blocs par défaut (animer non fourni)", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>} milieu={<div>M</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    const [bandeEl, milieuEl, panneauEl] = Array.from(wrap.children) as HTMLElement[];
    expect(wrap.getAttribute("data-animer")).toBe("1");
    expect(bandeEl.style.animation).toContain("320ms");
    expect(milieuEl.style.animation).toContain("320ms");
    expect(panneauEl.style.animation).toContain("320ms");
  });

  it("rend les languettes AVANT la carte, et HORS d'elle", () => {
    // Le point de la refonte : les onglets ne sont plus DANS la carte (où
    // ils rompaient son cadre) mais derrière elle. S'ils étaient enfants de
    // la carte, ils passeraient PAR-DESSUS son liseré (un enfant peint
    // après le fond ET la bordure de son parent) — exactement l'inverse de
    // l'effet voulu.
    const { container } = render(
      <FloatingRoomOverlay onglets={<div>LANGUETTES</div>} bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    const texts = Array.from(wrap.children).map((c) => c.textContent);
    expect(texts).toEqual(["LANGUETTES", "B", "P"]);
    const carte = wrap.children[1] as HTMLElement;
    expect(carte.textContent).not.toContain("LANGUETTES");
  });

  it("la carte remonte sur les languettes et les recouvre", () => {
    const { container } = render(
      <FloatingRoomOverlay onglets={<div>L</div>} bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    const languettes = wrap.children[0] as HTMLElement;
    const carte = wrap.children[1] as HTMLElement;
    // La marge négative annule l'interstice du flex ET creuse le
    // recouvrement : sans elle, les languettes flotteraient au-dessus de la
    // carte au lieu d'en sortir.
    const attendu = -(GAP_WRAP + RECOUVREMENT_ONGLETS);
    expect(languettes.style.marginBottom).toBe(`${attendu}px`);
    // Et la carte doit être peinte au-dessus : sans contexte d'empilement,
    // le TEXTE des languettes ressortirait par-dessus son fond.
    expect(carte.style.position).toBe("relative");
    expect(Number(carte.style.zIndex)).toBeGreaterThan(0);
  });

  it("les languettes glissent avec la carte, et se figent avec elle", () => {
    const { container: avec } = render(
      <FloatingRoomOverlay onglets={<div>L</div>} bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const languettesAnim = (
      avec.querySelector('[data-floating-room="1"]') as HTMLElement
    ).children[0] as HTMLElement;
    // Sans ce garde, le test lirait la CARTE (qui anime aussi) et passerait
    // alors même que les languettes n'existeraient pas.
    expect(languettesAnim.textContent).toBe("L");
    expect(languettesAnim.style.animation).toContain("320ms");

    cleanup();

    const { container: sans } = render(
      <FloatingRoomOverlay onglets={<div>L</div>} bande={<div>B</div>} animer={false}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const languettesFigees = (
      sans.querySelector('[data-floating-room="1"]') as HTMLElement
    ).children[0] as HTMLElement;
    expect(languettesFigees.textContent).toBe("L");
    expect(languettesFigees.style.animation).toBe("none");
  });

  it("sans languettes, la structure historique est intacte", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    expect(Array.from(wrap.children).map((c) => c.textContent)).toEqual(["B", "P"]);
  });

  it("coupe réellement l'animation des trois blocs quand animer vaut false", () => {
    // Le point de la prop `animer` n'est pas l'attribut `data-animer` (que le
    // composant pose lui-même) mais le style CSS effectivement appliqué :
    // une inversion du ternaire dans le JSX passerait un test qui ne
    // vérifierait que l'attribut.
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>} milieu={<div>M</div>} animer={false}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector('[data-floating-room="1"]') as HTMLElement;
    const [bandeEl, milieuEl, panneauEl] = Array.from(wrap.children) as HTMLElement[];
    expect(wrap.getAttribute("data-animer")).toBe("0");
    expect(bandeEl.style.animation).toBe("none");
    expect(milieuEl.style.animation).toBe("none");
    expect(panneauEl.style.animation).toBe("none");
  });
});
