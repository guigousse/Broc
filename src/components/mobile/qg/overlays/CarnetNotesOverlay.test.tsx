// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { CarnetNotesOverlay } from "./CarnetNotesOverlay";
import type { GameState } from "@/types/game";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function withMissions(): GameState {
  const s = createMockGameState();
  s.courriers = [
    { id: "p1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "principale", expediteurId: "maman", titre: "Quête A", corps: ["a"], cibles: [{ templateId: "x" }], recompense: { argent: 10 } } },
    { id: "s1", type: "mission", jourRecu: 1, lu: true, payload: { type: "mission", categorie: "quotidienne", expediteurId: "art", titre: "Quête B", corps: ["b"], cibles: [{ templateId: "y" }], recompense: { argent: 20 } } },
  ];
  s.missions = [
    { courrierId: "p1", statut: "active" },
    { courrierId: "s1", statut: "active" },
  ];
  return s;
}

describe("CarnetNotesOverlay", () => {
  it("affiche les sections principales et quotidiennes", () => {
    render(<CarnetNotesOverlay open state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    expect(screen.getByText(/principales/i)).toBeTruthy();
    expect(screen.getByText(/quotidiennes/i)).toBeTruthy();
    expect(screen.getByText("Quête A")).toBeTruthy();
    expect(screen.getByText("Quête B")).toBeTruthy();
  });

  it("n'ouvre qu'un détail à la fois", () => {
    render(<CarnetNotesOverlay open state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    fireEvent.click(screen.getByText("Quête A"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1);
    fireEvent.click(screen.getByText("Quête B"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1); // A refermée
  });
});
