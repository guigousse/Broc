// @vitest-environment jsdom
/**
 * La bannière est un calque flottant : elle publie sa hauteur dans
 * `--tuto-banniere-h` pour que les zones de contenu lui réservent la place
 * (sans quoi elle recouvre le premier élément de l'écran — retour device
 * 2026-07-26, titre du bilan de chinage masqué). La variable doit disparaître
 * dès que la bannière n'est plus à l'écran, sinon toutes les pages gardent
 * une bande vide sous le header.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TutorielBanniere } from "./TutorielBanniere";

let mockState: Record<string, unknown> | null = null;
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => ({ state: mockState }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      tutoriel: {
        instructions: {
          "aller-chiner": "Passe la *porte*.",
          "collection-lecon": "Ouvre la *Collection*.",
          "accueil": "Écoute ton grand-père…",
        },
      },
    },
  }),
}));

afterEach(() => {
  document.documentElement.style.removeProperty("--tuto-banniere-h");
  cleanup();
});

function reserve(): string {
  return document.documentElement.style.getPropertyValue("--tuto-banniere-h");
}

describe("TutorielBanniere — réserve de place", () => {
  it("tutoriel en cours : la hauteur est publiée", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/bureau";
    render(<TutorielBanniere />);
    // jsdom ne calcule pas de layout : offsetHeight vaut 0, seules les deux
    // gouttières subsistent. C'est la publication qu'on vérifie, pas la valeur.
    expect(reserve()).toBe("12px");
  });

  it("tutoriel terminé : aucune réserve", () => {
    mockState = { tutorielEtape: "termine" };
    mockPathname = "/bureau";
    render(<TutorielBanniere />);
    expect(reserve()).toBe("");
  });

  it("hors route de partie : aucune réserve", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/";
    render(<TutorielBanniere />);
    expect(reserve()).toBe("");
  });

  it("démontée : la réserve est retirée, pas laissée sur la racine", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/bureau";
    const { unmount } = render(<TutorielBanniere />);
    expect(reserve()).toBe("12px");
    unmount();
    expect(reserve()).toBe("");
  });
});

/**
 * Le bouton « Passer le tutoriel » a été retiré (2026-08-19) : la bannière
 * n'est plus qu'une consigne, elle ne capte plus aucun geste et ne s'affiche
 * que là où sa consigne est encore vraie.
 */
describe("TutorielBanniere — consigne seule", () => {
  it("n'offre plus de bouton pour passer le tutoriel", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/bureau";
    const { container } = render(<TutorielBanniere />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("ne capte aucun geste : ce qui est dessous reste tapable", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/bureau";
    const { container } = render(<TutorielBanniere />);
    const banniere = container.querySelector<HTMLElement>('[role="status"]');
    expect(banniere!.style.pointerEvents).toBe("none");
  });

  it("met les mots-clés en évidence", () => {
    mockState = { tutorielEtape: "aller-chiner" };
    mockPathname = "/bureau";
    render(<TutorielBanniere />);
    const fort = screen.getByText("porte");
    expect(fort.tagName).toBe("STRONG");
  });

  it("s'efface une fois la consigne de navigation exaucée", () => {
    mockState = { tutorielEtape: "collection-lecon" };
    mockPathname = "/stockage";
    const { unmount } = render(<TutorielBanniere />);
    expect(reserve()).toBe("12px");
    unmount();

    mockPathname = "/collection";
    render(<TutorielBanniere />);
    expect(reserve()).toBe("");
  });

  it("s'efface pendant un dialogue du grand-père", () => {
    mockState = { tutorielEtape: "accueil" };
    mockPathname = "/bureau";
    render(<TutorielBanniere />);
    expect(reserve()).toBe("");
  });
});
