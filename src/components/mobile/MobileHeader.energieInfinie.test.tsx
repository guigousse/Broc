// @vitest-environment jsdom
/**
 * `MobileHeader` — mode « Énergie infinie » (achat IAP, drapeau device) :
 * la pastille `data-fly-target="energie-header"` affiche ∞ au lieu de n/5.
 * Même harnais que `MobileHeader.test.tsx` (useGame()/useGameActions() +
 * next/navigation mockés) ; `definirEnergieInfinie` reste réel (module
 * localStorage, pas besoin de mock).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MobileHeader } from "./MobileHeader";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { ENERGIE_MAX } from "@/lib/energie";

afterEach(() => {
  cleanup();
  definirEnergieInfinie(false);
  window.localStorage.clear();
});

let mockState: Record<string, unknown> | null = null;
const mockPathname = "/bureau";

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

describe("MobileHeader — énergie infinie", () => {
  it("acheteur : la jauge d'énergie affiche ∞ au lieu de n/5", async () => {
    definirEnergieInfinie(true);
    mockState = etat(3, 2);
    render(<MobileHeader budget={0} />);
    expect(await screen.findByText("∞")).toBeTruthy();
    expect(screen.queryByText(`/${ENERGIE_MAX}`)).toBeNull();
  });

  it("non-acheteur : la jauge affiche toujours n/5, pas de ∞", () => {
    mockState = etat(3, 2);
    render(<MobileHeader budget={0} />);
    expect(screen.queryByText("∞")).toBeNull();
    expect(screen.getByText(`/${ENERGIE_MAX}`)).toBeTruthy();
  });
});
