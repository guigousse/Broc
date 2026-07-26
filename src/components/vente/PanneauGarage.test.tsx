// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PanneauGarage } from "./PanneauGarage";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const BREAK = CAMIONS[1]; // Break — 16 places, 200 €

describe("PanneauGarage", () => {
  it("affiche le surtitre, le nom, la capacité et le prix du palier suivant", () => {
    render(<PanneauGarage prochain={BREAK} peutPayer onOuvrir={() => {}} />);
    expect(screen.getByText("Concession")).toBeTruthy();
    expect(screen.getByText("Break")).toBeTruthy();
    expect(screen.getByText("16 places · 200 €")).toBeTruthy();
  });

  it("ne rend rien quand il n'y a plus de palier", () => {
    const { container } = render(
      <PanneauGarage prochain={null} peutPayer onOuvrir={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("grisé sans budget, mais toujours cliquable", () => {
    const onOuvrir = vi.fn();
    render(
      <PanneauGarage prochain={BREAK} peutPayer={false} onOuvrir={onOuvrir} />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(false);
    expect(Number(bouton.style.opacity)).toBeLessThan(1);
    fireEvent.click(bouton);
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it("pleine opacité quand le budget suffit", () => {
    render(<PanneauGarage prochain={BREAK} peutPayer onOuvrir={() => {}} />);
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });
});
