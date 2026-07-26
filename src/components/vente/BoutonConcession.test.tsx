// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoutonConcession } from "./BoutonConcession";
import { CAMIONS } from "@/data/camion";

afterEach(cleanup);

const ROGERS = CAMIONS[0];
const BREAK = CAMIONS[1];

describe("BoutonConcession", () => {
  it("montre le profil du véhicule ACTUEL, pas du suivant", () => {
    const { container } = render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/coffre/rogers-profil.webp");
    expect(img?.getAttribute("src")).not.toContain(BREAK.visuelId);
  });

  it("porte un nom accessible non vide", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Améliorer le véhicule" }),
    ).toBeTruthy();
  });

  it("grisé sans budget, mais toujours tapable", () => {
    const onOuvrir = vi.fn();
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer={false}
        inerte={false}
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(false);
    expect(Number(bouton.style.opacity)).toBeLessThan(1);
    fireEvent.click(bouton);
    expect(onOuvrir).toHaveBeenCalledTimes(1);
  });

  it("inerte : désactivé et non déclenchable", () => {
    const onOuvrir = vi.fn();
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(bouton);
    expect(onOuvrir).not.toHaveBeenCalled();
  });

  it("pleine opacité quand le budget suffit et qu'il est actif", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });
});
