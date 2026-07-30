// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChineSlideVue, type ChineSlide } from "./ChineSlide";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import type { NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeItem(): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 0,
    statut: "disponible",
    persona,
    negociation: null,
  };
}

function makeSlide(dejaPossede: boolean, estNouveau = false): ChineSlide {
  return {
    kind: "item",
    item: makeItem(),
    estRareOuPlus: false,
    coteConnue: false,
    dejaPossede,
    estNouveau,
  };
}

describe("ChineSlideVue — badge collection", () => {
  it("affiche le badge ✓ quand le template a déjà été possédé", () => {
    render(<ChineSlideVue slide={makeSlide(true)} />);
    expect(
      screen.getByLabelText("Déjà possédé dans la collection"),
    ).toBeTruthy();
  });

  it("pas de badge pour une découverte jamais possédée", () => {
    render(<ChineSlideVue slide={makeSlide(false)} />);
    expect(
      screen.queryByLabelText("Déjà possédé dans la collection"),
    ).toBeNull();
  });
});

describe("ChineSlideVue — découverte", () => {
  it("affiche la pill « Nouveau » sur un template jamais croisé", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    expect(screen.getByText("Nouveau")).toBeTruthy();
  });

  it("pas de pill sur un template déjà croisé", () => {
    render(<ChineSlideVue slide={makeSlide(false, false)} />);
    expect(screen.queryByText("Nouveau")).toBeNull();
  });

  it("la pill porte la classe de pulsation", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    expect(
      screen.getByText("Nouveau").classList.contains("broc-pill-nouveau"),
    ).toBe(true);
  });

  it("la pill expose la couleur de halo de la rareté", () => {
    render(<ChineSlideVue slide={makeSlide(false, true)} />);
    const pill = screen.getByText("Nouveau") as HTMLElement;
    expect(pill.style.getPropertyValue("--pill-halo")).not.toBe("");
  });
});
