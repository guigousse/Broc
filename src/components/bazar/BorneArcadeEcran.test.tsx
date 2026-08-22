// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BorneArcadeEcran, STYLE_VOILE_BORNE } from "./BorneArcadeEcran";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";

// jsdom ne fournit pas ResizeObserver ; le composant le construit dès son
// premier rendu ouvert, donc le bouchon doit être posé avant tout render.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never;

afterEach(cleanup);

const JEUX = JEUX_ARCADE.map((templateId) => ({ templateId, trouve: false }));

function monter(open = true) {
  const onClose = vi.fn();
  render(<BorneArcadeEcran open={open} jeux={JEUX} onClose={onClose} />);
  return { onClose };
}

describe("BorneArcadeEcran", () => {
  it("ne rend rien quand il est fermé", () => {
    monter(false);
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  it("est un dialogue modal nommé", () => {
    monter();
    const dlg = screen.getByRole("dialog");
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(dlg.getAttribute("aria-label")).toBe("Borne d'arcade");
  });

  it("se ferme au tap sur le fond, et pas au tap sur la borne", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("borne-facade"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se ferme à la touche Échap", () => {
    const { onClose } = monter();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Une sortie visible est exigée : le fond et Échap ne se devinent pas.
  it("porte un bouton de fermeture visible et nommé", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Fermer la borne" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // LE point d'architecture : l'interface est DESSOUS, la façade DESSUS.
  // C'est ce qui fait que les joysticks dessinés masquent l'écran sans
  // qu'aucun masque n'ait à être fabriqué.
  it("pose l'écran AVANT la façade dans l'ordre du DOM", () => {
    monter();
    const cadre = screen.getByTestId("borne-facade");
    const enfants = Array.from(cadre.children);
    const iEcran = enfants.findIndex((e) => e.getAttribute("data-testid") === "borne-fenetre");
    const iImage = enfants.findIndex((e) => e.tagName === "IMG");
    expect(iEcran).toBeGreaterThanOrEqual(0);
    expect(iImage).toBeGreaterThan(iEcran);
  });

  // Sans ça, la façade avale les taps destinés aux flèches qui sont dessous.
  it("la façade laisse passer les doigts", () => {
    monter();
    const img = screen.getByTestId("borne-facade").querySelector("img") as HTMLImageElement;
    expect(img.style.pointerEvents).toBe("none");
    expect(img.getAttribute("alt")).toBe("");
  });

  // ——— Le cadrage, repris à la recette du 2026-08-23 ———
  //
  // Trois défauts vus sur iPhone 12, trois gardes. Ils tiennent tous à la même
  // décision : le plein écran de la borne n'est PAS plein écran, il occupe
  // exactement le cadre du Bazar — entre le bandeau et la barre d'onglets, qui
  // sont peints par-dessus et restent lisibles.

  it("s'ancre entre le bandeau et la barre d'onglets, et pas sur tout l'écran", () => {
    monter();
    const dlg = screen.getByRole("dialog");
    // Les MÊMES expressions que le cadre du Bazar (`src/app/bazar/page.tsx`) :
    // le voile se superpose au panorama au pixel près, ce qui est la condition
    // pour que son flou montre la boutique et rien d'autre.
    expect(dlg.style.top).toBe("calc(var(--safe-top) + var(--mobile-header-h))");
    expect(dlg.style.bottom).toBe("var(--mobile-tabbar-h)");
    expect(dlg.style.left).toBe("0px");
    expect(dlg.style.right).toBe("0px");
  });

  // Le caisson est PLUS LARGE que le téléphone, exprès. Un `place-items:
  // center` ne le centre pas pour autant : le voile est en `overflow: hidden`,
  // donc un conteneur de défilement, et le moteur y recale l'objet qui déborde
  // sur le bord de DÉPART pour ne pas rendre son début inatteignable. Mesuré
  // sur iPhone 12 : caisson de 501 px posé à `x = 0`, tout le débord à droite,
  // le marquee tranché. Le calage explicite ci-dessous n'est pas soumis à cette
  // correction.
  it("centre le caisson par un calage explicite, pas par l'alignement de grille", () => {
    monter();
    const cadre = screen.getByTestId("borne-facade");
    expect(cadre.style.position).toBe("absolute");
    expect(cadre.style.left).toBe("50%");
    expect(cadre.style.transform).toBe("translateX(-50%)");
    const dlg = screen.getByRole("dialog");
    expect(dlg.style.display).not.toBe("grid");
  });

  // Une borne, ça pose ses pieds par terre : sa base se confond avec l'arête
  // haute de la barre d'onglets. Elle flottait au milieu du cadre.
  it("pose la base du caisson sur la barre d'onglets", () => {
    monter();
    expect(screen.getByTestId("borne-facade").style.bottom).toBe("0px");
    expect(screen.getByTestId("borne-facade").style.top).toBe("");
  });

  // Le fond était à 0,88 d'opacité : le flou ne montrait rien, on tombait sur
  // un aplat vert. On veut voir la boutique derrière, hors du point.
  it("laisse voir la boutique floutée derrière le caisson", () => {
    monter();
    const dlg = screen.getByRole("dialog");
    const alpha = Number(/rgba\([^)]*?,\s*([\d.]+)\s*\)/.exec(dlg.style.background)?.[1]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(0.6);
    expect(dlg.style.backdropFilter).toMatch(/blur\(/);
    // La variante préfixée se lit sur l'objet de style et non dans le DOM :
    // jsdom jette `-webkit-backdrop-filter`, qui est pourtant LA seule forme
    // comprise par le WKWebView des iOS d'avant 18 — c'est-à-dire la cible.
    expect(STYLE_VOILE_BORNE.WebkitBackdropFilter).toMatch(/blur\(/);
  });

  // Le voile commence désormais SOUS le bandeau, qui a déjà absorbé l'encoche :
  // réserver `--safe-top` une seconde fois décrocherait la croix vers le bas.
  it("ne compte pas l'encoche deux fois pour le bouton de fermeture", () => {
    monter();
    const btn = screen.getByRole("button", { name: "Fermer la borne" });
    expect(btn.style.top).not.toMatch(/safe-top/);
  });

  it("place la fenêtre aux pourcentages mesurés du caisson", () => {
    monter();
    const f = screen.getByTestId("borne-fenetre");
    expect(f.style.left).toBe("14.16%");
    expect(f.style.right).toBe("14.22%");
    expect(f.style.top).toBe("24.57%");
    expect(f.style.bottom).toBe("25.96%");
  });
});
