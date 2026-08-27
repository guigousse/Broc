// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { en } from "@/lib/i18n/ui/en";
import { AccrocheBorne } from "./AccrocheBorne";

afterEach(cleanup);

function monter() {
  return render(
    <LangueProvider>
      <AccrocheBorne />
    </LangueProvider>,
  );
}

describe("AccrocheBorne", () => {
  it("la borne parle d'abord, en vert sur son écran", () => {
    monter();
    const crt = screen.getByTestId("soutien-accroche-borne");
    expect(crt.textContent).toContain(en.soutien.insertCoin);
    expect(crt.textContent).toContain(en.soutien.modeDemo);
  });

  // Le mot de remerciement est le MÊME qu'à la page « Soutenir » du menu :
  // deux portes, un seul discours. S'il divergeait, c'est ici qu'on le verrait.
  it("le mot de remerciement est celui de la page du menu", () => {
    monter();
    expect(screen.getByText(en.soutien.merciCorps)).toBeTruthy();
    expect(screen.getByText(en.soutien.merciPartage)).toBeTruthy();
    expect(screen.getByText(en.soutien.merciAvis)).toBeTruthy();
  });

  // Le défaut d'origine : ce paragraphe était en `paper-100`, du blanc cassé
  // sur le papier de la feuille — invisible sur appareil.
  it("le texte est en encre, jamais en blanc cassé", () => {
    monter();
    const p = screen.getByText(en.soutien.merciCorps) as HTMLElement;
    expect(p.style.color).toContain("--ink-700");
  });
});
