// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RecompenseJetons } from "./RecompenseJetons";

afterEach(cleanup);

describe("RecompenseJetons", () => {
  it("rend un jeton par gain non nul", () => {
    render(<RecompenseJetons recompense={{ argent: 200, xp: 300, energie: 2, jetons: 0 }} variante="bandeau" label="Récompense" />);
    // SANS « + » : la plaque s'intitule « Récompense » et rien n'y est
    // jamais retiré. Le signe reste au grand livre, où il oppose un crédit
    // à un débit.
    expect(screen.getByTestId("jeton-argent").textContent).toBe("200 €");
    expect(screen.getByTestId("jeton-xp").textContent).toBe("300 XP");
    expect(screen.getByTestId("jeton-energie").textContent).toBe("2 ⚡");
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

  /**
   * La pastille montre le SIGNE, pas le mot — comme celle de l'énergie montre
   * un éclair. « +3 Bazarcoins » écrit en toutes lettres dans une pastille
   * de 9 px de police allongeait la ligne du carnet au point de la faire
   * passer à deux lignes. Le mot reste dans l'annonce vocale du groupe.
   */
  it("la pastille du Bazar montre le nombre et le signe, sans le mot", () => {
    const { container } = render(
      <RecompenseJetons
        recompense={{ argent: 0, xp: 0, energie: 0, jetons: 3 }}
        variante="ligne"
      />,
    );
    const pastille = screen.getByTestId("jeton-bazar");
    expect(pastille.textContent).toBe("3");
    expect(pastille.querySelector("svg")).toBeTruthy();
    expect(container.textContent).not.toContain("Bazarcoin");
  });

  /**
   * Le bleu de la devise, jusque dans le carnet : c'est lui qui distingue un
   * gain en Bazarcoins d'un gain en euros, sur une ligne qui peut porter les
   * deux.
   */
  it("la pastille du Bazar porte le bleu de la devise", () => {
    render(
      <RecompenseJetons
        recompense={{ argent: 0, xp: 0, energie: 0, jetons: 1 }}
        variante="ligne"
      />,
    );
    const pastille = screen.getByTestId("jeton-bazar");
    expect(pastille.style.color).toBe("var(--azur-400)");
    expect(pastille.textContent).toBe("1");
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
    expect(screen.getByRole("group").getAttribute("aria-label")).toContain("3 Bazarcoins");
  });
});
