// @vitest-environment jsdom
/**
 * OuverturePochetteTimbresOverlay — la cérémonie d'ouverture d'une pochette
 * de 3 TIMBRES achetée au Bazar (décision Guillaume 2026-09-05) : l'enveloppe
 * fermée s'ouvre d'un glisser VERS LE HAUT sur son rabat, puis les 3 timbres
 * en sortent à tour de rôle et s'alignent en grand devant elle, chacun jouant
 * son son de rareté à l'instant où il se pose. Rendu hors `LangueProvider` :
 * le contexte par défaut est français.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OuverturePochetteTimbresOverlay } from "./OuverturePochetteTimbresOverlay";
import { audioManager } from "@/lib/audio/audioManager";
import { piecesDe } from "@/data/pieces";

const flyToTab = vi.fn();
vi.mock("@/lib/flyAnimation", () => ({ flyToTab: (o: unknown) => flyToTab(o) }));

vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playPaper: vi.fn(() => Promise.resolve()),
    playRevelationCarte: vi.fn(),
    playDecouverte: vi.fn(),
  },
}));

const timbres = piecesDe("timbres");
const commun = timbres.find((t) => t.rarete === "commun")!;
const rare = timbres.find((t) => t.rarete === "rare")!;
// commun déjà possédé (→ ×2), rare inédit, le même commun encore (→ ×3).
const PIECES = [commun.id, rare.id, commun.id];

function rendre(props: Partial<Parameters<typeof OuverturePochetteTimbresOverlay>[0]> = {}) {
  return render(
    <OuverturePochetteTimbresOverlay
      pieces={PIECES}
      quantitesAvant={{ [commun.id]: 1 }}
      onClose={() => {}}
      {...props}
    />,
  );
}

/** Glisser sur un élément, de (x0,y0) à (x1,y1). */
function glisser(el: HTMLElement, x0: number, y0: number, x1: number, y1: number) {
  fireEvent.pointerDown(el, { clientX: x0, clientY: y0, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: (x0 + x1) / 2, clientY: (y0 + y1) / 2, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: x1, clientY: y1, pointerId: 1 });
}

/** Par pas de 100 ms dans des `act()` séparés : les minuteurs se ré-arment par effets. */
function avancer(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(100);
    });
  }
}

const pochette = () => screen.getByTestId("pochette");
const timbresPoses = () => screen.queryAllByTestId("timbre-paquet").filter((t) => t.dataset.pose === "1");

