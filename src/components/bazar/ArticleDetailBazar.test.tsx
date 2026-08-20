// @vitest-environment jsdom
/**
 * La fiche d'un article du Bazar. Demandée à la recette du 2026-08-20 : taper
 * un article sur l'étagère l'achetait sur-le-champ, un doigt mal posé coûtait
 * une semaine de jetons sans rien demander.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ArticleDetailBazar, type ArticleDetail } from "./ArticleDetailBazar";

afterEach(cleanup);

const VITRINE: ArticleDetail = {
  genre: "vitrine",
  templateId: "jx.jeu_magnatimmo_annees_80",
  categorie: "Jeux & Loisirs",
  libelle: "Jeu Magnatimmo années 80",
  prix: 8,
};

const LOT: ArticleDetail = {
  genre: "pieces",
  categorie: "Musique",
  quantite: 5,
  libelle: "5 pièces · Musique",
  prix: 3,
};

function monter(
  article: ArticleDetail | null = VITRINE,
  jetons = 25,
  open = true,
) {
  const onAcheter = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ArticleDetailBazar
      article={article}
      open={open}
      jetons={jetons}
      onAcheter={onAcheter}
      onClose={onClose}
    />,
  );
  return { onAcheter, onClose, ...utils };
}

describe("ArticleDetailBazar", () => {
  it("fermée, elle ne rend rien", () => {
    const { container } = monter(VITRINE, 25, false);
    expect(container.firstChild).toBeNull();
  });

  it("sans article, elle ne rend rien même ouverte", () => {
    const { container } = monter(null);
    expect(container.firstChild).toBeNull();
  });

  it("l'objet de la vitrine : sa vignette EN GRAND, son nom, son prix", () => {
    monter();
    expect(screen.getByText("Jeu Magnatimmo années 80")).toBeTruthy();
    expect(screen.getByText("8 jetons")).toBeTruthy();
    const img = screen.getByRole("dialog").querySelector("img") as HTMLImageElement;
    // Plein format, PAS la vignette 384 px : ici l'objet occupe 75 vw.
    expect(img.getAttribute("src")).toBe(
      "/items/jx.jeu_magnatimmo_annees_80.webp",
    );
    // La découpe die-cut, comme sur l'étagère et dans le reste du jeu.
    expect(img.style.filter).toContain("#fdfaf2");
  });

  it("un lot de pièces : son engrenage EN GRAND, son libellé, son prix", () => {
    monter(LOT);
    expect(screen.getByText("5 pièces · Musique")).toBeTruthy();
    expect(screen.getByText("3 jetons")).toBeTruthy();
    // Aucun visuel d'objet : un lot n'est pas une pièce du catalogue.
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    // Le badge de quantité de l'engrenage.
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("template disparu du catalogue : la fiche reste, sans visuel, et achète", () => {
    const { onAcheter } = monter({
      genre: "vitrine",
      templateId: "zz.template_disparu",
      categorie: null,
      libelle: "zz.template_disparu",
      prix: 8,
    });
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("bourse suffisante : le bouton achète et referme la fiche", () => {
    const { onAcheter, onClose } = monter(VITRINE, 25);
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Le bouton n'est JAMAIS `disabled` nativement : un bouton désactivé ne
  // dispatche aucun clic, donc il ne peut rien expliquer — pas même le
  // chiffre que le joueur a besoin de lire. Règle acquise sur l'étagère à la
  // revue du 2026-08-20 (round 1), reprise ici avec l'achat.
  describe("bourse insuffisante", () => {
    it("le bouton n'est pas `disabled`, mais porte aria-disabled", () => {
      monter(VITRINE, 3);
      const bouton = screen.getByRole("button", { name: "Acheter" });
      expect(bouton.hasAttribute("disabled")).toBe(false);
      expect(bouton.getAttribute("aria-disabled")).toBe("true");
    });

    it("le bouton reste focusable au clavier", () => {
      monter(VITRINE, 3);
      const bouton = screen.getByRole("button", { name: "Acheter" });
      bouton.focus();
      expect(document.activeElement).toBe(bouton);
    });

    it("taper n'achète pas, ne ferme pas, et dit le manque", () => {
      const { onAcheter, onClose } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(onAcheter).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("status").textContent).toBe("Il vous manque 5 jetons");
    });

    it("le singulier du manque est respecté", () => {
      monter(VITRINE, 7);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.getByText("Il vous manque 1 jeton")).toBeTruthy();
    });

    it("le prix est barré, comme sur l'étiquette de l'étagère", () => {
      monter(VITRINE, 3);
      expect((screen.getByText("8 jetons") as HTMLElement).style.textDecoration).toBe(
        "line-through",
      );
    });

    // Le message reste affiché tant que la fiche est ouverte (elle est modale,
    // le joueur la referme lui-même) mais il ne doit pas survivre à un rendu
    // du parent, ni se traîner d'un article au suivant.
    it("le message ne survit pas à un changement d'article", () => {
      const { rerender } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.queryByRole("status")).toBeTruthy();
      rerender(
        <ArticleDetailBazar
          article={LOT}
          open
          jetons={0}
          onAcheter={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("le message survit à un rendu du parent qui ne change rien", () => {
      const { rerender } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      // Un objet d'article reconstruit à l'identique : c'est la VALEUR qui
      // compte, pas la référence, sinon le joueur perdrait son chiffre à la
      // frame suivante.
      rerender(
        <ArticleDetailBazar
          article={{ ...VITRINE }}
          open
          jetons={3}
          onAcheter={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByRole("status")).toBeTruthy();
    });

    it("le message disparaît dès que la bourse suffit", () => {
      const { rerender } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      rerender(
        <ArticleDetailBazar
          article={VITRINE}
          open
          jetons={99}
          onAcheter={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("fermeture", () => {
    it("taper le voile referme", () => {
      const { onClose } = monter();
      fireEvent.click(screen.getByRole("dialog"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("taper DANS la carte ne referme pas", () => {
      const { onClose } = monter();
      fireEvent.click(screen.getByText("Jeu Magnatimmo années 80"));
      expect(onClose).not.toHaveBeenCalled();
    });

    // Le voile se tape au doigt ; au clavier, rien ne l'atteint. Même idiome
    // que les sheets du QG.
    it("Échap referme", () => {
      const { onClose } = monter();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Échap ne fait rien quand la fiche est fermée", () => {
      const { onClose } = monter(VITRINE, 25, false);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
