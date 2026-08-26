// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BorneArcadeEcran } from "./BorneArcadeEcran";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";
import { ATTENUATION_AMBIANCE_BORNE } from "./bazarAudioCurves";

const setAmbienceDuck = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    setAmbienceDuck: (f: number) => setAmbienceDuck(f),
    // `EcranArcade`, monté par ce composant, pilote sa propre piste.
    playArcadeTrack: () => Promise.resolve(),
    stopArcade: () => {},
  },
}));

// `EcranArcade` monte désormais `SoutienSheet` en permanence (fermée par
// défaut), qui tire `useSettings` — sans mock, tout rendu de cet écran
// casserait avant même d'atteindre le composant sous test. Même mock que
// `SoutienSheet.test.tsx`.
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    playClick: vi.fn(),
  }),
}));

// jsdom ne fournit pas ResizeObserver ; le composant le construit dès son
// premier rendu ouvert, donc le bouchon doit être posé avant tout render.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as never;

afterEach(cleanup);

const JEUX = JEUX_ARCADE.map((templateId) => ({ templateId, trouve: false }));

function monter(open = true) {
  const onClose = vi.fn();
  render(<BorneArcadeEcran open={open} jeux={JEUX} onClose={onClose} />);
  return { onClose };
}

describe("BorneArcadeEcran", () => {
  it("ne rend rien quand il est fermé", () => {
    monter(false);
    expect(screen.queryByRole("dialog")).toBe(null);
  });

  it("est un dialogue modal nommé", () => {
    monter();
    const dlg = screen.getByRole("dialog");
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(dlg.getAttribute("aria-label")).toBe("Borne d'arcade");
  });

  it("se ferme au tap sur le fond, et pas au tap sur la borne", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("borne-facade"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se ferme à la touche Échap", () => {
    const { onClose } = monter();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Une sortie visible est exigée : le fond et Échap ne se devinent pas.
  it("porte un bouton de fermeture visible et nommé", () => {
    const { onClose } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Fermer la borne" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // LE point d'architecture : l'interface est DESSOUS, la façade DESSUS.
  // C'est ce qui fait que les joysticks dessinés masquent l'écran sans
  // qu'aucun masque n'ait à être fabriqué.
  it("pose l'écran AVANT la façade dans l'ordre du DOM", () => {
    monter();
    const cadre = screen.getByTestId("borne-facade");
    const enfants = Array.from(cadre.children);
    const iEcran = enfants.findIndex((e) => e.getAttribute("data-testid") === "borne-fenetre");
    const iImage = enfants.findIndex((e) => e.tagName === "IMG");
    expect(iEcran).toBeGreaterThanOrEqual(0);
    expect(iImage).toBeGreaterThan(iEcran);
  });

  // Sans ça, la façade avale les taps destinés aux flèches qui sont dessous.
  it("la façade laisse passer les doigts", () => {
    monter();
    const img = screen.getByTestId("borne-facade").querySelector("img") as HTMLImageElement;
    expect(img.style.pointerEvents).toBe("none");
    expect(img.getAttribute("alt")).toBe("");
  });

  it("place la fenêtre aux pourcentages mesurés du caisson", () => {
    monter();
    const f = screen.getByTestId("borne-fenetre");
    expect(f.style.left).toBe("14.16%");
    expect(f.style.right).toBe("14.22%");
    expect(f.style.top).toBe("24.57%");
    expect(f.style.bottom).toBe("25.96%");
  });
});

/* ------------------------------------------------------------------ */
/* La rue passe derrière la borne                                      */
/* ------------------------------------------------------------------ */

describe("BorneArcadeEcran — l'ambiance du Bazar", () => {
  it("atténue la rue tant que la borne est ouverte", () => {
    setAmbienceDuck.mockClear();
    monter(true);
    expect(setAmbienceDuck).toHaveBeenCalledWith(ATTENUATION_AMBIANCE_BORNE);
  });

  it("ne touche à rien tant que la borne est fermée", () => {
    setAmbienceDuck.mockClear();
    monter(false);
    expect(setAmbienceDuck).not.toHaveBeenCalled();
  });

  it("rend son volume à la rue en refermant", () => {
    const { onClose } = monter(true);
    setAmbienceDuck.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Fermer la borne" }));
    // Le composant est piloté par `open` : c'est le parent qui referme. Le
    // démontage est la seule voie de sortie garantie, quelle qu'ait été la
    // façon de fermer (croix, Échap, voile).
    expect(onClose).toHaveBeenCalled();
    cleanup();
    expect(setAmbienceDuck).toHaveBeenCalledWith(1);
  });

  // Le facteur est posé par la BORNE et rendu par elle : jamais un volume
  // absolu, sans quoi il faudrait retenir la zone du panorama d'où le joueur
  // a ouvert le meuble.
  it("ne pose et ne rend qu'un facteur, jamais un volume de zone", () => {
    setAmbienceDuck.mockClear();
    monter(true);
    cleanup();
    for (const [facteur] of setAmbienceDuck.mock.calls) {
      expect(facteur).toBeGreaterThan(0);
      expect(facteur).toBeLessThanOrEqual(1);
    }
  });
});
