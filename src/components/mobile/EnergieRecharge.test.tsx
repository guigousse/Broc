// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EnergieRecharge } from "./EnergieRecharge";
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
  it("quota disponible : le bouton est actif et affiche le compteur", () => {
    mockState = { energie: 2, energieDerniereMaj: Date.now() };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    expect(btn.textContent).toContain(`${PUBS_ENERGIE_MAX_PAR_JOUR}/${PUBS_ENERGIE_MAX_PAR_JOUR}`);
  });

  it("quota épuisé : le bouton est désactivé AVANT de lancer la pub", () => {
    mockState = {
      energie: 2,
      energieDerniereMaj: Date.now(),
      pubsEnergie: { cle: cleAujourdhui(), n: PUBS_ENERGIE_MAX_PAR_JOUR },
    };
    render(<EnergieRecharge onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /plus de pub aujourd'hui/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
