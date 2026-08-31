// @vitest-environment jsdom
/**
 * OuverturePaquetOverlay — la cérémonie d'ouverture d'un paquet de 3 pièces
 * (carte ou timbre) acheté au Bazar. Rendu hors `LangueProvider` : le
 * contexte par défaut est français (cf. `LangueContext.tsx`).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OuverturePaquetOverlay } from "./OuverturePaquetOverlay";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("OuverturePaquetOverlay — révélation au tap", () => {
  it("retourne une carte par tap, dit Nouveau ! ou ×N, puis propose Voir et Ranger", () => {
    const onVoir = vi.fn();
    const onClose = vi.fn();
    render(
      <OuverturePaquetOverlay
        pieces={["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.risk_1992"]}
        quantitesAvant={{ "carte.risk_1992": 1 }}
        onVoirAlbum={onVoir}
        onClose={onClose}
      />,
    );
    const cartes = screen.getAllByTestId("carte-paquet");
    expect(cartes.every((c) => c.dataset.retournee === "0")).toBe(true);

    fireEvent.click(cartes[0]);
    expect(cartes[0].dataset.retournee).toBe("1");
    expect(screen.getByText("Nouveau !")).toBeTruthy();

    fireEvent.click(cartes[1]);
    expect(screen.getByText("×2")).toBeTruthy();

    fireEvent.click(cartes[2]);
    expect(screen.getAllByText("×2")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Voir" }));
    expect(onVoir).toHaveBeenCalled();
  });

  it("sans tap, une carte se retourne toutes les 800 ms", () => {
    vi.useFakeTimers();
    render(
      <OuverturePaquetOverlay
        pieces={["timbre.renard_roux", "timbre.lynx_boreal", "timbre.ours_des_pyrenees"]}
        quantitesAvant={{}}
        onVoirAlbum={() => {}}
        onClose={() => {}}
      />,
    );
    // Trois avances SÉPARÉES, chacune dans son propre `act` : le minuteur est
    // réarmé par un `useEffect` keyé sur `revele`, donc la révélation de la
    // 2ᵉ et de la 3ᵉ carte dépend d'un rendu React entre deux avancées —
    // qu'un unique `advanceTimersByTime(2400)` synchrone ne fournit pas.
    act(() => {
      vi.advanceTimersByTime(800);
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(
      screen.getAllByTestId("carte-paquet").every((c) => c.dataset.retournee === "1"),
    ).toBe(true);
    vi.useRealTimers();
  });

  it("un tap à 750 ms repousse l'auto-avance : elle n'arrive PAS à 800 ms", () => {
    vi.useFakeTimers();
    render(
      <OuverturePaquetOverlay
        pieces={["timbre.renard_roux", "timbre.lynx_boreal", "timbre.ours_des_pyrenees"]}
        quantitesAvant={{}}
        onVoirAlbum={() => {}}
        onClose={() => {}}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(750);
    });
    const cartes = screen.getAllByTestId("carte-paquet");
    expect(cartes[0].dataset.retournee).toBe("0");
    act(() => {
      fireEvent.click(cartes[0]);
    });
    expect(cartes[0].dataset.retournee).toBe("1");

    // Le minuteur programmé pour 800 ms (donc 50 ms après ce tap) a été
    // annulé par le tap et un nouveau posé pour 800 ms PLUS TARD : à 850 ms
    // (soit 100 ms après le tap), la carte 2 ne doit PAS encore être
    // retournée.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(cartes[1].dataset.retournee).toBe("0");

    // Encore 700 ms (800 ms écoulées depuis le tap) : la carte 2 se retourne.
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(cartes[1].dataset.retournee).toBe("1");
    vi.useRealTimers();
  });

  it("le bouton Ranger ferme la cérémonie", () => {
    const onClose = vi.fn();
    render(
      <OuverturePaquetOverlay
        pieces={["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.risk_1992"]}
        quantitesAvant={{}}
        onVoirAlbum={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ranger" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("réduction de mouvement : les 3 cartes sont retournées d'emblée", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;
    render(
      <OuverturePaquetOverlay
        pieces={["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.risk_1992"]}
        quantitesAvant={{}}
        onVoirAlbum={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getAllByTestId("carte-paquet").every((c) => c.dataset.retournee === "1"),
    ).toBe(true);
    window.matchMedia = original;
  });

  it("le voile porte le rôle dialog et le libellé d'ouverture", () => {
    render(
      <OuverturePaquetOverlay
        pieces={["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.risk_1992"]}
        quantitesAvant={{}}
        onVoirAlbum={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Ouverture" })).toBeTruthy();
  });
});
