// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PorteSheet } from "./PorteSheet";

afterEach(cleanup);

/** La feuille ouverte, avec les trois sorties et des rappels espionnés. */
function poserLaPorte(surcharges: Partial<Parameters<typeof PorteSheet>[0]> = {}) {
  const onBazar = vi.fn();
  render(
    <PorteSheet
      open
      onClose={vi.fn()}
      vitrineActive={false}
      onChiner={vi.fn()}
      onVitrine={vi.fn()}
      bazarOuvert={false}
      joursAvantBazar={15}
      onBazar={onBazar}
      {...surcharges}
    />,
  );
  return { onBazar, bouton: screen.getByRole("button", { name: /Bazar/i }) };
}

describe("PorteSheet — la sortie Bazar", () => {
  it("montre le Bazar cadenassé et son compte à rebours avant l'ouverture", () => {
    // Le fond de la demande : le lieu se voit dès le premier jour, fermé.
    const { bouton } = poserLaPorte({ bazarOuvert: false, joursAvantBazar: 15 });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("J-15")).not.toBeNull();
    expect(screen.getByTestId("bazar-cadenas")).not.toBeNull();
  });

  it("un tap sur le Bazar fermé ne mène nulle part", async () => {
    const { onBazar, bouton } = poserLaPorte({ bazarOuvert: false, joursAvantBazar: 15 });
    await userEvent.click(bouton);
    expect(onBazar).not.toHaveBeenCalled();
  });

  it("une fois ouvert, ni cadenas ni compte à rebours, et le tap passe", async () => {
    const { onBazar, bouton } = poserLaPorte({ bazarOuvert: true, joursAvantBazar: 0 });
    expect((bouton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("bazar-cadenas")).toBeNull();
    expect(screen.queryByText(/^J-/)).toBeNull();
    await userEvent.click(bouton);
    expect(onBazar).toHaveBeenCalledTimes(1);
  });

  it("le verrou du tutoriel grise le Bazar SANS lui poser de cadenas", () => {
    // Deux raisons distinctes de griser : le cadenas ne signale que la
    // fermeture calendaire, jamais la main du coach.
    const { bouton } = poserLaPorte({
      bazarOuvert: true,
      joursAvantBazar: 0,
      tutoChiner: true,
    });
    expect((bouton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("bazar-cadenas")).toBeNull();
  });
});
