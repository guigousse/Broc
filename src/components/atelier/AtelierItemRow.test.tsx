// @vitest-environment jsdom
/**
 * Disposition de la ligne d'atelier.
 *
 * Les commandes vivaient dans une TROISIÈME colonne, à droite du texte : deux
 * boutons y prenaient assez de largeur pour rogner le nom de l'objet à cinq
 * ou six lettres. Elles descendent sur la LIGNE DE L'ÉTAT — celle des étoiles
 * et du thème — et le titre récupère toute la largeur de la carte (demande de
 * l'auteur, 2026-08-26).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AtelierItemRow } from "./AtelierItemRow";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      inventaire: {
        etatCategorieAria: "{etat} · {categorie}",
        transitionEtatAria: "{etat} → {cible} · {categorie}",
      },
      categories: { musique: "Musique", bricolage: "Bricolage" },
      etats: {},
    },
    tr: (g: string, p: Record<string, unknown>) =>
      g.replace(/\{(\w+)\}/g, (_, k) => String(p[k])),
    locale: "fr",
  }),
}));

vi.mock("@/lib/i18n/libelles", () => ({
  libelleCategorie: () => "Musique",
  libelleEtat: () => "Bon",
}));

afterEach(cleanup);

function poser() {
  return render(
    <AtelierItemRow
      objet={createMockObjet({ categorie: "Musique", etat: "Bon" })}
      metaLigne={<span>meta</span>}
      action={<button type="button">agir</button>}
      isLast
    />,
  );
}

describe("AtelierItemRow — les commandes sous le titre", () => {
  it("la ligne n'a plus que DEUX colonnes : la vignette et le texte", () => {
    const { container } = poser();
    const row = container.querySelector("[data-atelier-row]") as HTMLElement;
    expect(row.style.gridTemplateColumns).toBe("67px 1fr");
  });

  it("les commandes sont dans la même boîte que les étoiles, poussées à droite", () => {
    poser();
    const bouton = screen.getByText("agir");
    // La boîte de l'état porte l'aria-label de l'état : on remonte jusqu'à
    // elle plutôt que de compter des niveaux, qu'un habillage ferait bouger.
    const ligneEtat = bouton.closest("[aria-label]") as HTMLElement;
    expect(ligneEtat).toBeTruthy();
    expect(ligneEtat.getAttribute("aria-label")).toContain("Bon");
    expect(ligneEtat.style.justifyContent).toBe("space-between");
  });

  it("le titre n'est plus rogné par les commandes : il occupe la colonne entière", () => {
    const { container } = poser();
    const titre = container.querySelector("[data-atelier-titre]") as HTMLElement;
    expect(titre).toBeTruthy();
    // `nowrap` + ellipsis restent — un nom très long doit finir par se
    // couper — mais sur toute la largeur, pas sur un tiers.
    expect(titre.style.textOverflow).toBe("ellipsis");
    expect(titre.closest("[data-atelier-row]")?.children).toHaveLength(2);
  });
});
