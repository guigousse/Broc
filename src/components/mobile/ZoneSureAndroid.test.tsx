// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { ZoneSureAndroid } from "./ZoneSureAndroid";

const HAUT = "--safe-top-natif";
const BAS = "--safe-bottom-natif";

/** Installe (ou retire) le pont natif exposé par MainActivity.kt. */
function pont(mesures: { hautPx: () => number; basPx: () => number } | null) {
  if (mesures === null) {
    delete (window as unknown as Record<string, unknown>).BrocInsets;
    return;
  }
  (window as unknown as Record<string, unknown>).BrocInsets = mesures;
}

function lire(nom: string) {
  return document.documentElement.style.getPropertyValue(nom);
}

afterEach(() => {
  cleanup();
  pont(null);
  document.documentElement.style.removeProperty(HAUT);
  document.documentElement.style.removeProperty(BAS);
});

describe("<ZoneSureAndroid />", () => {
  it("ne pose aucune variable hors Android — le repli env() garde la main", () => {
    render(<ZoneSureAndroid />);
    expect(lire(HAUT)).toBe("");
    expect(lire(BAS)).toBe("");
  });

  it("pose les deux hauteurs mesurées au montage", () => {
    pont({ hautPx: () => 49, basPx: () => 24 });
    render(<ZoneSureAndroid />);
    expect(lire(HAUT)).toBe("49px");
    expect(lire(BAS)).toBe("24px");
  });

  it("relit au redimensionnement — le joueur peut passer des gestes aux trois boutons", () => {
    let bas = 24;
    pont({ hautPx: () => 49, basPx: () => bas });
    render(<ZoneSureAndroid />);
    expect(lire(BAS)).toBe("24px");

    bas = 48;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(lire(BAS)).toBe("48px");
  });

  it("relit au retour dans l'app — c'est là que la WebView perd ses insets", () => {
    let haut = 0;
    pont({ hautPx: () => haut, basPx: () => 24 });
    render(<ZoneSureAndroid />);
    expect(lire(HAUT)).toBe("0px");

    haut = 49;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(lire(HAUT)).toBe("49px");
  });

  it("retire les variables au démontage plutôt que de laisser des valeurs périmées", () => {
    pont({ hautPx: () => 49, basPx: () => 24 });
    const { unmount } = render(<ZoneSureAndroid />);
    unmount();
    expect(lire(HAUT)).toBe("");
    expect(lire(BAS)).toBe("");
  });

  it("ne rend rien dans le document", () => {
    pont({ hautPx: () => 49, basPx: () => 24 });
    const { container } = render(<ZoneSureAndroid />);
    expect(container.innerHTML).toBe("");
  });
});
