// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EnergieRecharge, angleAiguille } from "./EnergieRecharge";
import { PUBS_ENERGIE_MAX_PAR_JOUR } from "@/lib/energie";

afterEach(cleanup);

/** Clé du jour local courant (même convention que lib/energie). */
function cleAujourdhui(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

let mockState: Record<string, unknown> = {};
const crediterEnergiePub = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState }),
  useGameActions: () => ({
    tempsConfiance: () => null,
    crediterEnergiePub,
  }),
}));

describe("EnergieRecharge — plafond quotidien de pubs", () => {
  it("quota disponible : le bouton est actif, sans compteur affiché", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    // Le plafond (20/j) agit silencieusement : plus de « x/y » dans le libellé.
    expect(btn.textContent).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it("quota épuisé : le bouton est désactivé AVANT de lancer la pub", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      pubsEnergie: { cle: cleAujourdhui(), n: PUBS_ENERGIE_MAX_PAR_JOUR },
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /plus de pub aujourd'hui/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("angleAiguille", () => {
  it("course -60° (0 ⚡) → +60° (max), linéaire et clampée", () => {
    expect(angleAiguille(0, 5)).toBe(-60);
    expect(angleAiguille(5, 5)).toBe(60);
    expect(angleAiguille(2.5, 5)).toBe(0);
    expect(angleAiguille(7, 5)).toBe(60); // clamp haut
    expect(angleAiguille(-1, 5)).toBe(-60); // clamp bas
    expect(angleAiguille(3, 0)).toBe(-60); // max invalide → repos
  });
});

describe("EnergieRecharge — galvanomètre", () => {
  it("l'aiguille est rendue, tournée selon l'énergie courante", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const aiguille = screen.getByTestId("aiguille-energie");
    expect(aiguille.getAttribute("transform")).toBe(
      `rotate(${angleAiguille(2, 5)})`,
    );
  });

  it("énergie pleine : affiche « au maximum » (pas de minuteur)", () => {
    mockState = {
      energie: 5,
      energieDerniereMaj: Date.now(),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 0 },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    expect(screen.getByText(/au maximum/i)).toBeTruthy();
    expect(screen.queryByText(/dans \d{2}:\d{2}/i)).toBeNull();
  });
});
