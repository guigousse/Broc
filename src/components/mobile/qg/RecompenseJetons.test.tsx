// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RecompenseJetons } from "./RecompenseJetons";

afterEach(cleanup);

describe("RecompenseJetons", () => {
  it("rend un jeton par gain non nul", () => {
    render(<RecompenseJetons recompense={{ argent: 200, xp: 300, energie: 2, jetons: 0 }} variante="bandeau" label="Récompense" />);
    expect(screen.getByTestId("jeton-argent").textContent).toContain("+200 €");
    expect(screen.getByTestId("jeton-xp").textContent).toContain("+300 XP");
    expect(screen.getByTestId("jeton-energie").textContent).toContain("+2 ⚡");
  });

  it("omet les jetons à 0", () => {
    render(<RecompenseJetons recompense={{ argent: 30, xp: 25, energie: 0, jetons: 0 }} variante="ligne" />);
    expect(screen.queryByTestId("jeton-energie")).toBeNull();
    expect(screen.getByTestId("jeton-argent")).toBeTruthy();
  });

  it("bandeau : affiche le label de tête", () => {
    render(<RecompenseJetons recompense={{ argent: 30, xp: 25, energie: 0, jetons: 0 }} variante="bandeau" label="Récompense" />);
    expect(screen.getByText("Récompense")).toBeTruthy();
  });

  it("affiche une pastille de jetons quand la récompense en contient", () => {
    render(
      <RecompenseJetons
        recompense={{ argent: 0, xp: 0, energie: 0, jetons: 3 }}
        variante="ligne"
      />,
    );
    expect(screen.getByText("+3 jetons")).toBeTruthy();
  });

  it("accorde le singulier", () => {
    render(
      <RecompenseJetons
        recompense={{ argent: 0, xp: 0, energie: 0, jetons: 1 }}
        variante="ligne"
      />,
    );
    expect(screen.getByText("+1 jeton")).toBeTruthy();
  });

  it("n'affiche aucune pastille de jetons à zéro", () => {
    render(
      <RecompenseJetons
        recompense={{ argent: 10, xp: 0, energie: 0, jetons: 0 }}
        variante="ligne"
      />,
    );
    expect(screen.queryByText(/jeton/)).toBeNull();
  });

  it("l'annonce vocale mentionne aussi les jetons — pas seulement argent/XP/énergie", () => {
    render(
      <RecompenseJetons
        recompense={{ argent: 30, xp: 25, energie: 1, jetons: 3 }}
        variante="ligne"
      />,
    );
    expect(screen.getByRole("group").getAttribute("aria-label")).toContain("3 jetons");
  });
});
