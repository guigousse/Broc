// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar } from "./ArticleBazar";

afterEach(cleanup);

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onAcheter = vi.fn();
  render(
    <ArticleBazar
      cle="case7"
      visuel={<span data-testid="visuel" />}
      libelle="5 pièces · Musique"
      prix={3}
      jetons={10}
      onAcheter={onAcheter}
      {...props}
    />,
  );
  return { onAcheter };
}

describe("ArticleBazar", () => {
  it("montre le visuel, le libellé et le prix", () => {
    monter();
    expect(screen.getByTestId("visuel")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5 pièces · Musique/ })).toBeTruthy();
    expect(screen.getByText("3 jetons")).toBeTruthy();
  });

  it("achète au tap quand la bourse suffit", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("hors de portée : bouton inerte, prix barré, et le manque chiffré au tap", () => {
    const { onAcheter } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    // `toHaveStyle` n'existe pas ici : le dépôt n'installe PAS @testing-library/jest-dom.
    // On lit la propriété de style directement.
    const prix = screen.getByText("12 jetons") as HTMLElement;
    expect(prix.style.textDecoration).toBe("line-through");
    // La bulle est portée par le conteneur : un bouton désactivé n'émet pas de clic.
    fireEvent.click(screen.getByTestId("article-case7"));
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("le singulier du manque est respecté", () => {
    monter({ prix: 6, jetons: 5 });
    fireEvent.click(screen.getByTestId("article-case7"));
    expect(screen.getByText("Il vous manque 1 jeton")).toBeTruthy();
  });
});
