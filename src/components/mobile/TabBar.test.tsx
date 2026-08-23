// @vitest-environment jsdom
/**
 * `TabBar` — onboarding. Depuis 2026-08-19, les onglets pas encore ouverts
 * ne DISPARAISSENT plus : ils restent en place, grisés sous un cadenas, et
 * disent ce qui les déverrouille quand on les touche. Un trou dans la barre
 * n'apprend rien ; un cadenas montre qu'il y a quelque chose à gagner.
 * On mocke `useGameStateOnly`/`useGameActions` (TabBar ne consomme pas
 * `useGame`) et `next/navigation`, comme LevelUpOverlay.test.tsx.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TabBar, findActiveTabIndex, ongletSuivantOuvert, TAB_ORDER } from "./TabBar";
import { catTreeId } from "@/data/competences";
import { CATEGORIES } from "@/data/categories";
import type { GameState } from "@/types/game";

afterEach(() => {
  cleanup();
  pushMock.mockClear();
  toastMock.mockClear();
});

let mockPathname = "/bureau";
let mockGameStateValue: { state: GameState | null; isHydrated: boolean } = {
  state: null,
  isHydrated: false,
};

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/context/GameContext", () => ({
  useGameStateOnly: () => mockGameStateValue,
  useGameActions: () => ({ tempsConfiance: () => null }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
}));

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast: toastMock }),
}));

function etat(niveau: number, competences: string[] = []): GameState {
  return {
    brocanteur: { niveau, xp: 0, pointsDisponibles: 0 },
    inventaireJoueur: [],
    competencesDebloquees: competences,
    tutorielEtape: "termine",
  } as unknown as GameState;
}

/** Le bouton d'onglet portant ce libellé abrégé. */
function onglet(libelle: string): HTMLElement {
  const btn = screen
    .getAllByRole("button")
    .find((b) => b.textContent?.includes(libelle));
  if (!btn) throw new Error(`onglet introuvable : ${libelle}`);
  return btn;
}

function estCadenasse(libelle: string): boolean {
  return onglet(libelle).getAttribute("aria-disabled") === "true";
}

