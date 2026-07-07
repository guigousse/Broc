// @vitest-environment jsdom
/**
 * `IntroPorte` — intro « zoom sur la porte » jouée à la nouvelle partie.
 * Séquence pilotée par setTimeout (contemplation → zoom → fondu → onFini),
 * skippable par tap, et court-circuitée si `prefers-reduced-motion`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntroPorte } from "./IntroPorte";

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // @ts-expect-error - retire le mock entre les tests
  delete window.matchMedia;
});

describe("IntroPorte", () => {
  it("appelle onFini une seule fois après la séquence complète (~3.3s)", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);

    // Avant la fin de la séquence : pas encore appelé.
    vi.advanceTimersByTime(3299);
    expect(onFini).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFini).toHaveBeenCalledTimes(1);

    // Le temps continue de s'écouler sans nouvel appel (garde finiRef).
    vi.advanceTimersByTime(5000);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("un tap n'importe où saute l'intro instantanément (onFini une seule fois, timers nettoyés)", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);

    const tapLayer = screen.getByLabelText("Passer l'introduction");
    fireEvent.pointerDown(tapLayer);
    expect(onFini).toHaveBeenCalledTimes(1);

    // Les timers en attente ont été nettoyés : pas de second appel.
    vi.advanceTimersByTime(10000);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("prefers-reduced-motion : court-circuite vers un fondu simple (~400ms) puis onFini", () => {
    mockMatchMedia(true);
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);

    vi.advanceTimersByTime(399);
    expect(onFini).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("le démontage avant la fin de la séquence nettoie les timers (pas d'appel après unmount)", () => {
    const onFini = vi.fn();
    const { unmount } = render(<IntroPorte onFini={onFini} />);
    unmount();
    vi.advanceTimersByTime(10000);
    expect(onFini).not.toHaveBeenCalled();
  });
});
