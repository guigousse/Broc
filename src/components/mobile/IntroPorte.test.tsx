// @vitest-environment jsdom
/**
 * IntroPorte version iris : contemplation (600 ms) → fermeture d'iris sur la
 * porte → flag de réouverture posé → onFini. Le zoom ×4 a disparu. Le skip
 * (tap) termine immédiatement en posant aussi le flag : l'arrivée au bureau
 * joue la réouverture dans tous les cas.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { IntroPorte } from "./IntroPorte";
import { lireFlagIris } from "@/lib/transitionIris";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({ d: { qg: { passerIntroAria: "Passer l'introduction" } } }),
}));

let irisOnNoir: (() => void) | null = null;
let irisBloqueInteractions: boolean | undefined;
vi.mock("@/components/mobile/IrisTransition", () => ({
  IrisFermeture: ({
    onNoir,
    bloqueInteractions,
  }: {
    onNoir: () => void;
    bloqueInteractions?: boolean;
  }) => {
    irisOnNoir = onNoir;
    irisBloqueInteractions = bloqueInteractions;
    return <div data-testid="iris-fermeture" />;
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  irisOnNoir = null;
  irisBloqueInteractions = undefined;
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("IntroPorte — contemplation puis iris (plus de zoom)", () => {
  it("contemplation d'abord : pas d'iris avant 600 ms", () => {
    render(<IntroPorte onFini={vi.fn()} />);
    expect(screen.queryByTestId("iris-fermeture")).toBeNull();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByTestId("iris-fermeture")).toBeTruthy();

    // Le skip doit rester vivant pendant l'iris : IntroPorte désactive le
    // blocage d'interactions de l'overlay.
    expect(irisBloqueInteractions).toBe(false);
  });

  it("au noir de l'iris : pose le flag de réouverture PUIS onFini", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);
    act(() => vi.advanceTimersByTime(600));
    expect(lireFlagIris()).toBe(false);

    act(() => irisOnNoir!());

    expect(lireFlagIris()).toBe(true);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("le tap de skip pose aussi le flag et termine immédiatement", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Passer l'introduction" }),
    );

    expect(lireFlagIris()).toBe(true);
    expect(onFini).toHaveBeenCalledTimes(1);
  });

  it("onFini n'est jamais doublé (skip pendant l'iris puis onNoir)", () => {
    const onFini = vi.fn();
    render(<IntroPorte onFini={onFini} />);
    act(() => vi.advanceTimersByTime(600));

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Passer l'introduction" }),
    );
    act(() => irisOnNoir!());

    expect(onFini).toHaveBeenCalledTimes(1);
  });
});
