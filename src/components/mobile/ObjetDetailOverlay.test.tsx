// @vitest-environment jsdom
/**
 * Une pièce unique disparaît du carrousel de chargement du coffre : sans
 * explication, ça ressemble à un bug. La fiche d'objet est l'endroit où le
 * joueur va chercher pourquoi — elle doit donc porter la règle.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ObjetDetailOverlay } from "./ObjetDetailOverlay";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

afterEach(cleanup);

describe("ObjetDetailOverlay — pièces uniques", () => {
  it("explique qu'une pièce unique ne se vend pas", () => {
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({ templateId: "uniq.mus.violon_paganini", categorie: "Musique" })}
        open
        onClose={() => {}}
        prixMarche={100}
        prixMarcheConnu
      />,
    );
    expect(screen.getByText(DICTIONNAIRES.fr.raisons.pieceUniqueProtegee)).toBeTruthy();
  });

  it("ne dit rien de tel sur un objet ordinaire", () => {
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison" })}
        open
        onClose={() => {}}
        prixMarche={100}
        prixMarcheConnu
      />,
    );
    expect(screen.queryByText(DICTIONNAIRES.fr.raisons.pieceUniqueProtegee)).toBeNull();
  });
});
