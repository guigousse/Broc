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
  genre: "objet",
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
  resultat: { ok: boolean; raison?: string } = { ok: true },
) {
  const onAcheter = vi.fn().mockReturnValue(resultat);
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
    expect(screen.getByText("8 Bazarcoins")).toBeTruthy();
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
    expect(screen.getByText("3 Bazarcoins")).toBeTruthy();
    // Aucun visuel d'objet : un lot n'est pas une pièce du catalogue.
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    // Le badge de quantité de l'engrenage.
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("template disparu du catalogue : la fiche reste, sans visuel, et achète", () => {
    const { onAcheter } = monter({
      genre: "objet",
      templateId: "zz.template_disparu",
      categorie: null,
      libelle: "zz.template_disparu",
      prix: 8,
    });
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("bourse suffisante : le prix garde l'encre de la carte", () => {
    monter(VITRINE, 99);
    const prix = screen.getByText("8 Bazarcoins") as HTMLElement;
    expect(prix.style.color).toBe("var(--forest-800)");
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
      expect(screen.getByRole("status").textContent).toBe("Il vous manque 5 Bazarcoins");
    });

    it("le singulier du manque est respecté", () => {
      monter(VITRINE, 7);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.getByText("Il vous manque 1 Bazarcoin")).toBeTruthy();
    });

    // Même règle que sur l'étiquette de l'étagère, et elle a changé le
    // 2026-08-20 : le prix n'est plus BARRÉ, il s'ÉTEINT. La rature rayait un
    // chiffre qu'on cherche justement à lire.
    it("le prix s'éteint, il n'est pas barré", () => {
      monter(VITRINE, 3);
      const prix = screen.getByText("8 Bazarcoins") as HTMLElement;
      expect(prix.style.color).toBe("var(--ink-300)");
      expect(prix.style.textDecoration).not.toBe("line-through");
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
          onAcheter={vi.fn().mockReturnValue({ ok: true })}
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
          onAcheter={vi.fn().mockReturnValue({ ok: true })}
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
          onAcheter={vi.fn().mockReturnValue({ ok: true })}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  // ── Refus venu du JEU (pas de la bourse) ─────────────────────────────────
  // Un refus est précisément le moment où le joueur a besoin de RESTER pour
  // lire pourquoi : refermer la fiche cacherait la réponse et le renverrait
  // taper l'étagère sans rien savoir. Le canal est unique — la fiche —, le
  // toast de la page ayant été retiré : transitoire, il partait tout seul.
  describe("achat refusé par le jeu", () => {
    it("la fiche RESTE ouverte et affiche la raison", () => {
      const { onClose } = monter(VITRINE, 99, true, {
        ok: false,
        raison: "Stockage plein",
      });
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(onClose).not.toHaveBeenCalled();
      // Toujours montée, et la raison est lisible.
      expect(screen.getByRole("dialog")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe("Stockage plein");
    });

    it("un refus SANS raison n'est jamais muet", () => {
      monter(VITRINE, 99, true, { ok: false });
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.getByRole("status").textContent).toBe("Achat impossible.");
    });

    it("la raison remplace le message du manque, elle ne s'empile pas dessus", () => {
      // Bourse courte : le joueur voit d'abord le chiffre qui manque…
      const { rerender } = monter(VITRINE, 3);
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.getByRole("status").textContent).toBe("Il vous manque 5 Bazarcoins");
      // … puis la bourse suffit, et c'est le jeu qui refuse.
      rerender(
        <ArticleDetailBazar
          article={VITRINE}
          open
          jetons={99}
          onAcheter={vi.fn().mockReturnValue({ ok: false, raison: "Stockage plein" })}
          onClose={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.getByRole("status").textContent).toBe("Stockage plein");
    });

    it("changer d'article efface la raison", () => {
      const { rerender } = monter(VITRINE, 99, true, {
        ok: false,
        raison: "Stockage plein",
      });
      fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
      expect(screen.queryByRole("status")).toBeTruthy();
      rerender(
        <ArticleDetailBazar
          article={LOT}
          open
          jetons={99}
          onAcheter={vi.fn().mockReturnValue({ ok: true })}
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
