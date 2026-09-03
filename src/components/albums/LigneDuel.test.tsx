// @vitest-environment jsdom
/**
 * LigneDuel — coût/attaque/PV/texte/proie d'une carte de duel dans la fiche.
 *
 * Le dépôt n'installe pas jest-dom (cf. src/app/collection/page.test.tsx) :
 * pas de `toHaveTextContent`/`toBeInTheDocument`, on lit `textContent` et on
 * s'appuie sur le throw de `getByText`/`getByLabelText` quand l'élément est
 * absent.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LigneDuel } from "@/components/albums/LigneDuel";

afterEach(cleanup);

describe("LigneDuel", () => {
  it("affiche coût, attaque, PV, le texte et la proie", () => {
    render(<LigneDuel id="carte.tabouret_bois_patine" />); // 3, 2/4, Barrage, Maison → Mode
    expect(screen.getByLabelText("Coût").textContent).toContain("3");
    expect(screen.getByLabelText("Attaque").textContent).toContain("2");
    expect(screen.getByLabelText("PV").textContent).toContain("4");
    expect(screen.getByText("Barrage")).toBeTruthy();
    expect(screen.getByText("Casse : Mode")).toBeTruthy();
  });

  it("carte vanille : pas de ligne de texte", () => {
    render(<LigneDuel id="carte.marteau_menuisier" />);
    expect(screen.queryByTestId("duel-texte")).toBeNull();
  });
});