describe("TabBar — onboarding Bibliothèque", () => {
  it("l'onglet Biblio. est là dès niveau 0, mais cadenassé", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(0), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Biblio.")).toBeTruthy();
    // 5 colonnes reviennent en Task 8 avec l'onglet Quêtes.
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(estCadenasse("Biblio.")).toBe(true);
  });

  it("le cadenas de Biblio. tombe au niveau 1", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(estCadenasse("Biblio.")).toBe(false);
  });

  it("state null (pré-hydratation) : les 4 onglets par défaut, pas de flash de disparition", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: null, isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Biblio.")).toBeTruthy();
    // 5 colonnes reviennent en Task 8 avec l'onglet Quêtes.
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("tutoriel en cours : la barre reste visible mais la navigation est inerte", () => {
    mockPathname = "/bureau";
    const state = { ...etat(1), tutorielEtape: "accueil" } as unknown as GameState;
    mockGameStateValue = { state, isHydrated: true };
    render(<TabBar />);
    expect(screen.getByRole("navigation")).toBeTruthy();
    const nonActif = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-current") === null);
    expect(nonActif).toBeTruthy();
    fireEvent.click(nonActif!);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("TabBar — mini-tuto vinyle (main pointeuse)", () => {
  function etatMiniTuto(mt: "ajouter" | "ecouter"): GameState {
    return {
      brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
      inventaireJoueur: [],
      competencesDebloquees: [],
      tutorielEtape: "termine",
      miniTutoVinyle: mt,
    } as unknown as GameState;
  }

  it("nav en zIndex 40 + main sur Bureau quand ecouter hors /bureau", () => {
    mockPathname = "/stockage";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    const nav = screen.getByRole("navigation");
    expect(nav.style.zIndex).toBe("40");
    const bureau = screen.getAllByRole("button").find((b) => b.className.includes("tuto-main"));
    expect(bureau?.textContent).toContain("Bureau");
  });

  it("nav en zIndex 30 sans main (ecouter, déjà sur /bureau)", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etatMiniTuto("ecouter"), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByRole("navigation").style.zIndex).toBe("30");
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});

// Le cadenas de l'Atelier (compétence Réparer) ne vit plus dans la TabBar :
// l'Atelier n'est plus un onglet du bas, il est fondu dans la Réserve, qui
// n'a pas de verrou propre. Ce cadenas migre vers `ReserveTabs` en Task 2,
// avec ses propres tests.
describe("TabBar — onglets cadenassés", () => {
  it("toucher un onglet cadenassé ne navigue pas et dit ce qui le déverrouille", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(0), isHydrated: true };
    render(<TabBar />);
    fireEvent.click(onglet("Biblio."));
    expect(pushMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(String(toastMock.mock.calls[0][0])).toMatch(/niveau/i);
  });

  it("un onglet ouvert navigue normalement, sans toast", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    fireEvent.click(onglet("Biblio."));
    expect(pushMock).toHaveBeenCalledWith("/bibliotheque");
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("aucun badge sous un cadenas : rien ne doit clignoter derrière une porte fermée", () => {
    mockPathname = "/bureau";
    const state = {
      ...etat(0),
      brocanteur: { niveau: 0, xp: 0, pointsDisponibles: 3 },
    } as unknown as GameState;
    mockGameStateValue = { state, isHydrated: true };
    render(<TabBar />);
    expect(onglet("Biblio.").textContent).not.toContain("3");
  });

  it("state null (pré-hydratation) : aucun cadenas, pas de flash de verrouillage", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: null, isHydrated: true };
    render(<TabBar />);
    expect(estCadenasse("Biblio.")).toBe(false);
  });
});

/**
 * Le swipe entre onglets contournait la barre : il cyclait sur TAB_ORDER sans
 * rien savoir des cadenas. Une porte fermée qu'on ouvre par la fenêtre n'est
 * pas fermée.
 */
describe("ongletSuivantOuvert — le swipe saute les pièces fermées", () => {
  const IDX_BUREAU = 2; // Collection, Biblio., Bureau, Réserve

  it("saute la Bibliothèque cadenassée en allant à gauche", () => {
    const s = etat(0);
    expect(ongletSuivantOuvert(IDX_BUREAU, -1, s)?.path).toBe("/collection");
  });

  it("s'arrête sur la Bibliothèque une fois ouverte", () => {
    expect(ongletSuivantOuvert(IDX_BUREAU, -1, etat(1))?.path).toBe("/bibliotheque");
  });

  // La Réserve (ex-Atelier fusionné) n'a plus de verrou propre dans la
  // TabBar depuis la fusion des routes (cf. `ongletFerme` — moved to
  // ReserveTabs en Task 2) : depuis la Réserve (idx 3, dernier onglet), le
  // cycle vers la droite boucle directement sur la Collection.
  it("boucle de la Réserve vers la Collection en allant à droite", () => {
    const s = etat(1); // biblio ouverte
    expect(ongletSuivantOuvert(3, 1, s)?.path).toBe("/collection");
  });

  it("state null (pré-hydratation) : aucun saut", () => {
    expect(ongletSuivantOuvert(IDX_BUREAU, -1, null)?.path).toBe("/bibliotheque");
  });
});

/**
 * Visite guidée de l'Atelier : le cadenas vient de tomber, la main désigne
 * la porte. Elle passe AVANT le mini-tuto des vinyles — deux mains à la fois
 * ne guideraient personne. L'Atelier n'a plus sa propre colonne dans la barre
 * (fusionné dans la Réserve) : la main se pose désormais sur l'onglet Réserve.
 */
describe("TabBar — main vers l'Atelier fraîchement ouvert (onglet Réserve)", () => {
  function etatVisiteAtelier(extra: Record<string, unknown> = {}): GameState {
    return {
      brocanteur: { niveau: 3, xp: 0, pointsDisponibles: 0 },
      inventaireJoueur: [],
      competencesDebloquees: [`${catTreeId(CATEGORIES[0])}.reparer.1`],
      tutorielEtape: "termine",
      miniTutoAtelier: "visite",
      ...extra,
    } as unknown as GameState;
  }

  it("la main se pose sur la Réserve tant que la visite n'est pas faite", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etatVisiteAtelier(), isHydrated: true };
    render(<TabBar />);
    const avecMain = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("tuto-main"));
    expect(avecMain?.textContent).toContain("Réserve");
  });

  it("plus de main une fois qu'on y est (via /atelier)", () => {
    mockPathname = "/atelier";
    mockGameStateValue = { state: etatVisiteAtelier(), isHydrated: true };
    render(<TabBar />);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("plus de main une fois qu'on y est (via /stockage)", () => {
    mockPathname = "/stockage";
    mockGameStateValue = { state: etatVisiteAtelier(), isHydrated: true };
    render(<TabBar />);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("l'Atelier prend le pas sur le mini-tuto vinyle", () => {
    mockPathname = "/bureau";
    mockGameStateValue = {
      state: etatVisiteAtelier({ miniTutoVinyle: "ajouter" }),
      isHydrated: true,
    };
    render(<TabBar />);
    const mains = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("tuto-main"));
    expect(mains).toHaveLength(1);
    expect(mains[0].textContent).toContain("Réserve");
  });

  it("visite terminée : plus aucune main", () => {
    mockPathname = "/bureau";
    mockGameStateValue = {
      state: etatVisiteAtelier({ miniTutoAtelier: "termine" }),
      isHydrated: true,
    };
    render(<TabBar />);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});

describe("findActiveTabIndex — un onglet peut revendiquer plusieurs routes", () => {
  it("/stockage tombe sur l'onglet Réserve", () => {
    const i = findActiveTabIndex("/stockage");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(TAB_ORDER[i].cle).toBe("reserve");
  });

  it("/atelier tombe sur le MÊME onglet — sinon le swipe entre pièces casse", () => {
    expect(findActiveTabIndex("/atelier")).toBe(findActiveTabIndex("/stockage"));
  });

  it("une sous-route d'un chemin revendiqué compte aussi", () => {
    expect(findActiveTabIndex("/atelier/quoi-que-ce-soit")).toBe(
      findActiveTabIndex("/stockage"),
    );
  });

  it("une route étrangère ne tombe sur aucun onglet", () => {
    expect(findActiveTabIndex("/chiner")).toBe(-1);
  });
});
