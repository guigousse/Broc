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
import { cleanup, render } from "@testing-library/react";
import { TutorielBanniere } from "./TutorielBanniere";

let mockState: Record<string, unknown> | null = null;
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => ({ state: mockState }),
  useGameActions: () => ({ terminerTutoriel: () => {} }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      tutoriel: {
        instructions: { "aller-chiner": "Sors de la boutique." },
        passer: "Passer le tutoriel",
        confirmerPasser: "Confirmer",
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
    expect(reserve()).toBe("16px");
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
    expect(reserve()).toBe("16px");
    unmount();
    expect(reserve()).toBe("");
  });
});
