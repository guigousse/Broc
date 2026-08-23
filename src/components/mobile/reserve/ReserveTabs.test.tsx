// @vitest-environment jsdom
/**
 * `ReserveTabs` — la bande d'onglets en tête de la Réserve. Elle remplace le
 * titre centré de la carte : l'onglet actif EST le titre. Le cadenas de
 * l'Atelier, qui vivait dans la barre du bas, vit désormais ici.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReserveTabs } from "./ReserveTabs";
import {
  RECOUVREMENT_ONGLETS,
  Z_CARTE,
} from "@/components/mobile/floating-room/FloatingRoomOverlay";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      chrome: {
        onglets: { stockage: "Stockage", atelier: "Atelier" },
        ongletVerrouille: "verrouillé",
      },
    },
  }),
}));

afterEach(cleanup);

function poser(over: Partial<Parameters<typeof ReserveTabs>[0]> = {}) {
  const props = {
    actif: "stockage" as const,
    atelierOuvert: true,
    badgeAtelier: 0,
    mainSurAtelier: false,
    onChoisir: vi.fn(),
    onVerrou: vi.fn(),
    ...over,
  };
  render(<ReserveTabs {...props} />);
  return props;
}

const bouton = (t: string) =>
  screen.getAllByRole("button").find((b) => b.textContent?.includes(t))!;

describe("ReserveTabs", () => {
  it("marque l'onglet actif pour les lecteurs d'écran", () => {
    poser({ actif: "atelier" });
    expect(bouton("Atelier").getAttribute("aria-current")).toBe("page");
    expect(bouton("Stockage").getAttribute("aria-current")).toBeNull();
  });

  it("choisir l'autre onglet le remonte au parent", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Atelier"));
    expect(onChoisir).toHaveBeenCalledWith("atelier");
  });

  it("taper l'onglet DÉJÀ actif ne redemande rien", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Stockage"));
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("atelier fermé : cadenassé, et le tap appelle le verrou au lieu de naviguer", () => {
    const { onChoisir, onVerrou } = poser({ atelierOuvert: false });
    const atelier = bouton("Atelier");
    expect(atelier.getAttribute("aria-disabled")).toBe("true");
    expect(atelier.getAttribute("aria-label")).toContain("verrouillé");
    fireEvent.click(atelier);
    expect(onVerrou).toHaveBeenCalledTimes(1);
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("le badge de restaurations prêtes s'affiche sur l'onglet Atelier", () => {
    poser({ badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).toContain("3");
  });

  it("aucun badge sous un cadenas", () => {
    poser({ atelierOuvert: false, badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).not.toContain("3");
  });

  it("porte l'ancre de coach du tutoriel sur l'onglet Atelier", () => {
    poser();
    expect(
      document.querySelector('[data-tuto-coach="reserve-onglet-atelier"]'),
    ).not.toBeNull();
  });
});

describe("ReserveTabs — main de guidage du mini-tuto Atelier", () => {
  it("pose la main sur l'onglet Atelier quand on la demande", () => {
    poser({ mainSurAtelier: true });
    expect(bouton("Atelier").className).toContain("tuto-main");
  });

  it("aucune main par défaut", () => {
    poser();
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("aucune main sur l'onglet Atelier déjà actif", () => {
    poser({ actif: "atelier", mainSurAtelier: true });
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("aucune main sur un onglet CADENASSÉ", () => {
    // Le doigt désignerait un bouton qui ne sait que refuser : le tap
    // déclenche le toast de verrou, jamais la navigation promise.
    poser({ atelierOuvert: false, mainSurAtelier: true });
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});

describe("ReserveTabs — languettes derrière le cadre", () => {
  it("coins SUPÉRIEURS arrondis, et aucun trait en bas", () => {
    // Le bas de la languette disparaît sous la carte : lui donner un trait
    // ou un arrondi dessinerait une ligne fantôme au ras du cadre.
    poser();
    for (const libelle of ["Stockage", "Atelier"]) {
      const face = bouton(libelle).firstElementChild as HTMLElement;
      expect(face.style.borderTopLeftRadius).not.toBe("");
      expect(face.style.borderTopRightRadius).not.toBe("");
      expect(face.style.borderBottomLeftRadius).toBe("");
      expect(face.style.borderBottomRightRadius).toBe("");
      expect(face.style.borderBottom || "").toBe("");
    }
  });

  it("les deux languettes sont séparées par une gouttière", () => {
    poser();
    const rangee = bouton("Stockage").parentElement as HTMLElement;
    expect(rangee.style.display).toBe("flex");
    expect(parseFloat(rangee.style.gap)).toBeGreaterThan(0);
  });

  it("cible tactile pleine hauteur, silhouette réduite", () => {
    // La partie basse est masquée par la carte : sans cette réserve de
    // padding, le libellé serait centré dans une boîte dont on ne voit que
    // le haut — donc collé au bord bas du visible.
    poser();
    const b = bouton("Stockage");
    expect(b.style.minHeight).toBe("var(--tap-min)");
    expect(b.style.paddingBottom).toBe(`${RECOUVREMENT_ONGLETS}px`);
  });
});

describe("ReserveTabs — l'onglet actif se fond dans la carte", () => {
  it("l'actif est peint AU-DESSUS de la carte, l'inactif reste derrière", () => {
    // C'est ce qui fait disparaître l'arête : la languette active recouvre
    // le liseré haut de la carte avec son propre papier, qui est le même.
    poser({ actif: "stockage" });
    expect(Number(bouton("Stockage").style.zIndex)).toBeGreaterThan(Z_CARTE);
    expect(bouton("Atelier").style.zIndex).toBe("");
  });

  it("le recouvrement suit l'onglet quand on change de moitié", () => {
    poser({ actif: "atelier" });
    expect(Number(bouton("Atelier").style.zIndex)).toBeGreaterThan(Z_CARTE);
    expect(bouton("Stockage").style.zIndex).toBe("");
  });
});

describe("ReserveTabs — le liseré s'arrête au ras de la page", () => {
  it("le bouton ne porte aucun liseré : il ne fait que la cible tactile", () => {
    // Un liseré porté par le bouton descendrait dans les 16 px cachés et
    // planterait deux traits verticaux au milieu de la carte.
    poser({ actif: "stockage" });
    const b = bouton("Stockage");
    // jsdom sérialise `border: none` en largeur « medium » : c'est le STYLE
    // qui porte l'information.
    expect(b.style.borderStyle).toBe("none");
  });

  it("la face visible porte le liseré et les coins arrondis", () => {
    poser({ actif: "stockage" });
    const face = bouton("Stockage").firstElementChild as HTMLElement;
    expect(face).not.toBeNull();
    expect(face.style.borderTop).not.toBe("");
    expect(face.style.borderLeft).not.toBe("");
    expect(face.style.borderRight).not.toBe("");
    expect(face.style.borderBottom || "").toBe("");
    expect(face.style.borderTopLeftRadius).not.toBe("");
  });

  it("l'actif noie le liseré haut de la carte sous son propre papier", () => {
    // Le bouton actif court sur toute la hauteur, recouvrement compris : son
    // fond doit être CELUI DE LA CARTE pour effacer l'arête.
    poser({ actif: "stockage" });
    expect(bouton("Stockage").style.background).toBe("var(--paper-100)");
    expect(bouton("Atelier").style.background).toBe("transparent");
  });
});
