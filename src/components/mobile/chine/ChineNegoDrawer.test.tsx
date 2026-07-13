// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChineNegoDrawer } from "./ChineNegoDrawer";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { relancerNegociation } from "@/lib/negociation";
import type { NegociationState, NegoPersona, ObjetEnVente } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function makeNego(patch: Partial<NegociationState> = {}): NegociationState {
  return {
    mode: "achat",
    tour: 3,
    humeur: 0.8,
    prixAdverseCourant: 80,
    cibleSecrete: 60,
    derniereOffreJoueur: 50,
    statut: "fache",
    message: { cle: "fache", variante: 0 },
    ...patch,
  };
}

function makeItem(negociation: NegociationState | null): ObjetEnVente {
  return {
    id: "item-1",
    objet: createMockObjet(),
    prixVendeur: 100,
    prixAffiche: true,
    prixMinAccept: 60,
    negociationsTentees: 3,
    statut: "disponible",
    persona,
    negociation,
  };
}

function renderDrawer(item: ObjetEnVente) {
  const onUpdateNego = vi.fn();
  const vue = render(
    <ChineNegoDrawer
      item={item}
      budget={1000}
      plein={false}
      expanded={true}
      onExpand={() => {}}
      onCollapse={() => {}}
      onUpdateNego={onUpdateNego}
      onConclu={() => {}}
      onAcheterDirect={() => {}}
    />,
  );
  return { onUpdateNego, vue };
}

describe("ChineNegoDrawer — Tchatche déplacée dans le dock", () => {
  it("n'affiche plus de bouton Tchatche sur une négo fâchée", () => {
    renderDrawer(makeItem(makeNego({ statut: "fache" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });

  it("n'affiche plus de bouton Tchatche sur un refus poli", () => {
    renderDrawer(makeItem(makeNego({ statut: "refus_poli" })));
    expect(screen.queryByText(/Tchatche/)).toBeNull();
  });
});

describe("ChineNegoDrawer — resynchronisation externe", () => {
  it("reflète une relance venue de l'extérieur (dock) : la négo redevient jouable", () => {
    const fache = makeNego({ statut: "fache" });
    const item = makeItem(fache);
    const { vue } = renderDrawer(item);
    // Fâché : pas de bouton Proposer.
    expect(screen.queryByText(/Proposer/)).toBeNull();

    // Le dock relance : nouvel objet negociation (référence différente).
    const relance = relancerNegociation(fache);
    vue.rerender(
      <ChineNegoDrawer
        item={{ ...item, negociation: relance }}
        budget={1000}
        plein={false}
        expanded={true}
        onExpand={() => {}}
        onCollapse={() => {}}
        onUpdateNego={() => {}}
        onConclu={() => {}}
        onAcheterDirect={() => {}}
      />,
    );
    expect(screen.getByText(/Proposer/)).toBeTruthy();
  });
});
