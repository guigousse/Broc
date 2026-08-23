// @vitest-environment jsdom
/**
 * La porte du Bazar. Elle faisait sortir droit au bureau ; depuis le
 * 2026-08-23 elle propose les MÊMES choix que celle du bureau — chiner,
 * étaler, rentrer — pour que le joueur aille où il veut sans repasser par
 * chez lui.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PorteBazarSheet } from "./PorteBazarSheet";

afterEach(cleanup);

function poser(surcharges: Partial<Parameters<typeof PorteBazarSheet>[0]> = {}) {
  const rappels = { onChiner: vi.fn(), onEtaler: vi.fn(), onBureau: vi.fn() };
  render(<PorteBazarSheet open onClose={vi.fn()} {...rappels} {...surcharges} />);
  return rappels;
}

describe("PorteBazarSheet", () => {
  it("offre les trois sorties", () => {
    poser();
    expect(screen.getByRole("button", { name: "Chiner" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Étaler" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Bureau" })).not.toBeNull();
  });

  it("fermée, elle ne montre aucune sortie", () => {
    poser({ open: false });
    expect(screen.queryByRole("button", { name: "Chiner" })).toBeNull();
  });

  it("chaque sortie appelle la sienne", async () => {
    const { onChiner, onEtaler, onBureau } = poser();
    await userEvent.click(screen.getByRole("button", { name: "Chiner" }));
    await userEvent.click(screen.getByRole("button", { name: "Étaler" }));
    await userEvent.click(screen.getByRole("button", { name: "Bureau" }));
    expect(onChiner).toHaveBeenCalledTimes(1);
    expect(onEtaler).toHaveBeenCalledTimes(1);
    expect(onBureau).toHaveBeenCalledTimes(1);
  });

  /**
   * Le stockage plein bloque le chinage, ici comme à la porte du bureau : on
   * ne part pas chiner sans place où poser ce qu'on rapporte. Le bouton grise
   * et dit pourquoi — sans le message, un bouton mort n'est qu'une panne.
   */
  it("stockage plein : chiner grise, et dit pourquoi", async () => {
    const { onChiner } = poser({ chinerDesactive: true });
    const bouton = screen.getByRole("button", { name: "Chiner" }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(screen.getByText("Stockage plein")).not.toBeNull();
    await userEvent.click(bouton);
    expect(onChiner).not.toHaveBeenCalled();
  });

  /** Rentrer au bureau reste possible même quand le stockage déborde. */
  it("stockage plein : rentrer et étaler restent ouverts", () => {
    poser({ chinerDesactive: true });
    expect((screen.getByRole("button", { name: "Bureau" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Étaler" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
