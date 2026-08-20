// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar } from "./ArticleBazar";

afterEach(cleanup);

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onAcheter = vi.fn();
  const utils = render(
    <ArticleBazar
      cle="case1"
      visuel={<span data-testid="visuel" />}
      libelle="5 pièces · Musique"
      prix={3}
      jetons={10}
      onAcheter={onAcheter}
      {...props}
    />,
  );
  return { onAcheter, ...utils };
}

describe("ArticleBazar", () => {
  it("montre le visuel, le libellé et le prix", () => {
    monter();
    expect(screen.getByTestId("visuel")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5 pièces · Musique/ })).toBeTruthy();
    expect(screen.getByText("3 jetons")).toBeTruthy();
  });

  it("le singulier du prix est respecté", () => {
    monter({ prix: 1, jetons: 10 });
    expect(screen.getByText("1 jeton")).toBeTruthy();
  });

  it("achète au tap quand la bourse suffit", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("hors de portée : le prix est barré et aria-disabled est posé", () => {
    monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    expect(bouton.getAttribute("aria-disabled")).toBe("true");
    // `toHaveStyle` n'existe pas ici : le dépôt n'installe PAS @testing-library/jest-dom.
    // On lit la propriété de style directement.
    const prix = screen.getByText("12 jetons") as HTMLElement;
    expect(prix.style.textDecoration).toBe("line-through");
  });

  it("à portée : aria-disabled est absent ou faux", () => {
    monter({ prix: 3, jetons: 10 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    const valeur = bouton.getAttribute("aria-disabled");
    expect(valeur === null || valeur === "false").toBe(true);
  });

  it("hors de portée : taper l'image elle-même (le bouton) dit le manque, sans acheter", () => {
    const { onAcheter } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("hors de portée : le bouton reste focusable au clavier", () => {
    monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
  });

  it("le singulier du manque est respecté", () => {
    monter({ prix: 6, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 1 jeton")).toBeTruthy();
  });

  it("la bulle ne réapparaît pas seule si la bourse redescend après être devenue suffisante", () => {
    const { rerender } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();

    // La bourse remonte au-dessus du prix : la bulle doit disparaître.
    rerender(
      <ArticleBazar
        cle="case1"
        visuel={<span data-testid="visuel" />}
        libelle="5 pièces · Musique"
        prix={12}
        jetons={20}
        onAcheter={vi.fn()}
      />,
    );
    expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();

    // La bourse redescend en dessous du prix, sans nouveau tap : toujours rien.
    rerender(
      <ArticleBazar
        cle="case1"
        visuel={<span data-testid="visuel" />}
        libelle="5 pièces · Musique"
        prix={12}
        jetons={5}
        onAcheter={vi.fn()}
      />,
    );
    expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();
  });
});
