// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import { ArticleBazar, DUREE_BULLE_MS } from "./ArticleBazar";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";
import {
  QgEditProvider,
  useQgEditContext,
} from "@/components/mobile/qg/dev/QgEditContext";

afterEach(cleanup);

function monter(props: Partial<React.ComponentProps<typeof ArticleBazar>> = {}) {
  const onAcheter = vi.fn();
  const utils = render(
    <ArticleBazar
      cle="case1"
      visuel={<span data-testid="visuel" />}
      libelle="5 pièces · Musique"
      prix={3}
      jetons={10}
      onAcheter={onAcheter}
      {...props}
    />,
  );
  return { onAcheter, ...utils };
}

describe("ArticleBazar", () => {
  it("montre le visuel, le libellé et le prix", () => {
    monter();
    expect(screen.getByTestId("visuel")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5 pièces · Musique/ })).toBeTruthy();
    expect(screen.getByText("3 jetons")).toBeTruthy();
  });

  it("le singulier du prix est respecté", () => {
    monter({ prix: 1, jetons: 10 });
    expect(screen.getByText("1 jeton")).toBeTruthy();
  });

  it("achète au tap quand la bourse suffit", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
    expect(onAcheter).toHaveBeenCalledTimes(1);
  });

  it("hors de portée : le prix est barré et aria-disabled est posé", () => {
    monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    expect(bouton.getAttribute("aria-disabled")).toBe("true");
    // `toHaveStyle` n'existe pas ici : le dépôt n'installe PAS @testing-library/jest-dom.
    // On lit la propriété de style directement.
    const prix = screen.getByText("12 jetons") as HTMLElement;
    expect(prix.style.textDecoration).toBe("line-through");
  });

  it("à portée : aria-disabled est absent ou faux", () => {
    monter({ prix: 3, jetons: 10 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    const valeur = bouton.getAttribute("aria-disabled");
    expect(valeur === null || valeur === "false").toBe(true);
  });

  it("hors de portée : taper l'image elle-même (le bouton) dit le manque, sans acheter", () => {
    const { onAcheter } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();
    expect(onAcheter).not.toHaveBeenCalled();
  });

  it("hors de portée : le bouton reste focusable au clavier", () => {
    monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
  });

  it("le singulier du manque est respecté", () => {
    monter({ prix: 6, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 1 jeton")).toBeTruthy();
  });

  it("la bulle ne réapparaît pas seule si la bourse redescend après être devenue suffisante", () => {
    const { rerender } = monter({ prix: 12, jetons: 5 });
    const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
    fireEvent.click(bouton);
    expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();

    // La bourse remonte au-dessus du prix : la bulle doit disparaître.
    rerender(
      <ArticleBazar
        cle="case1"
        visuel={<span data-testid="visuel" />}
        libelle="5 pièces · Musique"
        prix={12}
        jetons={20}
        onAcheter={vi.fn()}
      />,
    );
    expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();

    // La bourse redescend en dessous du prix, sans nouveau tap : toujours rien.
    rerender(
      <ArticleBazar
        cle="case1"
        visuel={<span data-testid="visuel" />}
        libelle="5 pièces · Musique"
        prix={12}
        jetons={5}
        onAcheter={vi.fn()}
      />,
    );
    expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();
  });

  it("la bulle est brève : elle s'efface toute seule au bout de 2,5 s", () => {
    vi.useFakeTimers();
    try {
      monter({ prix: 12, jetons: 5 });
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      fireEvent.click(bouton);
      expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(DUREE_BULLE_MS - 1);
      });
      expect(screen.queryByText("Il vous manque 7 jetons")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("un nouveau tap réarme le minuteur au lieu d'en empiler un second", () => {
    vi.useFakeTimers();
    try {
      monter({ prix: 12, jetons: 5 });
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      fireEvent.click(bouton);
      act(() => {
        vi.advanceTimersByTime(DUREE_BULLE_MS - 100);
      });
      // Deuxième tap juste avant l'échéance : la bulle repart pour 2,5 s
      // pleines, et le minuteur du premier tap ne doit pas la couper.
      fireEvent.click(bouton);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByText("Il vous manque 7 jetons")).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(DUREE_BULLE_MS);
      });
      expect(screen.queryByText("Il vous manque 7 jetons")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("le minuteur est nettoyé au démontage", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, "clearTimeout");
    try {
      const { unmount } = monter({ prix: 12, jetons: 5 });
      fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
      clear.mockClear();
      unmount();
      expect(clear).toHaveBeenCalled();
    } finally {
      clear.mockRestore();
      vi.useRealTimers();
    }
  });

  // ── Revue du 2026-08-20, constat I1 ──────────────────────────────────────
  // jsdom n'a pas de moteur de layout : la seule trace observable de ces deux
  // défauts est le style en ligne. Le dépôt n'installe pas jest-dom, on lit
  // donc `element.style.*` directement.
  describe("les étiquettes ne poussent pas l'article hors de l'étagère", () => {
    it("le conteneur ne porte que le visuel : c'est LUI qui est ancré à la planche", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      // Deux enfants seulement : le bouton (dans le flux, donc ancré par
      // `bottom`) et la colonne d'étiquettes, hors flux.
      expect(article.children.length).toBe(2);
      const [bouton, etiquettes] = [...article.children] as HTMLElement[];
      expect(bouton.tagName).toBe("BUTTON");
      expect(etiquettes.style.position).toBe("absolute");
    });

    it("la colonne prix + bulle est suspendue SOUS la case, hors du flux", () => {
      monter();
      const etiquettes = screen.getByTestId("etiquettes-case1");
      expect(etiquettes.style.position).toBe("absolute");
      expect(etiquettes.style.top).toBe("calc(100% + 2px)");
      expect(etiquettes.style.left).toBe("50%");
      expect(etiquettes.style.transform).toBe("translateX(-50%)");
    });

    // Le fond du Bazar est un mur de sauge pâle : une étiquette écrite à même
    // l'illustration ne se lit pas (constat de recette sur capture du décor
    // fini). Le choix des teintes reste un jugement à l'œil, mais l'existence
    // de la plaque, elle, s'atteste.
    it("le prix est posé sur une plaque sombre, pas à même l'illustration", () => {
      monter();
      const prix = screen.getByText("3 jetons");
      expect(prix.style.backgroundColor).toBe("var(--forest-800)");
      expect(prix.style.color).toBe("var(--brass-300)");
      expect(prix.style.borderRadius).toBe("var(--radius-pill)");
    });

    it("la bulle du manque a la même plaque, et n'hérite plus de la couleur du corps de page", () => {
      monter({ prix: 12, jetons: 5 });
      fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
      const bulle = screen.getByRole("status");
      expect(bulle.style.backgroundColor).toBe("var(--forest-800)");
      expect(bulle.style.color).toBe("var(--brass-300)");
    });

    it("hors de portée, le prix garde sa rature SUR la plaque", () => {
      monter({ prix: 12, jetons: 5 });
      const prix = screen.getByText("12 jetons");
      expect(prix.style.backgroundColor).toBe("var(--forest-800)");
      expect(prix.style.textDecoration).toBe("line-through");
    });

    it("faire apparaître la bulle n'ajoute aucune rangée au conteneur", () => {
      monter({ prix: 12, jetons: 5 });
      const article = screen.getByTestId("article-case1");
      const avant = article.children.length;
      fireEvent.click(screen.getByRole("button", { name: /5 pièces · Musique/ }));
      expect(screen.getByText("Il vous manque 7 jetons")).toBeTruthy();
      expect(article.children.length).toBe(avant);
    });
  });

  // ── Case carrée, visuel centré : demande du 2026-08-20 ──────────────────
  // L'auteur cale le Bazar à la souris (`?qgedit=1`) et vise le CENTRE de la
  // case. Sans hauteur propre, la case n'existait qu'en largeur et le visuel,
  // ancré au pied, débordait vers le haut bien au-delà d'elle.
  describe("la case est carrée et centre le visuel", () => {
    it("le conteneur porte aspectRatio 1/1", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      expect(article.style.aspectRatio).toBe("1 / 1");
    });

    it("le conteneur centre sur les deux axes (placeItems, pas justifyItems)", () => {
      monter();
      const article = screen.getByTestId("article-case1");
      expect(article.style.placeItems).toBe("center");
    });

    it("le bouton occupe toute la case et centre son visuel sur les deux axes", () => {
      monter();
      const bouton = screen.getByRole("button", { name: /5 pièces · Musique/ });
      expect(bouton.style.width).toBe("100%");
      expect(bouton.style.height).toBe("100%");
      expect(bouton.style.placeItems).toBe("center");
    });
  });
});

// ── Revue du 2026-08-20, constat C1 ────────────────────────────────────────
// L'article lisait `BAZAR_LAYOUT.objets[cle]` en direct : tirer son cadre en
// mode calage déplaçait le pointillé sans déplacer l'article.
describe("ArticleBazar suit l'outil de calage", () => {
  function Deplacer({ left }: { left: number }) {
    const ctx = useQgEditContext();
    return (
      <button type="button" data-testid="deplacer" onClick={() => ctx?.setOverride("case1", { left })}>
        déplacer
      </button>
    );
  }

  it("sans override, il est posé à sa coordonnée authorée", () => {
    render(
      <QgEditProvider enabled>
        <ArticleBazar
          cle="case1"
          visuel={<span />}
          libelle="lot"
          prix={1}
          jetons={10}
          onAcheter={vi.fn()}
        />
      </QgEditProvider>,
    );
    const article = screen.getByTestId("article-case1");
    expect(article.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.case1.left)}%`);
  });

  it("avec un override, l'article se déplace avec son cadre", () => {
    render(
      <QgEditProvider enabled>
        <Deplacer left={120} />
        <ArticleBazar
          cle="case1"
          visuel={<span />}
          libelle="lot"
          prix={1}
          jetons={10}
          onAcheter={vi.fn()}
        />
      </QgEditProvider>,
    );
    fireEvent.click(screen.getByTestId("deplacer"));
    expect(screen.getByTestId("article-case1").style.left).toBe(`${qgPct(120)}%`);
  });
});
