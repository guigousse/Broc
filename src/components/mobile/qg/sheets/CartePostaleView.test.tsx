// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartePostaleView } from "./CartePostaleView";
import { CARTES_POSTALES } from "@/data/cartesPostales";
import { creerCartePostale } from "@/lib/courrier";

afterEach(cleanup);

const carte1 = CARTES_POSTALES[0]; // Venise, avec timbre
const carte5 = CARTES_POSTALES[4]; // Carte sans timbre
const courrier1 = creerCartePostale(1, 20);
const courrier5 = creerCartePostale(5, 60);

describe("CartePostaleView", () => {
  it("arrive côté recto : illustration + indice, pas encore retournée", () => {
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    const racine = screen.getByTestId("carte-postale");
    expect(racine.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByAltText("Carte de Venise")).toBeTruthy();
    expect(screen.getByText("Touchez pour retourner")).toBeTruthy();
    // Le verso reste lisible (lecteur d'écran) même côté recto : présent dans
    // le DOM avant tout retournement, pas seulement après un tap.
    expect(screen.getByText(/lagune/)).toBeTruthy();
  });

  it("tap → verso (texte + timbre VENEZIA), second tap → recto", async () => {
    const user = userEvent.setup();
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    const racine = screen.getByTestId("carte-postale");
    await user.click(racine);
    expect(racine.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("timbre")).toBeTruthy();
    expect(screen.getByText("VENEZIA")).toBeTruthy();
    // Le corps (traduit à l'affichage) est présent dans le DOM.
    expect(screen.getByText(/lagune/)).toBeTruthy();
    await user.click(racine);
    expect(racine.getAttribute("aria-pressed")).toBe("false");
  });

  it("carte 5 : aucun timbre au verso", async () => {
    const user = userEvent.setup();
    render(<CartePostaleView courrier={courrier5} carte={carte5} />);
    await user.click(screen.getByTestId("carte-postale"));
    expect(screen.queryByTestId("timbre")).toBeNull();
  });

  it("image manquante → fallback avec le titre, sans balise img", () => {
    render(<CartePostaleView courrier={courrier1} carte={carte1} />);
    fireEvent.error(screen.getByAltText("Carte de Venise"));
    expect(screen.queryByAltText("Carte de Venise")).toBeNull();
    expect(screen.getByTestId("recto-fallback").textContent).toBe("Carte de Venise");
  });
});
