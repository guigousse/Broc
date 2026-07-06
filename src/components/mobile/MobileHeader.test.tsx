// @vitest-environment jsdom
/**
 * `MobileHeader` — la puce XP ne doit jamais faire sortir d'une session
 * (chinage/vitrine) par mistap, ni deep-linker vers l'écran Compétences
 * avant que celui-ci ne soit ouvert (N0). Mêmes mocks que
 * `LevelUpOverlay.test.tsx` : useGame()/useGameActions() + next/navigation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MobileHeader } from "./MobileHeader";

afterEach(cleanup);

let mockState: Record<string, unknown> | null = null;
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState }),
  useGameActions: () => ({ tempsConfiance: () => Date.now() }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function etat(niveau: number) {
  return {
    energie: 5,
    energieDerniereMaj: Date.now(),
    brocanteur: { niveau, xp: 0 },
  };
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
