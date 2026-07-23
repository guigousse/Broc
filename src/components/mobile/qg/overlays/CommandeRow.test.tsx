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
    // Présent deux fois : aperçu sur la carte fermée + ligne du détail déplié.
    expect(screen.getAllByText(/0\/300/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Prêt ✓")).toBeNull();
  });

  it("carte fermée : une vignette d'aperçu par cible, avec plafond 4 + jeton +n", () => {
    const courrier: Courrier = {
      id: "m4", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "La grande rafle", corps: ["Tout me trouver."],
        cibles: [
          { templateId: "a" }, { templateId: "b" }, { templateId: "c" },
          { templateId: "d" }, { templateId: "e" }, { templateId: "f" },
        ],
        recompense: { argent: 10 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m4", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getAllByTestId("apercu-cible").length).toBe(4);
    expect(screen.getByTestId("apercu-plus").textContent).toBe("+2");
  });

  it("carte fermée sans cible objet : l'aperçu affiche l'objectif à la place des vignettes", () => {
    const courrier: Courrier = {
      id: "m5", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Pactole", corps: ["Des sous."],
        cibles: [], objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 10 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m5", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.queryAllByTestId("apercu-cible").length).toBe(0);
    expect(screen.getByText(/Ventes cumulées/)).toBeTruthy();
  });

  it("en-tête replié : agrège la progression sur tous les objectifs pour une mission sans cible objet (pas de 0/0)", () => {
    const courrier: Courrier = {
      id: "m3", type: "mission", jourRecu: 1, lu: true,
      payload: {
        type: "mission", categorie: "principale", expediteurId: "maman",
        titre: "Vendre, c'est vivre", corps: ["Cumuler des ventes."],
        cibles: [],
        objectifs: [{ type: "ventesCumulees", montant: 300 }],
        recompense: { argent: 80 },
      },
    };
    const state = createMockGameState({ missions: [{ courrierId: "m3", statut: "active" }] });
    render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    // Pas de 0/0 : un seul objectif (ventesCumulees), aucun rempli.
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.queryByText("0/0")).toBeNull();
    // Pas de barre à largeur NaN%.
    const barre = document.querySelector('span[style*="width"][style*="background: rgb(200, 162, 74)"]') as HTMLElement | null;
    expect(barre?.style.width ?? "").not.toContain("NaN");
    expect(screen.queryByText("Prêt ✓")).toBeNull();
  });
});
