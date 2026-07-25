// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CadreBilan } from "./CadreBilan";

afterEach(cleanup);

describe("CadreBilan", () => {
  it("affiche le titre, le nom de la brocante et la mention", () => {
    render(
      <CadreBilan
        titre="Bilan de chinage"
        sousTitre="Brocante de Sarlat"
        mention="3 objets · −125 €"
      />,
    );
    expect(screen.getByText("Bilan de chinage")).toBeTruthy();
    expect(screen.getByText("Brocante de Sarlat")).toBeTruthy();
    expect(screen.getByText("3 objets · −125 €")).toBeTruthy();
  });

  it("le titre est un en-tête accessible", () => {
    render(<CadreBilan titre="Bilan de chinage" sousTitre="Sarlat" mention="Les poches vides." />);
    expect(screen.getByRole("heading", { name: "Bilan de chinage" })).toBeTruthy();
  });
});
