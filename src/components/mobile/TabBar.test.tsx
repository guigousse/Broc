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
    // L'onglet Quêtes porte un badge (missionsLivrables) calculé pour
    // TOUS les fixtures, cadenassé ou pas : sans ces deux tableaux vides,
    // missionsLivrables plante sur un état de test qui ne les fournit pas.
    missions: [],
    courriers: [],
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
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(estCadenasse("Biblio.")).toBe(true);
  });

  it("le cadenas de Biblio. tombe au niveau 1", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(estCadenasse("Biblio.")).toBe(false);
  });

  it("state null (pré-hydratation) : les 5 onglets par défaut, pas de flash de disparition", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: null, isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Biblio.")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(5);
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
      missions: [],
      courriers: [],
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
  const IDX_BUREAU = 2; // Quêtes, Biblio., Bureau, Réserve, Collection

  it("saute la Bibliothèque cadenassée en allant à gauche", () => {
    const s = etat(0);
    expect(ongletSuivantOuvert(IDX_BUREAU, -1, s)?.path).toBe("/quetes");
  });

  it("s'arrête sur la Bibliothèque une fois ouverte", () => {
    expect(ongletSuivantOuvert(IDX_BUREAU, -1, etat(1))?.path).toBe("/bibliotheque");
  });

  // La Réserve (ex-Atelier fusionné) n'a plus de verrou propre dans la
  // TabBar depuis la fusion des routes (cf. `ongletFerme` — moved to
  // ReserveTabs en Task 2) : à cinq onglets, la Réserve (idx 3) n'est plus
  // le dernier — Collection (idx 4) la suit directement. Le pas à droite
  // avance donc simplement à l'onglet suivant, ce n'est pas un bouclage.
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
      missions: [],
      courriers: [],
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

/**
 * Fin du tutoriel : le livre a quitté le bureau, la main désigne désormais
 * l'onglet Quêtes. Elle passe AVANT les mini-tutos Atelier et Vinyle — la
 * fin du tutoriel prime.
 */
describe("TabBar — fin du tutoriel (main vers l'onglet Quêtes)", () => {
  it("mini-tuto carnet : la main se pose sur l'onglet Quêtes", () => {
    mockPathname = "/bureau";
    mockGameStateValue = {
      state: { ...etat(1), miniTutoCarnet: "ouvrir" } as unknown as GameState,
      isHydrated: true,
    };
    render(<TabBar />);
    const main = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("tuto-main"));
    expect(main?.textContent).toContain("Quêtes");
  });

  it("plus de main une fois sur /quetes", () => {
    mockPathname = "/quetes";
    mockGameStateValue = {
      state: { ...etat(1), miniTutoCarnet: "ouvrir" } as unknown as GameState,
      isHydrated: true,
    };
    render(<TabBar />);
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("la main du carnet prend le pas sur les mini-tutos Atelier et Vinyle", () => {
    mockPathname = "/bureau";
    mockGameStateValue = {
      state: {
        ...etat(3, [`${catTreeId(CATEGORIES[0])}.reparer.1`]),
        miniTutoCarnet: "ouvrir",
        miniTutoAtelier: "visite",
        miniTutoVinyle: "ecouter",
      } as unknown as GameState,
      isHydrated: true,
    };
    render(<TabBar />);
    const mains = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("tuto-main"));
    expect(mains).toHaveLength(1);
    expect(mains[0].textContent).toContain("Quêtes");
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

describe("TabBar — onglet Réserve actif sur /atelier et /stockage", () => {
  it("l'onglet Réserve se rend actif (aria-current='page') sur /atelier", () => {
    mockPathname = "/atelier";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(onglet("Réserve").getAttribute("aria-current")).toBe("page");
  });

  it("l'onglet Réserve se rend actif (aria-current='page') sur /stockage", () => {
    mockPathname = "/stockage";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(onglet("Réserve").getAttribute("aria-current")).toBe("page");
  });
});

describe("TabBar — l'onglet Quêtes et le nouvel ordre", () => {
  it("cinq colonnes, Quêtes en premier et Collection en dernier", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(TAB_ORDER[0].cle).toBe("quetes");
    expect(TAB_ORDER[4].cle).toBe("collection");
    expect(TAB_ORDER[2].cle).toBe("bureau"); // le Bureau reste au centre
  });

  it("taper Quêtes navigue vers /quetes", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    fireEvent.click(onglet("Quêtes"));
    expect(pushMock).toHaveBeenCalledWith("/quetes");
  });

  it("le swipe boucle sur les cinq onglets en sautant la Biblio verrouillée", () => {
    const s = etat(0); // niveau 0 : Bibliothèque cadenassée
    // depuis Quêtes (0), un pas à droite doit sauter la Biblio (1)
    expect(ongletSuivantOuvert(0, 1, s)?.cle).toBe("bureau");
    // et un pas à gauche depuis Quêtes boucle sur Collection (4)
    expect(ongletSuivantOuvert(0, -1, s)?.cle).toBe("collection");
  });
});
