// @vitest-environment jsdom
/**
 * « L'objet doit toujours être visible en entier » — recette du 2026-08-20 sur
 * téléphone. Le Bazar pose l'engrenage d'un lot dans une case CARRÉE dont la
 * largeur suit l'écran ; une taille en pixels ne peut pas y promettre « ça
 * tient ». La case ne rogne plus rien : c'est donc à l'icône de ne jamais
 * dépasser.
 *
 * jsdom n'a pas de moteur de layout : seul le style en ligne peut en témoigner.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PieceIcon } from "./PieceIcon";

afterEach(cleanup);

describe("PieceIcon", () => {
  it("ne dépasse jamais sa boîte, quelle que soit la taille demandée", () => {
    const { container } = render(<PieceIcon categorie="Musique" size={480} />);
    const boite = container.firstElementChild as HTMLElement;
    expect(boite.style.maxWidth).toBe("100%");
    expect(boite.style.maxHeight).toBe("100%");
  });

  it("le dessin suit la boîte, il ne garde pas la taille demandée en dur", () => {
    // Sans ça, le plafond raboterait le conteneur pendant que l'engrenage,
    // dimensionné par l'attribut `width`/`height` que lucide pose à partir de
    // `size`, continuerait d'en sortir.
    const { container } = render(<PieceIcon categorie="Musique" size={48} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.style.width).toBe("100%");
    expect(svg.style.height).toBe("100%");
  });

  it("garde la taille demandée comme taille souhaitée", () => {
    const { container } = render(<PieceIcon categorie="Musique" size={48} />);
    const boite = container.firstElementChild as HTMLElement;
    expect(boite.style.width).toBe("48px");
    expect(boite.style.height).toBe("48px");
  });

  // ── LA MÉDAILLE (refonte du 2026-08-26) ─────────────────────────────────
  // La pièce était un engrenage crème posé à plat, le logo du thème imprimé
  // dessus. Elle devient une médaille frappée : un corps de laiton biseauté,
  // un sillon gravé, un champ creusé et filé, et l'emblème EN RELIEF. Un seul
  // métal — c'est la lumière, jamais la couleur, qui distingue le dessin.
  describe("le relief de la médaille", () => {
    it("frappe un corps, un sillon, un champ creusé et un emblème", () => {
      const { container } = render(<PieceIcon categorie="Musique" size={48} />);
      for (const part of ["corps", "sillon", "champ", "embleme"]) {
        expect(container.querySelector(`[data-testid="piece-${part}"]`)).toBeTruthy();
      }
    });

    // À 18 px (les boutons de l'atelier), un sillon d'un demi-pixel et des
    // stries de métal filé ne sont plus du détail mais du bruit : ils salissent
    // le dessin au lieu de le creuser. Le corps et l'emblème, eux, restent.
    it("sous le seuil, le sillon et les stries s'effacent", () => {
      const { container } = render(<PieceIcon categorie="Musique" size={18} />);
      expect(container.querySelector('[data-testid="piece-sillon"]')).toBeNull();
      expect(container.querySelector('[data-testid="piece-stries"]')).toBeNull();
      expect(container.querySelector('[data-testid="piece-corps"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="piece-embleme"]')).toBeTruthy();
    });

    /**
     * Le relief est une FRACTION du diamètre, pas un nombre de pixels : un
     * décalage d'1 px qui creuse à 36 px disparaît à 150 et hurle à 18.
     */
    it("le relief de l'emblème grandit avec la pièce", () => {
      const decalage = (taille: number) => {
        cleanup();
        const { container } = render(<PieceIcon categorie="Musique" size={taille} />);
        const ombre = container.querySelector(
          '[data-testid="piece-embleme-ombre"]',
        ) as HTMLElement;
        return Number.parseFloat(ombre.style.transform.match(/-?[\d.]+px/)![0]);
      };
      expect(decalage(150)).toBeGreaterThan(decalage(36));
      expect(decalage(36)).toBeGreaterThan(0);
    });

    /**
     * UN SEUL MÉTAL. Le dessin ne doit à aucun moment être distingué par une
     * teinte étrangère — ni le vert de l'encre, ni le crème du papier : c'est
     * le relief qui le sépare du fond. Le badge de quantité, lui, n'est pas
     * frappé dans la pièce (il se pose dessus) : il a ses propres couleurs.
     */
    it("n'emploie que du laiton", () => {
      const { container } = render(<PieceIcon categorie="Musique" size={48} />);
      // Les teintes vivent pour partie dans des attributs SVG (`stop-color`,
      // `stroke`) et pour partie dans des styles en ligne : on relit tout le
      // balisage plutôt qu'un seul de ces deux endroits.
      const jetons = container.innerHTML.match(/--[a-z]+-\d+/g) ?? [];
      expect(jetons.length).toBeGreaterThan(0);
      for (const jeton of jetons) expect(jeton).toMatch(/^--brass-/);
    });
  });

  /**
   * Le badge n'est pas frappé dans la pièce : il se POSE dessus. CENTRÉ, et
   * descendu sous l'emblème (réglages de l'auteur, 2026-08-26) — il était
   * d'abord passé à droite, puis ramené dans l'axe. Son décalage suit le
   * diamètre, comme tout le reste : un badge calé à 3 px sous une pièce de
   * 150 px remonterait sur le champ.
   */
  it("le badge est centré, posé sous l'emblème, et son décalage suit le diamètre", () => {
    const bas = (taille: number) => {
      cleanup();
      const { container } = render(
        <PieceIcon categorie="Musique" size={taille} count={5} />,
      );
      const badge = container.querySelector("span > span:last-child") as HTMLElement;
      expect(badge.style.left).toBe("50%");
      expect(badge.style.transform).toBe("translateX(-50%)");
      return Number.parseFloat(badge.style.bottom);
    };
    expect(bas(150)).toBeLessThan(bas(36));
    expect(bas(36)).toBeLessThan(0);
  });

  it("affiche le badge de quantité quand `count` est fourni", () => {
    const { container } = render(
      <PieceIcon categorie="Musique" size={48} count={5} />,
    );
    expect(container.textContent).toBe("5");
  });
});
