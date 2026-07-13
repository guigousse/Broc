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

function makeSlide(dejaPossede: boolean): ChineSlide {
  return {
    kind: "item",
    item: makeItem(),
    estRareOuPlus: false,
    coteConnue: false,
    dejaPossede,
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