function ouvrir(props: Partial<Parameters<typeof OuverturePochetteTimbresOverlay>[0]> = {}) {
  vi.useFakeTimers();
  const utils = rendre(props);
  glisser(pochette(), 200, 400, 200, 300);
  return utils;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("OuverturePochetteTimbresOverlay — l'enveloppe fermée", () => {
  it("affiche l'enveloppe fermée avec la main qui monte sur le rabat, sans aucun timbre ni masque", () => {
    rendre();
    expect(pochette().dataset.phase).toBe("fermee");
    expect(screen.getByTestId("main-ouverture")).toBeTruthy();
    expect(screen.queryAllByTestId("timbre-paquet")).toHaveLength(0);
    expect(screen.queryByTestId("masque-enveloppe")).toBeNull();
  });

  it("un tap, un glisser horizontal ou vers le bas n'ouvrent pas l'enveloppe", () => {
    rendre();
    fireEvent.pointerDown(pochette(), { clientX: 200, clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(pochette(), { clientX: 202, clientY: 398, pointerId: 1 });
    glisser(pochette(), 100, 400, 220, 400);
    glisser(pochette(), 200, 300, 200, 420);
    expect(pochette().dataset.phase).toBe("fermee");
    expect(audioManager.playPaper).not.toHaveBeenCalled();
  });

  it("un glisser vers le haut ouvre l'enveloppe avec un bruit de papier", () => {
    vi.useFakeTimers();
    rendre();
    glisser(pochette(), 200, 400, 200, 300);
    expect(pochette().dataset.phase).toBe("ouverte");
    expect(audioManager.playPaper).toHaveBeenCalledTimes(1);
  });

  it("Entrée ouvre aussi l'enveloppe (clavier)", () => {
    rendre();
    fireEvent.keyDown(pochette(), { key: "Enter" });
    expect(pochette().dataset.phase).toBe("ouverte");
  });
});

describe("OuverturePochetteTimbresOverlay — les timbres sortent à tour de rôle", () => {
  it("les 3 timbres sortent et se posent l'un après l'autre, chacun avec son son de rareté à la pose", () => {
    ouvrir();
    // Le rabat se soulève, puis le premier timbre MONTE hors de l'enveloppe
    // (encore petit, derrière le masque) : rien n'est posé, rien n'a sonné.
    avancer(700);
    expect(timbresPoses()).toHaveLength(0);
    expect(screen.getAllByTestId("timbre-paquet")).toHaveLength(1);
    expect(screen.getByTestId("masque-enveloppe")).toBeTruthy();
    expect(audioManager.playRevelationCarte).not.toHaveBeenCalled();
    // Puis il redescend devant l'enveloppe, grandit et se pose.
    avancer(800);
    expect(timbresPoses()).toHaveLength(1);
    expect(audioManager.playRevelationCarte).toHaveBeenCalledTimes(1);
    expect(audioManager.playRevelationCarte).toHaveBeenLastCalledWith("commun");
    // Puis les deux autres, dans l'ordre de la pochette.
    avancer(3000);
    expect(timbresPoses()).toHaveLength(3);
    expect(audioManager.playRevelationCarte).toHaveBeenCalledTimes(3);
    expect(audioManager.playRevelationCarte).toHaveBeenNthCalledWith(2, "rare");
    // Un seul inédit (le rare) : une seule cloche de découverte.
    expect(audioManager.playDecouverte).toHaveBeenCalledTimes(1);
  });

  it("les badges disent Nouveau ! ou ×N, et Ranger n'arrive qu'une fois les 3 posés", () => {
    ouvrir();
    avancer(1200);
    expect(screen.queryByRole("button", { name: "Ranger" })).toBeNull();
    avancer(3000);
    const t = screen.getAllByTestId("timbre-paquet");
    expect(t[0].textContent).toContain("×2");
    expect(t[1].textContent).toContain("Nouveau !");
    expect(t[2].textContent).toContain("×3");
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Voir" })).toBeNull();
  });

  it("Ranger : les 3 timbres s'envolent un à un vers la Collection, puis la cérémonie se ferme", () => {
    const onClose = vi.fn();
    ouvrir({ onClose });
    avancer(4200);
    fireEvent.click(screen.getByRole("button", { name: "Ranger" }));
    expect(flyToTab).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    avancer(3000);
    expect(flyToTab).toHaveBeenCalledTimes(3);
    for (const appel of flyToTab.mock.calls) {
      expect(appel[0].targetSelector).toBe('[data-fly-target="/collection"]');
      expect(appel[0].cloneDe).toBeInstanceOf(HTMLElement);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Ranger" })).toBeNull();
  });

  it("réduction de mouvement : les 3 timbres sont déjà alignés, Ranger présent, sans son", () => {
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
    rendre();
    // L'enveloppe reste en scène, déjà ouverte, sans main.
    expect(pochette().dataset.phase).toBe("ouverte");
    expect(screen.queryByTestId("main-ouverture")).toBeNull();
    expect(timbresPoses()).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
    expect(audioManager.playRevelationCarte).not.toHaveBeenCalled();
    window.matchMedia = original;
  });

  it("le voile porte le rôle dialog et le libellé d'ouverture", () => {
    rendre();
    expect(screen.getByRole("dialog", { name: "Ouverture" })).toBeTruthy();
  });
});
