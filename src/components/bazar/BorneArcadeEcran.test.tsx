// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BorneArcadeEcran, STYLE_VOILE_BORNE } from "./BorneArcadeEcran";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";
import { ATTENUATION_AMBIANCE_BORNE } from "./bazarAudioCurves";

const setAmbienceDuck = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    setAmbienceDuck: (f: number) => setAmbienceDuck(f),
    // `EcranArcade`, monté par ce composant, pilote sa propre piste.
    playArcadeTrack: () => Promise.resolve(),
    stopArcade: () => {},
  },
}));

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
    const col = screen.getByTestId("borne-colonne");
    expect(col.style.position).toBe("absolute");
    expect(col.style.left).toBe("50%");
    expect(col.style.transform).toBe("translateX(-50%)");
    const dlg = screen.getByRole("dialog");
    expect(dlg.style.display).not.toBe("grid");
  });

  // Une borne, ça pose ses pieds par terre : sa base se confond avec l'arête
  // haute de la barre d'onglets. Elle flottait au milieu du cadre.
  it("pose le meuble par terre et le remonte par le haut", () => {
    monter();
    const col = screen.getByTestId("borne-colonne");
    expect(col.style.bottom).toBe("0px");
    // `top` est calculé (`dimensionnerBorne`), donc posé : c'est lui qui fait
    // remonter le marquee, la façade ne s'étirant jamais.
    expect(col.style.top).not.toBe("");
  });

  // Le bas du meuble : un SECOND dessin (bois, monnayeur, plinthe) et non un
  // étirement du panneau. Ancré par le haut et laissé déborder — sur un petit
  // téléphone c'est l'amorce du bois qu'on veut voir, pas un meuble écrasé.
  it("pose le bas du meuble dessiné sous la façade, ancré par le haut", () => {
    monter();
    const b = screen.getByTestId("borne-socle");
    expect(b.tagName).toBe("IMG");
    expect(b.getAttribute("src")).toBe("/bazar/borne-socle.webp");
    expect(b.getAttribute("alt")).toBe("");
    expect(b.style.left).toBe("0px");
    expect(b.style.right).toBe("0px");
    // Ancré par le haut : une hauteur posée, jamais un `bottom` qui l'étirerait.
    expect(b.style.top).not.toBe("");
    expect(b.style.bottom).toBe("");
  });

  // Le filet de sécurité : sur un cadre plus élancé que 2:1 le dessin ne
  // descend pas jusqu'au plancher, et la plinthe étirée comble le reste.
  it("prolonge la plinthe jusqu'au plancher par une bande étirable", () => {
    monter();
    const p = screen.getByTestId("borne-plinthe");
    expect(p.style.bottom).toBe("0px");
    expect(p.style.backgroundImage).toContain("/bazar/borne-socle-bande.webp");
    // L'étirement pur est le rendu VOULU : la bande est une seule ligne de
    // pixels, l'étirer verticalement prolonge la plinthe à l'identique.
    expect(p.style.backgroundSize).toBe("100% 100%");
    expect(p.style.backgroundRepeat).toBe("no-repeat");
  });

  // Ordre de peinture : plinthe, puis bas du meuble, puis façade. Chaque pièce
  // recouvre d'un pixel celle d'en dessous, et c'est la suivante qui masque le
  // recouvrement — sans quoi un arrondi de sous-pixel ouvre un cheveu de fond.
  it("empile plinthe, bas du meuble puis façade dans l'ordre du DOM", () => {
    monter();
    const cles = Array.from(screen.getByTestId("borne-colonne").children).map((e) =>
      e.getAttribute("data-testid"),
    );
    expect(cles).toEqual(["borne-plinthe", "borne-socle", "borne-facade"]);
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

/* ------------------------------------------------------------------ */
/* La rue passe derrière la borne                                      */
/* ------------------------------------------------------------------ */

describe("BorneArcadeEcran — l'ambiance du Bazar", () => {
  it("atténue la rue tant que la borne est ouverte", () => {
    setAmbienceDuck.mockClear();
    monter(true);
    expect(setAmbienceDuck).toHaveBeenCalledWith(ATTENUATION_AMBIANCE_BORNE);
  });

  it("ne touche à rien tant que la borne est fermée", () => {
    setAmbienceDuck.mockClear();
    monter(false);
    expect(setAmbienceDuck).not.toHaveBeenCalled();
  });

  it("rend son volume à la rue en refermant", () => {
    const { onClose } = monter(true);
    setAmbienceDuck.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Fermer la borne" }));
    // Le composant est piloté par `open` : c'est le parent qui referme. Le
    // démontage est la seule voie de sortie garantie, quelle qu'ait été la
    // façon de fermer (croix, Échap, voile).
    expect(onClose).toHaveBeenCalled();
    cleanup();
    expect(setAmbienceDuck).toHaveBeenCalledWith(1);
  });

  // Le facteur est posé par la BORNE et rendu par elle : jamais un volume
  // absolu, sans quoi il faudrait retenir la zone du panorama d'où le joueur
  // a ouvert le meuble.
  it("ne pose et ne rend qu'un facteur, jamais un volume de zone", () => {
    setAmbienceDuck.mockClear();
    monter(true);
    cleanup();
    for (const [facteur] of setAmbienceDuck.mock.calls) {
      expect(facteur).toBeGreaterThan(0);
      expect(facteur).toBeLessThanOrEqual(1);
    }
  });
});
