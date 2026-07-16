// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CommandeRow } from "./CommandeRow";
import type { Courrier, GameState } from "@/types/game";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function courrierMission(): Courrier {
  return {
    id: "m1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "maman",
      titre: "Le coffre rétro", corps: ["Aide-moi."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 90 },
    },
  };
}

describe("CommandeRow", () => {
  it("affiche le titre et le nom du commanditaire", () => {
    const state = createMockGameState();
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText("Le coffre rétro")).toBeTruthy();
    expect(screen.getByText(/Maman/)).toBeTruthy();
  });

  it("montre le bouton Livrer actif quand toutes les cibles sont réunies", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("grise Livrer si une cible manque", () => {
    const state = createMockGameState({
      inventaireJoueur: [],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: /Livrer/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("affiche la progression d'un objectif ventesCumulees et gate le bouton Livrer", () => {
    const courrier: Courrier = {
      id: "m2", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Un pactole pour la mairie", corps: ["Fais rentrer des sous."],
        cibles: [],
        objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 50 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m2", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getByText(/0\/300/)).toBeTruthy();
    expect(screen.queryByText("Prêt ✓")).toBeNull();
  });
});
