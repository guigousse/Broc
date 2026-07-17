// @vitest-environment jsdom
/**
 * Régression : `demarrerSurSlot` ne doit PLUS appeler `changerSlotActif`
 * avant/pendant l'intro — seulement à `onIntroFinie`, et STRICTEMENT avant
 * `nouvellePartie()`. Pendant l'intro (~3,3 s), le `GameContext` de cet
 * écran-titre reste monté sur l'ANCIEN slot actif ; si le slot changeait
 * plus tôt, un tick d'auto-sauvegarde de ce contexte pourrait écrire
 * l'ancien état dans le nouveau slot déjà « actif » en storage. On mocke
 * `IntroPorte` pour déclencher `onFini` de façon synchrone (pas besoin des
 * vrais timers) et `slots.ts` pour observer l'ordre des appels.
 *
 * Couvre aussi la transition iris de « Continuer » : fermeture d'abord
 * (aucune navigation), puis au noir flag sessionStorage + navigation vers
 * /bureau.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import TitleScreen from "./page";
import { lireFlagIris } from "@/lib/transitionIris";
import { audioManager } from "@/lib/audio/audioManager";
import { DUREE_FERMETURE_MS } from "@/lib/transitionIris";
import type { NumeroSlot } from "@/lib/storage/slots";

const demarrerMusiqueTitre = vi.fn((_l: unknown) => vi.fn());
vi.mock("@/lib/audio/titreJazz", () => ({
  demarrerMusiqueTitre: (l: unknown) => demarrerMusiqueTitre(l),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  mockState = null;
});

beforeEach(() => {
  sessionStorage.clear();
});

const nouvellePartie = vi.fn();
const reset = vi.fn();
const detacherPartie = vi.fn();
let mockState: object | null = null;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    nouvellePartie,
    state: mockState,
    isHydrated: true,
    reset,
    detacherPartie,
  }),
  useGameActions: () => ({ reset }),
}));

const playClick = vi.fn();
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick }),
}));

let introOnFini: (() => void) | null = null;
vi.mock("@/components/mobile/IntroPorte", () => ({
  IntroPorte: ({ onFini }: { onFini: () => void }) => {
    introOnFini = onFini;
    return <div data-testid="intro-porte" />;
  },
}));

let irisOnNoir: (() => void) | null = null;
vi.mock("@/components/mobile/IrisTransition", () => ({
  IrisFermeture: ({ onNoir }: { onNoir: () => void }) => {
    irisOnNoir = onNoir;
    return <div data-testid="iris-fermeture" />;
  },
}));

let partiesOnLancer: ((n: NumeroSlot) => void) | null = null;
vi.mock("@/components/mobile/PartiesModal", () => ({
  PartiesModal: ({ onLancer }: { onLancer: (n: NumeroSlot) => void }) => {
    partiesOnLancer = onLancer;
    return null;
  },
}));

function mockLocation() {
  const location = { href: "" };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: location,
  });
  return location;
}

const changerSlotActif = vi.fn();
const premierSlotLibre = vi.fn(() => 2 as const);
const slotActif = vi.fn(() => 1 as const);

vi.mock("@/lib/storage/slots", () => ({
  changerSlotActif: (n: unknown) => changerSlotActif(n),
  premierSlotLibre: () => premierSlotLibre(),
  slotActif: () => slotActif(),
}));

describe("TitleScreen — bascule de slot différée à la fin de l'intro", () => {
  it("« Nouvelle partie » lance l'intro SANS bascule immédiate de slot", () => {
    render(<TitleScreen />);
    fireEvent.click(screen.getByText("Nouvelle partie"));

    // L'intro est bien affichée (composant réel remplacé par le mock).
    expect(screen.getByTestId("intro-porte")).toBeTruthy();
    // Mais aucune bascule de slot n'a encore eu lieu.
    expect(changerSlotActif).not.toHaveBeenCalled();
    expect(nouvellePartie).not.toHaveBeenCalled();
  });

  it("à la fin de l'intro : changerSlotActif PUIS nouvellePartie, dans cet ordre", () => {
    render(<TitleScreen />);
    fireEvent.click(screen.getByText("Nouvelle partie"));

    expect(introOnFini).not.toBeNull();
    introOnFini!();

    expect(changerSlotActif).toHaveBeenCalledTimes(1);
    expect(changerSlotActif).toHaveBeenCalledWith(2);
    expect(nouvellePartie).toHaveBeenCalledTimes(1);

    const ordreChangerSlot = changerSlotActif.mock.invocationCallOrder[0];
    const ordreNouvellePartie = nouvellePartie.mock.invocationCallOrder[0];
    expect(ordreChangerSlot).toBeLessThan(ordreNouvellePartie);
  });
});

describe("TitleScreen — Continuer avec transition iris", () => {
  it("joue la fermeture d'iris SANS naviguer ni poser le flag immédiatement", () => {
    const location = mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));

    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();
    expect(location.href).toBe("");
    expect(lireFlagIris()).toBe(false);
  });

  it("au noir : pose le flag et navigue vers /bureau", () => {
    const location = mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);
    fireEvent.click(screen.getByText("Continuer"));

    irisOnNoir!();

    expect(lireFlagIris()).toBe(true);
    expect(location.href).toBe("/bureau");
  });

  it("second clic pendant la fermeture : ignoré (une seule fermeture)", () => {
    mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));
    fireEvent.click(screen.getByText("Continuer"));

    // Le garde `if (!aSauvegarde || iris) return;` court-circuite AVANT
    // playClick : sans lui, ce spy compterait 2 appels.
    expect(playClick).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId("iris-fermeture")).toHaveLength(1);
  });
});

describe("TitleScreen — lancement d'un slot via la modal Parties", () => {
  it("onLancer : iris d'abord ; au noir, détacher → bascule → flag → navigation", () => {
    const location = mockLocation();
    render(<TitleScreen />);

    act(() => partiesOnLancer!(2));

    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();
    expect(changerSlotActif).not.toHaveBeenCalled();
    expect(location.href).toBe("");

    irisOnNoir!();

    expect(detacherPartie).toHaveBeenCalledTimes(1);
    expect(changerSlotActif).toHaveBeenCalledWith(2);
    // Détachement STRICTEMENT avant la bascule : même course d'auto-
    // sauvegarde que l'ancien onJouer de PartiesModal.
    expect(detacherPartie.mock.invocationCallOrder[0]).toBeLessThan(
      changerSlotActif.mock.invocationCallOrder[0],
    );
    expect(lireFlagIris()).toBe(true);
    expect(location.href).toBe("/bureau");
  });
});

describe("TitleScreen — musique jazz du titre", () => {
  it("démarre la playlist au montage", () => {
    render(<TitleScreen />);
    expect(demarrerMusiqueTitre).toHaveBeenCalledTimes(1);
    expect(demarrerMusiqueTitre).toHaveBeenCalledWith(audioManager);
  });

  it("Continuer : fondu du bus gramophone sur la durée de fermeture de l'iris", () => {
    const fade = vi
      .spyOn(audioManager, "fadeOutVinylBus")
      .mockImplementation(() => {});
    mockLocation();
    mockState = { jourActuel: 1 };
    render(<TitleScreen />);

    fireEvent.click(screen.getByText("Continuer"));

    expect(fade).toHaveBeenCalledTimes(1);
    expect(fade).toHaveBeenCalledWith(DUREE_FERMETURE_MS);
  });

  it("lancement d'un slot : même fondu synchronisé", () => {
    const fade = vi
      .spyOn(audioManager, "fadeOutVinylBus")
      .mockImplementation(() => {});
    mockLocation();
    render(<TitleScreen />);

    act(() => partiesOnLancer!(2));

    expect(fade).toHaveBeenCalledTimes(1);
    expect(fade).toHaveBeenCalledWith(DUREE_FERMETURE_MS);
  });
});
