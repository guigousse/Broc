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
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import TitleScreen from "./page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const nouvellePartie = vi.fn();
const reset = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    nouvellePartie,
    state: null,
    isHydrated: true,
    reset,
  }),
  useGameActions: () => ({ reset }),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
}));

let introOnFini: (() => void) | null = null;
vi.mock("@/components/mobile/IntroPorte", () => ({
  IntroPorte: ({ onFini }: { onFini: () => void }) => {
    introOnFini = onFini;
    return <div data-testid="intro-porte" />;
  },
}));

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
