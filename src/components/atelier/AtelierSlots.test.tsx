// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AtelierSlots } from "./AtelierSlots";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function renderSlots(p: Partial<Parameters<typeof AtelierSlots>[0]> = {}) {
  const props = {
    slotsDebloques: 0 as const,
    enCours: [],
    now: 1_000_000,
    prochaineUpgrade: { cout: 100 },
    onAcheterSlot: vi.fn(),
    onSlotVide: vi.fn(),
    onEnCours: vi.fn(),
    onRecuperer: vi.fn(),
    ...p,
  };
  render(
    <LangueProvider>
      <AtelierSlots {...props} />
    </LangueProvider>,
  );
  return props;
}

describe("AtelierSlots", () => {
  it("rend toujours 3 carrés ; tous verrouillés à 0 slot", () => {
    const p = renderSlots();
    const carres = screen.getAllByRole("button");
    expect(carres.length).toBe(3);
    fireEvent.click(carres[0]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("slot vide débloqué → onSlotVide ; verrouillé au-delà", () => {
    const p = renderSlots({ slotsDebloques: 1 });
    const carres = screen.getAllByRole("button");
    fireEvent.click(carres[0]);
    expect(p.onSlotVide).toHaveBeenCalledTimes(1);
    fireEvent.click(carres[1]);
    expect(p.onAcheterSlot).toHaveBeenCalledTimes(1);
  });

  it("affiche le prix sur le premier carré verrouillé seulement", () => {
    renderSlots({ slotsDebloques: 1, prochaineUpgrade: { cout: 200 } });
    expect(screen.getAllByText(/200/).length).toBe(1);
  });
});
