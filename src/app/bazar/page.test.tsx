// @vitest-environment jsdom
/**
 * Revue finale (C1) : `settleBazar` ne tournait que sur le tick 60 s /
 * focus / visibilitychange / pageshow du GameContext — rien ne le
 * déclenchait à la navigation. Un joueur qui passait au jour 35 et tapait
 * aussitôt sur la porte du Bazar tombait sur un `SkeletonScreen` muet
 * jusqu'à 60 s (le temps que le tick suivant compose l'étal). Ce test
 * verrouille le déclenchement explicite au montage de l'écran.
 *
 * Minor 2 (câblage `{ ok, raison }`) : la page ignorait le retour
 * d'`acheterAuBazar` — un achat refusé (jetons insuffisants, article déjà
 * vendu par une autre course) ne disait rien au joueur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import BazarPage from "./page";
import { genererEtal } from "@/lib/bazar/etal";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  // MobileHeader lit la route courante pour la navigation de la puce XP.
  usePathname: () => "/bazar",
}));

const rafraichirPeriodiques = vi.fn();
const acheterAuBazar = vi.fn();
let mockState: Record<string, unknown> | null = null;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: mockState,
    isHydrated: true,
    acheterAuBazar,
    rafraichirPeriodiques,
  }),
  // MobileHeader lit `tempsConfiance` via useGameActions pour la jauge d'énergie.
  useGameActions: () => ({ tempsConfiance: () => Date.now() }),
}));

const toast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast }),
}));

const etal = genererEtal("2026-W34");

beforeEach(() => {
  mockState = {
    jourActuel: JOUR_OUVERTURE_BAZAR,
    budget: 100,
    jetons: 5,
    bazar: etal,
    // MobileHeader (rendu par la page) a besoin de ces champs pour sa jauge
    // d'énergie et sa puce de niveau — hors sujet ici, juste de quoi monter.
    energie: 5,
    energieDerniereMaj: Date.now(),
    brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BazarPage — settle déclenché à l'entrée sur l'écran", () => {
  it("appelle rafraichirPeriodiques au montage — pas d'attente du tick 60 s", () => {
    render(<BazarPage />);
    expect(rafraichirPeriodiques).toHaveBeenCalledTimes(1);
  });

  it("rend l'étal directement quand le settle a déjà eu lieu — pas de Skeleton bloqué", () => {
    render(<BazarPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Le Bazar" })).toBeTruthy();
  });
});

// Revue du 2026-08-20, constat I2 : la page appelait `MobileLayout` SANS
// `fillContent`, donc 12 px de papier encadraient l'illustration sur les côtés
// et en haut. Et sans conteneur `position: fixed`, la scène n'héritait pas de
// l'immunité au scroll résiduel qu'a le panorama du QG.
describe("BazarPage — le panorama est plein cadre", () => {
  it("le contenu n'a pas les 12 px de papier de MobileLayout", () => {
    const { container } = render(<BazarPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.padding).not.toContain("12px");
  });

  it("la scène est ancrée hors flux entre l'en-tête et la barre d'onglets", () => {
    const { container } = render(<BazarPage />);
    const cadre = container.querySelector("[data-bazar-cadre]") as HTMLElement;
    expect(cadre).toBeTruthy();
    expect(cadre.style.position).toBe("fixed");
    expect(cadre.style.top).toBe("calc(var(--safe-top) + var(--mobile-header-h))");
    expect(cadre.style.bottom).toBe("var(--mobile-tabbar-h)");
    expect(cadre.style.overflow).toBe("hidden");
  });
});

describe("BazarPage — retour d'acheterAuBazar câblé sur un toast", () => {
  // Depuis la recette du 2026-08-20, l'achat demande DEUX gestes : taper
  // l'article sur l'étagère ouvre sa fiche, et c'est le bouton de la fiche qui
  // achète.
  async function acheterLePremierLot() {
    await act(async () => {
      screen.getAllByRole("button", { name: /pièces/i })[0].click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "Acheter" }).click();
    });
  }

  it("achat refusé : la raison localisée est montrée au joueur", async () => {
    acheterAuBazar.mockReturnValue({ ok: false, raison: "Pas assez de jetons" });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(toast).toHaveBeenCalledWith("Pas assez de jetons", { type: "erreur" });
  });

  it("achat réussi : aucun toast d'erreur", async () => {
    acheterAuBazar.mockReturnValue({ ok: true });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(acheterAuBazar).toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
