// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineNegoDrawer } from "./ChineNegoDrawer";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
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
    message: "« Vous vous moquez de moi ! »",
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

function renderDrawer(
  item: ObjetEnVente,
  consommer: () => boolean,
  restantes = 2,
) {
  const onUpdateNego = vi.fn();
  render(
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
      tchatche={{ restantes, consommer }}
    />,
  );
  return { onUpdateNego };
}

describe("ChineNegoDrawer — La Tchatche (N15)", () => {
  it("ne consomme pas le quota sur une négo « conclu » (le bouton n'apparaît même pas)", () => {
    const consommer = vi.fn(() => true);
    const item = makeItem(makeNego({ statut: "conclu" }));
    renderDrawer(item, consommer);

    expect(screen.queryByText(/La Tchatche/)).toBeNull();
    expect(consommer).not.toHaveBeenCalled();
  });

  it("sur une négo « fache », consomme le quota et rouvre la négo", () => {
    const consommer = vi.fn(() => true);
    const item = makeItem(makeNego({ statut: "fache" }));
    const { onUpdateNego } = renderDrawer(item, consommer);

    const btn = screen.getByText(/La Tchatche/);
    fireEvent.click(btn);

    expect(consommer).toHaveBeenCalledTimes(1);
    expect(onUpdateNego).toHaveBeenCalledTimes(1);
    expect(onUpdateNego.mock.calls[0][0].statut).toBe("en_cours");
  });

  it("si consommer() renvoie false (quota épuisé côté état global), la négo reste inchangée", () => {
    const consommer = vi.fn(() => false);
    const item = makeItem(makeNego({ statut: "fache" }));
    const { onUpdateNego } = renderDrawer(item, consommer);

    const btn = screen.getByText(/La Tchatche/);
    fireEvent.click(btn);

    expect(consommer).toHaveBeenCalledTimes(1);
    expect(onUpdateNego).not.toHaveBeenCalled();
  });
});
