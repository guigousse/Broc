// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CarnetOverlay } from "./CarnetOverlay";
import { CLE_STOCKAGE_CARNET } from "./useCarnetSections";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { Courrier, GameState } from "@/types/game";

afterEach(() => { cleanup(); window.localStorage.clear(); });

function quete(id: string, categorie: "principale" | "quotidienne" | "hebdomadaire", titre: string): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie, expediteurId: "mode", titre, corps: ["c"],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne" }], recompense: { argent: 60 },
    },
  };
}

function etat(courriers: Courrier[], niveau = 5): GameState {
  const s = createMockGameState({
    courriers,
    missions: courriers.map((c) => ({ courrierId: c.id, statut: "active" as const })),
  });
  return { ...s, brocanteur: { ...s.brocanteur, niveau } };
}

const base = { open: true, onClose: () => {}, onLivrerMission: () => ({ ok: true }) };

describe("CarnetOverlay", () => {
  it("fermé : ne rend rien", () => {
    const { container } = render(<CarnetOverlay {...base} open={false} state={etat([])} />);
    expect(container.firstChild).toBeNull();
  });

  it("les trois sections sont dépliées à la première ouverture", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("sous le niveau 3, les sections périodiques annoncent le verrou", () => {
    render(<CarnetOverlay {...base} state={etat([], 2)} />);
    expect(screen.getAllByText(/niveau 3|level 3/i).length).toBeGreaterThan(0);
  });

  it("aucun chapitre : HISTOIRE annonce la fin de la trame", () => {
    render(<CarnetOverlay {...base} state={etat([], 5)} />);
    expect(screen.getByText(/tout raconté/i)).toBeTruthy();
  });

  it("une section mémorisée repliée s'ouvre repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByText("La bonne pioche")).toBeNull();
  });

  it("l'ouverture ciblée déplie la section MÊME si elle était mémorisée repliée", () => {
    window.localStorage.setItem(CLE_STOCKAGE_CARNET, JSON.stringify({ quotidiennes: true }));
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} missionInitialeId="q1" />);
    expect(screen.getByText("La bonne pioche")).toBeTruthy();
  });

  it("ni onglets, ni section Terminées", () => {
    const q = quete("q1", "quotidienne", "La bonne pioche");
    render(<CarnetOverlay {...base} state={etat([q])} />);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByText(/terminées|completed/i)).toBeNull();
  });
});
