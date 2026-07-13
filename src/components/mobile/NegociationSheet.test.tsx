// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NegociationSheet } from "./NegociationSheet";
import { ouvrirNegociation } from "@/lib/negociation";
import type { NegoPersona } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function renderSheet(offreJoueur: number) {
  return render(
    <NegociationSheet
      open
      onClose={() => {}}
      mode="vente"
      persona={persona}
      echelleMax={100}
      cibleSecrete={90}
      prixDepartAdverse={40}
      nego={ouvrirNegociation("vente", 40, 90)}
      onUpdateNego={() => {}}
      onConclu={() => {}}
      onProposerOffre={(n) => n}
      personaInfo={{ revelePersona: false, releveBourse: false, oeilAiguise: false }}
      offreJoueur={offreJoueur}
      onChangeOffre={() => {}}
    />,
  );
}

describe("NegociationSheet — offre contrôlée, atouts déplacés dans le dock", () => {
  it("le bouton Proposer affiche l'offre passée en prop (état contrôlé)", () => {
    renderSheet(80);
    expect(screen.getByText(/Proposer 80/)).toBeTruthy();
  });

  it("n'affiche plus les boutons Lot garni / Boniment (ils vivent dans le dock)", () => {
    renderSheet(80);
    expect(screen.queryByText(/Lot garni/)).toBeNull();
    expect(screen.queryByText(/Boniment/)).toBeNull();
  });
});
