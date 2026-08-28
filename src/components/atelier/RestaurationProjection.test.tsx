// @vitest-environment jsdom
/**
 * Le tiroir d'un établi en cours montre le VOYAGE de l'objet : son état
 * d'aujourd'hui, une flèche, son état projeté — avec le temps restant
 * au-dessus de la flèche et l'accélération en dessous.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { RestaurationProjection } from "./RestaurationProjection";
import type { Objet } from "@/types/game";

afterEach(cleanup);

const objet = {
  id: "o1",
  templateId: "lampe-tiffany",
  categorie: "Maison",
  etat: "Bon",
  rarete: "commun",
} as unknown as Objet;

/** Étoiles pleines d'un des deux côtés. */
function etoilesPleines(testId: string): number {
  return Array.from(
    screen.getByTestId(`${testId}-etoiles`).querySelectorAll("svg"),
  ).filter((s) => s.getAttribute("fill") !== "transparent").length;
}

function poser() {
  render(
    <LangueProvider>
      <RestaurationProjection
        objet={objet}
        etatCible="Très bon"
        entete={<span>1 h 30</span>}
        action={<button type="button">Accélérer</button>}
      />
    </LangueProvider>,
  );
}

describe("RestaurationProjection", () => {
  it("montre l'état d'avant à gauche et l'état projeté à droite", () => {
    poser();
    expect(etoilesPleines("projection-avant")).toBe(1); // « Bon »
    expect(etoilesPleines("projection-apres")).toBe(2); // « Très bon »
  });

  it("porte le temps restant au-dessus de la flèche et l'action en dessous", () => {
    poser();
    expect(screen.getByText("1 h 30")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Accélérer" })).toBeTruthy();
  });
});
