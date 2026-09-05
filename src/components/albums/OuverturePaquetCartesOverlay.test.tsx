// @vitest-environment jsdom
/**
 * OuverturePaquetCartesOverlay — la cérémonie d'ouverture d'un paquet de
 * 3 CARTES Brocomon acheté au Bazar : le paquet scellé se déchire d'un
 * glisser, puis les cartes se découvrent UNE PAR UNE en grand (tap pour
 * retourner la première, glisser vers la droite pour passer à la suivante),
 * et un résumé des 3 clôt l'ouverture. Rendu hors `LangueProvider` : le
 * contexte par défaut est français (cf. `LangueContext.tsx`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OuverturePaquetCartesOverlay } from "./OuverturePaquetCartesOverlay";
import { audioManager } from "@/lib/audio/audioManager";

const flyToTab = vi.fn();
vi.mock("@/lib/flyAnimation", () => ({ flyToTab: (o: unknown) => flyToTab(o) }));

vi.mock("@/lib/audio/audioManager", () => ({
  SON_DECHIRURE_PAQUET: "/sounds/dechirure-paquet.mp3",
  audioManager: {
    preload: vi.fn(() => Promise.resolve()),
    playDechirurePaquet: vi.fn(() => Promise.resolve()),
    playRevelationCarte: vi.fn(),
    playDecouverte: vi.fn(),
  },
}));

// commun inédit, légendaire inédit, commun déjà possédé (→ ×2).
const PIECES = [
  "carte.marteau_menuisier",
  "carte.violon_de_maitre_cremonais_1715",
  "carte.boite_de_construction_metallique_no_3",
];

function rendre(props: Partial<Parameters<typeof OuverturePaquetCartesOverlay>[0]> = {}) {
  return render(
    <OuverturePaquetCartesOverlay
      pieces={PIECES}
      quantitesAvant={{ "carte.boite_de_construction_metallique_no_3": 1 }}
      onClose={() => {}}
      {...props}
    />,
  );
}

/** Glisser horizontal sur un élément, de `de` à `a` (clientX). */
function glisser(el: HTMLElement, de: number, a: number) {
  fireEvent.pointerDown(el, { clientX: de, clientY: 300, pointerId: 1 });
  fireEvent.pointerMove(el, { clientX: (de + a) / 2, clientY: 300, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: a, clientY: 300, pointerId: 1 });
}

/** Avance le temps par pas : un minuteur ré-armé par un effet (sortie →
 *  arrivée → retournement) exige un `act()` par pas, sinon l'effet n'est
 *  posé qu'à la sortie de l'`act` et son minuteur n'est jamais avancé. */
function avancer(ms: number) {
  for (let t = 0; t < ms; t += 200) {
    act(() => {
      vi.advanceTimersByTime(200);
    });
  }
}

/** Déchire le paquet et laisse passer l'animation : la 1ʳᵉ carte est là, de dos. */
function ouvrir(props: Partial<Parameters<typeof OuverturePaquetCartesOverlay>[0]> = {}) {
  vi.useFakeTimers();
  const utils = rendre(props);
  glisser(screen.getByTestId("paquet-scelle"), 100, 200);
  avancer(2000);
  return utils;
}

const grande = () => screen.getByTestId("grande-carte");

