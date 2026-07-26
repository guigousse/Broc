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
        ameliorable
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
        ameliorable
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
        ameliorable
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
        ameliorable
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
        ameliorable
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });

  it("palier max (ameliorable=false) : trophée grisé, sans clé, non déclenchable", () => {
    const onOuvrir = vi.fn();
    const { container } = render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable={false}
        peutPayer
        inerte={false}
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button", {
      name: "Véhicule au niveau maximum",
    });
    expect(bouton.hasAttribute("disabled")).toBe(true);
    // Pas de clé à molette : elle promettrait une amélioration qui n'existe
    // plus.
    expect(container.querySelector("svg")).toBeNull();
    fireEvent.click(bouton);
    expect(onOuvrir).not.toHaveBeenCalled();
  });

  it("palier max : grisaille distincte de l'état « budget insuffisant »", () => {
    // Les deux états ne doivent pas se ressembler au point de se confondre :
    // le manque de budget reste tapable et peu grisé, le trophée est
    // inerte et totalement désaturé.
    const { container: sansBudget } = render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable
        peutPayer={false}
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    const boutonSansBudget = sansBudget.querySelector("button")!;

    cleanup();

    const { container: max } = render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable={false}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    const boutonMax = max.querySelector("button")!;

    expect(boutonSansBudget.style.filter).not.toBe(boutonMax.style.filter);
    expect(Number(boutonSansBudget.style.opacity)).not.toBe(
      Number(boutonMax.style.opacity),
    );
    expect(boutonMax.hasAttribute("disabled")).toBe(true);
    expect(boutonSansBudget.hasAttribute("disabled")).toBe(false);
  });
});
