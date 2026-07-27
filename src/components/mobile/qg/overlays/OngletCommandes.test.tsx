// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OngletCommandes } from "./OngletCommandes";
import { courrierDeChapitre } from "@/lib/quetes/principales";
import { chapitreParId } from "@/data/quetesPrincipales";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { GameState } from "@/types/game";

afterEach(cleanup);

const livrer = () => ({ ok: true });

/** State avec la commande du chapitre 1 (« La lampe de mon atelier ») active. */
function stateAvecLampe(): GameState {
  const ch = chapitreParId("trame_ch1");
  if (!ch) throw new Error("chapitre trame_ch1 introuvable");
  return createMockGameState({
    courriers: [courrierDeChapitre(ch, 1)],
    missions: [{ courrierId: "trame_ch1", statut: "active" }],
  });
}

describe("OngletCommandes", () => {
  it("déplie la commande dont l'id arrive APRÈS le montage (carnet déjà ouvert)", () => {
    const vide = createMockGameState({ courriers: [], missions: [] });
    const { rerender } = render(
      <OngletCommandes state={vide} onLivrerMission={livrer} ouvertInitialId={null} />,
    );
    // Le grand-père vient d'écrire dans le carnet resté ouvert.
    rerender(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });

  it("déplie aussi la commande passée dès le montage (badge livrable tapé)", () => {
    render(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });
});