/** Retourne la carte courante puis la fait glisser vers la droite. */
function retournerEtPasser() {
  fireEvent.click(grande());
  glisser(grande(), 100, 220);
  avancer(2000);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("OuverturePaquetCartesOverlay — le paquet scellé", () => {
  it("affiche le paquet scellé avec la main qui glisse sur la déchirure, sans aucune carte, et précharge le son", () => {
    rendre();
    const paquet = screen.getByTestId("paquet-scelle");
    expect(paquet.dataset.phase).toBe("scelle");
    expect(screen.getByTestId("main-dechirure")).toBeTruthy();
    expect(paquet.getAttribute("aria-label")).toBe("Glisse pour déchirer");
    expect(screen.queryByText("Glisse pour déchirer")).toBeNull();
    expect(screen.queryByTestId("grande-carte")).toBeNull();
    expect(screen.queryAllByTestId("carte-paquet")).toHaveLength(0);
    expect(audioManager.preload).toHaveBeenCalledWith(["/sounds/dechirure-paquet.mp3"]);
  });

  it("un simple tap ne déchire pas le paquet", () => {
    rendre();
    const paquet = screen.getByTestId("paquet-scelle");
    fireEvent.pointerDown(paquet, { clientX: 100, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(paquet, { clientX: 104, clientY: 302, pointerId: 1 });
    expect(paquet.dataset.phase).toBe("scelle");
    expect(audioManager.playDechirurePaquet).not.toHaveBeenCalled();
  });

  it("un glisser horizontal déchire le paquet avec son bruit, puis la 1ʳᵉ carte arrive de dos", () => {
    vi.useFakeTimers();
    rendre();
    const paquet = screen.getByTestId("paquet-scelle");
    glisser(paquet, 100, 200);
    expect(paquet.dataset.phase).toBe("dechire");
    expect(audioManager.playDechirurePaquet).toHaveBeenCalledTimes(1);
    avancer(2000);
    expect(screen.queryByTestId("paquet-scelle")).toBeNull();
    expect(screen.queryByTestId("main-dechirure")).toBeNull();
    const carte = grande();
    expect(carte.dataset.retournee).toBe("0");
    expect(carte.dataset.index).toBe("0");
    expect(screen.queryAllByTestId("carte-paquet")).toHaveLength(0);
  });

  it("Entrée sur le paquet le déchire aussi (clavier)", () => {
    rendre();
    const paquet = screen.getByTestId("paquet-scelle");
    fireEvent.keyDown(paquet, { key: "Enter" });
    expect(paquet.dataset.phase).toBe("dechire");
  });
});

describe("OuverturePaquetCartesOverlay — une carte à la fois", () => {
  it("un tap retourne la 1ʳᵉ carte : Nouveau !, son de sa rareté + cloche de découverte", () => {
    ouvrir();
    fireEvent.click(grande());
    expect(grande().dataset.retournee).toBe("1");
    expect(grande().textContent).toContain("Nouveau !");
    expect(audioManager.playRevelationCarte).toHaveBeenCalledWith("commun");
    expect(audioManager.playDecouverte).toHaveBeenCalledTimes(1);
  });

  it("un 2ᵉ tap sur la carte retournée ne rejoue rien", () => {
    ouvrir();
    fireEvent.click(grande());
    fireEvent.click(grande());
    expect(audioManager.playRevelationCarte).toHaveBeenCalledTimes(1);
    expect(grande().dataset.index).toBe("0");
  });

  it("un glisser sur une carte encore de dos ne passe pas à la suivante", () => {
    ouvrir();
    glisser(grande(), 100, 220);
    avancer(2000);
    expect(grande().dataset.index).toBe("0");
    expect(grande().dataset.retournee).toBe("0");
  });

  it("glisser vers la droite : la suivante arrive et se retourne toute seule, avec son son épique", () => {
    ouvrir();
    fireEvent.click(grande());
    glisser(grande(), 100, 220);
    avancer(2000);
    expect(grande().dataset.index).toBe("1");
    expect(grande().dataset.retournee).toBe("1");
    expect(grande().textContent).toContain("Nouveau !");
    expect(audioManager.playRevelationCarte).toHaveBeenLastCalledWith("legendaire");
    expect(audioManager.playDecouverte).toHaveBeenCalledTimes(2);
  });

  it("glisser vers la gauche ne fait rien", () => {
    ouvrir();
    fireEvent.click(grande());
    glisser(grande(), 220, 100);
    avancer(2000);
    expect(grande().dataset.index).toBe("0");
  });

  it("un doublon dit ×N sans cloche de découverte", () => {
    ouvrir();
    retournerEtPasser();
    glisser(grande(), 100, 220);
    avancer(2000);
    expect(grande().dataset.index).toBe("2");
    expect(grande().textContent).toContain("×2");
    expect(audioManager.playDecouverte).toHaveBeenCalledTimes(2);
  });

  it("après la 3ᵉ carte glissée, le résumé montre les 3 cartes face visible, sans Voir", () => {
    ouvrir();
    expect(screen.queryByRole("button", { name: "Ranger" })).toBeNull();
    retournerEtPasser();
    glisser(grande(), 100, 220);
    avancer(2000);
    glisser(grande(), 100, 220);
    avancer(2000);
    expect(screen.queryByTestId("grande-carte")).toBeNull();
    const cartes = screen.getAllByTestId("carte-paquet");
    expect(cartes).toHaveLength(3);
    expect(cartes.every((c) => c.dataset.retournee === "1")).toBe(true);
    expect(cartes[2].textContent).toContain("×2");
    expect(screen.queryByRole("button", { name: "Voir" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
  });

  it("Ranger : les 3 cartes s'envolent une à une vers la Collection, puis la cérémonie se ferme", () => {
    const onClose = vi.fn();
    ouvrir({ onClose });
    retournerEtPasser();
    glisser(grande(), 100, 220);
    avancer(2000);
    glisser(grande(), 100, 220);
    avancer(2000);
    fireEvent.click(screen.getByRole("button", { name: "Ranger" }));
    // Un vol par carte, décalés : le premier part tout de suite, pas les autres.
    expect(flyToTab).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    avancer(3000);
    expect(flyToTab).toHaveBeenCalledTimes(3);
    for (const appel of flyToTab.mock.calls) {
      expect(appel[0].targetSelector).toBe('[data-fly-target="/collection"]');
      expect(appel[0].cloneDe).toBeInstanceOf(HTMLElement);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
    // Un second tap sur Ranger pendant l'envol ne relance rien.
    expect(screen.queryByRole("button", { name: "Ranger" })).toBeNull();
  });

  it("réduction de mouvement : directement le résumé, sans son", () => {
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
    expect(screen.queryByTestId("paquet-scelle")).toBeNull();
    expect(screen.queryByTestId("grande-carte")).toBeNull();
    expect(screen.getAllByTestId("carte-paquet").every((c) => c.dataset.retournee === "1")).toBe(true);
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
    expect(audioManager.playRevelationCarte).not.toHaveBeenCalled();
    window.matchMedia = original;
  });

  it("le voile porte le rôle dialog et le libellé d'ouverture", () => {
    rendre();
    expect(screen.getByRole("dialog", { name: "Ouverture" })).toBeTruthy();
  });
});
