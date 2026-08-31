// @vitest-environment jsdom
/**
 * Une pièce unique disparaît du carrousel de chargement du coffre : sans
 * explication, ça ressemble à un bug. La fiche d'objet est l'endroit où le
 * joueur va chercher pourquoi — elle doit donc porter la règle.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

/**
 * Depuis le 2026-08-28, la fiche reprend la mise en page du Bazar : l'objet,
 * ses étoiles, son nom gravé sur une plaque de laiton, et sous la plaque une
 * seule ligne — la valeur à gauche, le thème à droite. Rareté, libellé d'état
 * et prix d'achat ont quitté la fiche.
 */
describe("ObjetDetailOverlay — mise en page du Bazar", () => {
  const rendre = (props: Partial<{ prixMarche: number; prixMarcheConnu: boolean }> = {}) =>
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({
          templateId: "ma.lampe_petrole_ancienne",
          categorie: "Maison",
          etat: "Bon",
          prixAchat: 37,
        })}
        open
        onClose={() => {}}
        prixMarche={123.4}
        prixMarcheConnu
        {...props}
      />,
    );

  it("grave le nom sur la plaque de laiton, sous les étoiles d'état", () => {
    rendre();
    const etoiles = screen.getByTestId("etoiles-fiche");
    const plaque = screen.getByTestId("fiche-plaque");
    expect(plaque.textContent).toContain("Lampe");
    expect(
      etoiles.compareDocumentPosition(plaque) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("liste sous la plaque : prix marché, prix d'achat, thème", () => {
    rendre();
    const liste = screen.getByTestId("fiche-liste");
    const plaque = screen.getByTestId("fiche-plaque");
    expect(
      plaque.compareDocumentPosition(liste) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const items = liste.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain(DICTIONNAIRES.fr.inventaire.prixMarche);
    expect(screen.getByTestId("fiche-valeur").textContent).toBe("123 €");
    expect(items[1].textContent).toContain(DICTIONNAIRES.fr.inventaire.prixAchat);
    expect(items[1].textContent).toContain("37 €");
    expect(items[2].textContent).toContain(DICTIONNAIRES.fr.inventaire.themeMot);
    expect(screen.getByTestId("fiche-theme").textContent).toContain(
      DICTIONNAIRES.fr.categories.maison,
    );
  });

  it("écrit « 0 € (cadeau) » quand l'objet n'a pas été payé", () => {
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison", prixAchat: undefined })}
        open
        onClose={() => {}}
        prixMarche={10}
        prixMarcheConnu
      />,
    );
    expect(screen.getByText(DICTIONNAIRES.fr.inventaire.prixAchatCadeau)).toBeTruthy();
  });

  it("masque la valeur tant que Connaisseur n'est pas débloqué", () => {
    rendre({ prixMarcheConnu: false });
    expect(screen.getByTestId("fiche-valeur").textContent).toBe("? €");
  });

  it("ne montre plus ni rareté, ni libellé d'état", () => {
    rendre();
    expect(screen.queryByText(DICTIONNAIRES.fr.inventaire.rareteMot)).toBeNull();
    expect(screen.queryByText(DICTIONNAIRES.fr.inventaire.etatMot)).toBeNull();
  });

  it("se ferme par la croix en haut à droite", () => {
    const onClose = vi.fn();
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison" })}
        open
        onClose={onClose}
        prixMarche={10}
        prixMarcheConnu
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: DICTIONNAIRES.fr.commun.fermer }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ObjetDetailOverlay — voile", () => {
  it("floute ce qu'il y a derrière le voile", () => {
    render(
      <ObjetDetailOverlay
        objet={createMockObjet({ templateId: "ma.lampe_petrole_ancienne", categorie: "Maison" })}
        open
        onClose={() => {}}
        prixMarche={10}
        prixMarcheConnu
      />,
    );
    expect(screen.getByRole("dialog").style.backdropFilter).toContain("blur");
  });
});
