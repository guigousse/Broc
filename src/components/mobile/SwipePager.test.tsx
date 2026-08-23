// @vitest-environment jsdom
/**
 * `SwipePager` — sens de l'animation d'entrée.
 *
 * Le pager résolvait « route → onglet » à la main, sur `t.path` seul, alors
 * que la barre a centralisé cette résolution dans `findActiveTabIndex` (qui,
 * lui, cherche dans `routes`). Conséquence : `/atelier` — deuxième route de
 * l'onglet Réserve, dont le `path` vaut `/stockage` — n'était reconnu par
 * personne et toute transition l'impliquant retombait sur `direction="none"`,
 * donc sur une page qui apparaît sans glisser.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SwipePager, computeDirection } from "./SwipePager";
import type { GameState } from "@/types/game";

let mockPathname = "/bureau";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const etat = {
  brocanteur: { niveau: 9, xp: 0, pointsDisponibles: 0 },
  inventaireJoueur: [],
  competencesDebloquees: [],
  tutorielEtape: "termine",
} as unknown as GameState;

// `SwipePager` n'importe que `next/navigation`, `TabBar` et `GameContext`.
// Tout le reste des mocks ci-dessous (`useGameActions`, `SettingsContext`,
// `Toast`) ne sert qu'à faire taire `TabBar` — tiré pour `TAB_ORDER` et
// `findActiveTabIndex`, mais embarqué en entier par la chaîne d'imports.
// Ne pas les supprimer en les croyant morts.
vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => ({ state: etat, isHydrated: true }),
  useGameActions: () => ({ tempsConfiance: () => null }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  mockPathname = "/bureau";
});

/** Classe d'animation portée par le conteneur de page après la transition. */
function classeApresTransition(depuis: string, vers: string): string {
  mockPathname = depuis;
  const { container, rerender } = render(
    <SwipePager>
      <p>page</p>
    </SwipePager>,
  );
  mockPathname = vers;
  rerender(
    <SwipePager>
      <p>page</p>
    </SwipePager>,
  );
  const page = container.firstElementChild?.firstElementChild as HTMLElement;
  return page.className;
}

describe("SwipePager — animation d'entrée", () => {
  it("/atelier → /collection : la Réserve est reconnue, la page entre par la droite", () => {
    // Réserve (index 3) → Collection (index 0) : un cran vers l'avant dans le
    // cycle de 4, donc entrée par la droite. Sans résolution centralisée,
    // `/atelier` restait introuvable et le sens tombait à "none".
    expect(classeApresTransition("/atelier", "/collection")).toBe(
      "broc-page-enter-right",
    );
  });

  it("/collection → /atelier : sens inverse, la page entre par la gauche", () => {
    expect(classeApresTransition("/collection", "/atelier")).toBe(
      "broc-page-enter-left",
    );
  });

  it("/bureau → /atelier : transition interne au groupe (qg), aucune animation", () => {
    // Même pageKey `_qg` des deux côtés : le sous-arbre ne re-monte pas, le
    // panorama garde son scroll — et rien ne glisse.
    expect(classeApresTransition("/bureau", "/atelier")).toBe("");
  });
});

describe("computeDirection", () => {
  it("deux routes du même onglet : aucun sens", () => {
    // `/stockage` et `/atelier` sont les deux routes de la Réserve : on ne
    // change pas d'onglet. Sans garde, l'arithmétique du cycle répondait
    // "right" (forward = backward = 0). Le garde de `pageKey` le masque au
    // rendu, mais la fonction mentait prise isolément.
    expect(computeDirection("/stockage", "/atelier")).toBe("none");
    expect(computeDirection("/atelier", "/stockage")).toBe("none");
  });

  it("route identique ou inconnue : aucun sens non plus", () => {
    expect(computeDirection("/bureau", "/bureau")).toBe("none");
    expect(computeDirection(null, "/bureau")).toBe("none");
    expect(computeDirection("/privacy", "/bureau")).toBe("none");
  });
});
