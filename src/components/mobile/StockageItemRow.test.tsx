// @vitest-environment jsdom
/**
 * Cibles du coach portées par la première ligne du stockage (étoiles, thème,
 * bouton collection). Elles doivent toutes avoir une BOÎTE : une cible en
 * `display: contents` renvoie un rect 0×0 à l'origine, et TutorielCoach la
 * traite alors — à raison — comme introuvable, ce qui fait retomber la leçon
 * sur un voile plein sans halo (recette device 2026-08-19).
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { StockageItemRow } from "./StockageItemRow";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

afterEach(cleanup);

function renderRow(cibleCoach: boolean) {
  return render(
    <StockageItemRow
      objet={createMockObjet()}
      valeurConnue
      collection={{ disponible: true, necessiteConfirmation: false }}
      onTap={() => {}}
      onEnvoyerCollection={() => {}}
      cibleCoach={cibleCoach}
      isLast
    />,
  );
}

describe("StockageItemRow — cibles du coach", () => {
  it("pose les trois cibles quand la ligne est celle de la visite guidée", () => {
    const { container } = renderRow(true);
    for (const cible of ["stockage-etat", "stockage-theme", "stockage-bouton"]) {
      expect(container.querySelector(`[data-tuto-coach="${cible}"]`), cible).toBeTruthy();
    }
  });

  it("aucune cible n'est en `display: contents` (rect 0×0 = cible perdue)", () => {
    const { container } = renderRow(true);
    for (const el of container.querySelectorAll<HTMLElement>("[data-tuto-coach]")) {
      expect(el.style.display, el.dataset.tutoCoach).not.toBe("contents");
    }
  });

  it("ne pose aucune cible sur les autres lignes", () => {
    const { container } = renderRow(false);
    expect(container.querySelector("[data-tuto-coach]")).toBeNull();
  });
});
