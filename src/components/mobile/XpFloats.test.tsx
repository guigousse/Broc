// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useXpFloats, XpFloatsVue, XP_FLOAT_DUREE_MS } from "./XpFloats";

/** Petit harnais : un bouton qui pousse un gain d'XP au clic. */
function Harnais({ montant = 10 }: { montant?: number }) {
  const { floats, pousserXp } = useXpFloats();
  return (
    <>
      <button type="button" onClick={() => pousserXp(montant)}>
        déclencher
      </button>
      <XpFloatsVue floats={floats} />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("XpFloats", () => {
  it("pousserXp affiche « +10 XP », qui disparaît après XP_FLOAT_DUREE_MS", () => {
    render(<Harnais montant={10} />);
    act(() => {
      screen.getByRole("button", { name: "déclencher" }).click();
    });
    expect(screen.getByText("+10 XP")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(XP_FLOAT_DUREE_MS - 1);
    });
    expect(screen.getByText("+10 XP")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("+10 XP")).toBeNull();
  });

  it("plusieurs gains rapprochés s'empilent (2 floats simultanés)", () => {
    render(<Harnais montant={5} />);
    const btn = screen.getByRole("button", { name: "déclencher" });
    act(() => {
      btn.click();
    });
    act(() => {
      btn.click();
    });
    expect(screen.getAllByText("+5 XP")).toHaveLength(2);
  });
});
