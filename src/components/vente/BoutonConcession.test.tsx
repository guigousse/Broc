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
        prix={200}
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
        prix={200}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Améliorer le véhicule" }),
    ).toBeTruthy();
  });

  it("affiche le prix du palier suivant sur l'étiquette", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable
        prix={500}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(screen.getByText("500 €")).toBeTruthy();
  });

  it("sans budget : étiquette ternie, mais bouton toujours tapable", () => {
    const onOuvrir = vi.fn();
    const { container } = render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable
        prix={200}
        peutPayer={false}
        inerte={false}
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(bouton);
    expect(onOuvrir).toHaveBeenCalledTimes(1);

    // C'est l'étiquette qui porte le manque de budget, pas la voiture.
    const etiquette = screen.getByText("200 €");
    expect(etiquette.style.color).toBe("var(--ink-300)");
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("la voiture n'est jamais désaturée, quel que soit l'état", () => {
    const etats = [
      { ameliorable: true, peutPayer: true, inerte: false },
      { ameliorable: true, peutPayer: false, inerte: false },
      { ameliorable: false, peutPayer: true, inerte: false },
      { ameliorable: true, peutPayer: true, inerte: true },
    ];
    for (const etat of etats) {
      const { container } = render(
        <BoutonConcession
          actuel={ROGERS}
          prix={200}
          onOuvrir={() => {}}
          {...etat}
        />,
      );
      const bouton = container.querySelector("button")!;
      expect(bouton.style.filter).toBe("");
      cleanup();
    }
  });

  it("inerte : désactivé, non déclenchable, et estompé comme ses voisins", () => {
    const onOuvrir = vi.fn();
    render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable
        prix={200}
        peutPayer
        inerte
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button");
    expect(bouton.hasAttribute("disabled")).toBe(true);
    expect(Number(bouton.style.opacity)).toBeLessThan(1);
    fireEvent.click(bouton);
    expect(onOuvrir).not.toHaveBeenCalled();
  });

  it("pleine opacité quand le budget suffit et qu'il est actif", () => {
    render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable
        prix={200}
        peutPayer
        inerte={false}
        onOuvrir={() => {}}
      />,
    );
    expect(Number(screen.getByRole("button").style.opacity)).toBe(1);
  });

  it("palier max : voiture seule en couleur, sans étiquette, non déclenchable", () => {
    const onOuvrir = vi.fn();
    const { container } = render(
      <BoutonConcession
        actuel={ROGERS}
        ameliorable={false}
        prix={0}
        peutPayer
        inerte={false}
        onOuvrir={onOuvrir}
      />,
    );
    const bouton = screen.getByRole("button", {
      name: "Véhicule au niveau maximum",
    });
    expect(bouton.hasAttribute("disabled")).toBe(true);
    // Ni flèche ni prix : ils annonceraient un achat qui n'existe plus. C'est
    // cette absence — et non un grisage — qui distingue le trophée de l'état
    // « budget insuffisant », lequel garde son étiquette.
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByText(/€/)).toBeNull();
    expect(container.querySelector("img")).toBeTruthy();
    fireEvent.click(bouton);
    expect(onOuvrir).not.toHaveBeenCalled();
  });
});
