// @vitest-environment jsdom
/**
 * Ordre de la liste de tarification. Pendant le tutoriel, le coffre contient
 * cinq objets dont trois sont déjà étiquetés par le grand-père : rangés dans
 * l'ordre de chargement, les deux seuls à tarifer se retrouvaient noyés au
 * milieu — le joueur devait chercher ce qu'on lui demandait (recette device
 * 2026-08-19). Ce qui attend une action passe en tête.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CoffrePricing } from "./CoffrePricing";
import { createMockObjetEnVitrine } from "@/lib/__test-fixtures__/gameState";
import type { ObjetEnVitrine } from "@/types/game";

afterEach(cleanup);

function ov(templateId: string, nom: string, prixVente = 30): ObjetEnVitrine {
  return createMockObjetEnVitrine({ objet: { templateId, nom }, prixVente });
}

const COFFRE = [
  ov("prefill.a", "Ukulélé"),
  ov("joueur.carafe", "Carafe"),
  ov("prefill.b", "Boîte à outils"),
  ov("prefill.c", "Lampe"),
];

function renderListe(tuto: boolean) {
  return render(
    <CoffrePricing
      coffre={COFFRE}
      onAjusterPrix={() => {}}
      onRetour={() => {}}
      onValider={() => {}}
      validerLabel="Continuer"
      categoriesConnues={new Set()}
      readOnlyTemplateIds={
        tuto ? new Set(["prefill.a", "prefill.b", "prefill.c"]) : undefined
      }
      cibles={tuto ? { "joueur.carafe": 26 } : null}
    />,
  );
}

/** Noms des objets, dans l'ordre où ils apparaissent à l'écran. */
function ordreAffiche(): string[] {
  return screen
    .getAllByText(/Ukulélé|Carafe|Boîte à outils|Lampe/)
    .map((el) => el.textContent ?? "");
}

describe("CoffrePricing — ordre de la liste", () => {
  it("remonte en tête ce que le joueur doit tarifer", () => {
    renderListe(true);
    expect(ordreAffiche()[0]).toBe("Carafe");
  });

  it("garde l'ordre du coffre pour tout le reste", () => {
    renderListe(true);
    expect(ordreAffiche()).toEqual(["Carafe", "Ukulélé", "Boîte à outils", "Lampe"]);
  });

  it("ne touche à rien hors tutoriel", () => {
    renderListe(false);
    expect(ordreAffiche()).toEqual(["Ukulélé", "Carafe", "Boîte à outils", "Lampe"]);
  });
});
