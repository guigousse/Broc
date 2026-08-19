// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NegociationSheet } from "./NegociationSheet";
import { ouvrirNegociation } from "@/lib/negociation";
import type React from "react";
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

function renderSheet(
  offreJoueur: number,
  extra: Partial<React.ComponentProps<typeof NegociationSheet>> = {},
) {
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
      {...extra}
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

describe("NegociationSheet — repère prix d'achat (vente)", () => {
  it("transmet le prix d'achat à la barre de négo (pastille visible)", () => {
    renderSheet(80, { achat: 12 });
    expect(screen.getByText("12€")).toBeTruthy();
    expect(screen.getByText("achat")).toBeTruthy();
  });

  it("sans prix d'achat : aucune pastille", () => {
    renderSheet(80);
    expect(screen.queryByText("achat")).toBeNull();
  });
});

describe("NegociationSheet — mini-happening célébrité", () => {
  it("client ordinaire : ni aura, ni bandeau étoilé", () => {
    renderSheet(80, { nomAffiche: "Monsieur Durand" });
    expect(screen.queryByTestId("aura-celebrite")).toBeNull();
    expect(screen.getByText("Monsieur Durand")).toBeTruthy();
    expect(screen.queryByText(/✦/)).toBeNull();
  });

  it("célébrité : aura autour du portrait et bandeau luxueux étoilé", () => {
    renderSheet(80, { celebrite: true, nomAffiche: "Lady Westmorland" });
    expect(screen.getByTestId("aura-celebrite")).toBeTruthy();
    expect(screen.getByText("✦ Lady Westmorland ✦")).toBeTruthy();
  });
});

/**
 * Cible pointillée du grand-père (tutoriel, journée de vente) : le curseur du
 * joueur garde ses bornes naturelles, seul « Proposer » est gaté.
 */
describe("NegociationSheet — cible du grand-père", () => {
  it("Proposer est inerte hors de l'anneau", () => {
    renderSheet(80, { scriptTuto: { cible: { prix: 50, tolerance: 2 } } });
    const btn = screen.getByText(/Proposer 80/).closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Proposer s'active dans l'anneau, et l'anneau est dessiné", () => {
    const { container } = renderSheet(50, {
      scriptTuto: { cible: { prix: 50, tolerance: 2 } },
    });
    const btn = screen.getByText(/Proposer 50/).closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(container.querySelector("[data-nego-cible]")).toBeTruthy();
  });

  it("hors tutoriel : ni anneau, ni blocage", () => {
    const { container } = renderSheet(80);
    const btn = screen.getByText(/Proposer 80/).closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(container.querySelector("[data-nego-cible]")).toBeNull();
  });
});

/**
 * Leçon d'humeur (première vente du tutoriel) : la jauge est le seul signal
 * qui dit pourquoi un acheteur finit par partir. Le coach doit pouvoir la
 * viser — donc la trouver.
 */
describe("NegociationSheet — cible du coach sur la jauge d'humeur", () => {
  it("pose la cible sur la jauge quand la leçon la demande", () => {
    const { container } = renderSheet(80, { cibleCoachHumeur: true });
    const jauge = container.querySelector('[data-tuto-coach="vente-humeur"]');
    expect(jauge).toBeTruthy();
    // Cible utile : elle doit avoir une boîte, sinon TutorielCoach la traite
    // — à raison — comme introuvable.
    expect((jauge as HTMLElement).style.display).not.toBe("contents");
  });

  it("aucune cible le reste du temps", () => {
    const { container } = renderSheet(80);
    expect(container.querySelector('[data-tuto-coach="vente-humeur"]')).toBeNull();
  });
});
