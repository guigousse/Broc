// @vitest-environment jsdom
/**
 * Task 14 — le livre de comptes (`QgCarnet`) réapparaît sur le bureau dès
 * qu'au moins un album a été acheté au Bazar, et ouvre la sheet « Mes
 * albums » (pas le carnet de quêtes, qui reste derrière l'onglet /quetes).
 *
 * Ce layout ((qg)/layout.tsx) monte une vingtaine de composants annexes
 * (porte, courrier, gramophone, sheets…) sans rapport avec cette tâche : ils
 * sont bouchonnés en stubs inertes pour isoler le comportement testé, à
 * l'image de `src/app/page.test.tsx` (IntroPorte/IrisTransition mockés).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import QgLayout from "./layout";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import { initAlbums } from "@/lib/albums";
import type { AlbumsState, GameState } from "@/types/game";

// jsdom n'implémente pas `window.scrollTo` (seulement `Element.prototype`,
// déjà stubbé dans vitest.setup.ts) — le layout l'appelle au montage pour
// remettre le scroll résiduel d'un onglet précédent à zéro.
window.scrollTo = () => {};

let mockPathname = "/bureau";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

const recyclerDoublonsAlbum = vi.fn();
const marquerPieceConsultee = vi.fn();
const poserTimbre = vi.fn();
const rendreTimbreAuBac = vi.fn();

let mockState: GameState | null = null;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: mockState,
    isHydrated: true,
    acheterGazette: vi.fn(),
    ouvrirGazetteOfferte: vi.fn(),
    terminerTutoGazette: vi.fn(),
    refuserGazette: vi.fn(),
    marquerCourrierLu: vi.fn(),
    livrerMission: vi.fn(),
    avancerJour: vi.fn(),
    tempsConfiance: () => Date.now(),
    rerollMeteo: vi.fn(),
    rerollCelebrite: vi.fn(),
    // Requis par `ClasseurOverlay`/`AlbumTimbresOverlay` (Task 13, câblées au
    // layout par cette Task 14) — `useGame()` les destructure inconditionnellement.
    recyclerDoublonsAlbum,
    marquerPieceConsultee,
    poserTimbre,
    rendreTimbreAuBac,
  }),
  useGameActions: () => ({
    avancerTutoriel: vi.fn(),
    terminerTutoriel: vi.fn(),
    accepterChapitrePrincipal: vi.fn(),
    ouvrirObjetColis: vi.fn(),
    ouvrirCadeauAnniversaire: vi.fn(),
    terminerMiniTutoVinyle: vi.fn(),
    terminerMiniTutoCarnet: vi.fn(),
    // Requis par `MobileHeader` (rendu par le header du layout).
    tempsConfiance: () => Date.now(),
  }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    playClick: vi.fn(),
    playPaper: vi.fn(),
    playNewspaper: vi.fn(),
    playDoorOpen: vi.fn(),
    playDoorClose: vi.fn(),
    startCatPurr: vi.fn(),
    stopCatPurr: vi.fn(),
    playGramophoneSong: vi.fn(),
    pauseVinyl: vi.fn(),
    resumeVinyl: vi.fn(),
    setVinylTargetVolume: vi.fn(),
    setVinylAmbianceVolume: vi.fn(),
    setVinylAmbianceLowpass: vi.fn(),
    startNeedle: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  // `ClasseurOverlay`/`AlbumTimbresOverlay` appellent `useToast`
  // inconditionnellement, avant leur propre garde `if (!open) return null`.
  useToast: () => ({ toast: vi.fn() }),
}));

// Composants du panorama sans rapport avec cette tâche : stubs inertes, pour
// ne pas avoir à fournir un GameState complet (missions, tendances, météo…)
// juste pour les monter.
vi.mock("@/components/mobile/qg/QgJournalSol", () => ({
  QgJournalSol: () => null,
}));
vi.mock("@/components/mobile/qg/QgPorte", () => ({ QgPorte: () => null }));
vi.mock("@/components/mobile/qg/QgColis", () => ({ QgColis: () => null }));
vi.mock("@/components/mobile/qg/QgCadeau", () => ({ QgCadeau: () => null }));
vi.mock("@/components/mobile/qg/QgCourrier", () => ({
  QgCourrier: () => null,
}));
vi.mock("@/components/mobile/qg/QgPortemanteau", () => ({
  QgPortemanteau: () => null,
}));
vi.mock("@/components/mobile/qg/QgCalendrier", () => ({
  QgCalendrier: () => null,
}));
vi.mock("@/components/mobile/qg/QgFauteuil", () => ({
  QgFauteuil: () => null,
}));
vi.mock("@/components/mobile/qg/QgGramophone", () => ({
  QgGramophone: () => null,
}));
vi.mock("@/components/mobile/qg/QgChatBaladeur", () => ({
  QgChatBaladeur: () => null,
}));
vi.mock("@/components/mobile/qg/GazetteAchatModale", () => ({
  GazetteAchatModale: () => null,
}));
vi.mock("@/components/mobile/GazetteSheet", () => ({
  GazetteSheet: () => null,
}));
vi.mock("@/components/mobile/qg/sheets/PorteSheet", () => ({
  PorteSheet: () => null,
}));
vi.mock("@/components/mobile/qg/sheets/PasserConfirmSheet", () => ({
  PasserConfirmSheet: () => null,
}));
vi.mock("@/components/mobile/qg/sheets/CourrierSheet", () => ({
  CourrierSheet: () => null,
}));
vi.mock("@/components/mobile/qg/sheets/CalendrierSheet", () => ({
  CalendrierSheet: () => null,
}));
vi.mock("@/components/mobile/qg/sheets/GramophoneSheet", () => ({
  GramophoneSheet: () => null,
}));
vi.mock("@/components/mobile/qg/overlays/ColisOverlay", () => ({
  ColisOverlay: () => null,
}));
vi.mock("@/components/mobile/qg/GrandPereBadge", () => ({
  GrandPereBadge: ({ visible }: { visible: boolean }) => (
    <div data-testid="grand-pere-badge" data-visible={String(visible)} />
  ),
}));
// Un chapitre toujours prêt : la pastille du grand-père est visible par défaut,
// ce qui permet de prouver qu'un album ouvert la masque.
vi.mock("@/lib/quetes/principales", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/quetes/principales")>()),
  chapitrePret: () => ({ id: "ch_test", dialogue: [] }),
}));
vi.mock("@/components/mobile/qg/LivrablesBadges", () => ({
  LivrablesBadges: () => null,
}));
vi.mock("@/components/mobile/dialogue/DialogueOverlay", () => ({
  DialogueOverlay: () => null,
}));
vi.mock("@/components/mobile/qg/carnet/CarnetOverlay", () => ({
  CarnetOverlay: () => null,
}));
vi.mock("@/components/mobile/EnergieRecharge", () => ({
  EnergieRecharge: () => null,
}));
vi.mock("@/components/mobile/IrisTransition", () => ({
  IrisArrivee: () => null,
}));

function etat(albums: AlbumsState): GameState {
  return createMockGameState({ albums });
}

afterEach(() => {
  cleanup();
  mockState = null;
  vi.clearAllMocks();
});

describe("(qg)/layout — le livre de comptes et la sheet « Mes albums »", () => {
  it("aucun album acheté : pas de livre de comptes sur le bureau", () => {
    mockState = etat(initAlbums());
    render(<QgLayout>{null}</QgLayout>);
    expect(document.querySelector('img[src="/qg/carnet.webp"]')).toBeNull();
  });

  it("le classeur acheté : le livre est là, et l'ouvre sur « Mes albums »", () => {
    mockState = etat({
      ...initAlbums(),
      classeur: { achete: true, pieces: {}, nouvelles: [] },
    });
    render(<QgLayout>{null}</QgLayout>);

    const livre = document.querySelector('img[src="/qg/carnet.webp"]');
    expect(livre).not.toBeNull();
    const bouton = livre!.closest("button") as HTMLButtonElement;
    expect(bouton.getAttribute("aria-label")).toBe("Mes albums");

    fireEvent.click(bouton);

    expect(screen.getByRole("dialog")).toBeTruthy();
    const boutonClasseur = screen.getByRole("button", {
      name: "Classeur de cartes",
    }) as HTMLButtonElement;
    expect(boutonClasseur.disabled).toBe(false);
  });
});

describe("(qg)/layout — un album ouvert masque la pastille du grand-père", () => {
  it("la pastille (z-index 40) disparaît tant que le classeur est ouvert, comme pour le carnet", () => {
    mockState = etat({
      ...initAlbums(),
      classeur: { achete: true, pieces: {}, nouvelles: [] },
    });
    render(<QgLayout>{null}</QgLayout>);
    const badge = () => screen.getByTestId("grand-pere-badge").dataset.visible;
    expect(badge()).toBe("true");

    const livre = document
      .querySelector('img[src="/qg/carnet.webp"]')!
      .closest("button")!;
    fireEvent.click(livre);
    fireEvent.click(screen.getByRole("button", { name: "Classeur de cartes" }));
    expect(
      screen.getByRole("dialog", { name: "Classeur de cartes" }),
    ).toBeTruthy();
    expect(badge()).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(badge()).toBe("true");
  });
});

describe("(qg)/layout — un album ouvert se ferme quand on quitte le bureau", () => {
  afterEach(() => {
    mockPathname = "/bureau";
  });

  it("taper « Réserve » (→ /stockage) ferme le classeur, comme le gramophone", () => {
    mockState = etat({
      ...initAlbums(),
      classeur: { achete: true, pieces: {}, nouvelles: [] },
    });
    const { rerender } = render(<QgLayout>{null}</QgLayout>);
    fireEvent.click(
      document.querySelector('img[src="/qg/carnet.webp"]')!.closest("button")!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Classeur de cartes" }));
    expect(
      screen.getByRole("dialog", { name: "Classeur de cartes" }),
    ).toBeTruthy();

    mockPathname = "/stockage";
    rerender(<QgLayout>{null}</QgLayout>);
    expect(
      screen.queryByRole("dialog", { name: "Classeur de cartes" }),
    ).toBeNull();
  });
});
