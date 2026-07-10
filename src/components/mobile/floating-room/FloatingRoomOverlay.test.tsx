// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FloatingRoomOverlay } from "./FloatingRoomOverlay";

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
});
