// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { en } from "@/lib/i18n/ui/en";

const ouvrirLien = vi.fn((_url: string) => Promise.resolve());
vi.mock("@/lib/soutien/ouvrir", () => ({
  ouvrirLien: (url: string) => ouvrirLien(url),
}));

const lienNotation = vi.fn<() => string | null>(() => "itms-apps://test");
vi.mock("@/lib/soutien/liens", () => ({
  INSTAGRAM_URL: "https://instagram.com/broc.le.jeu",
  TIKTOK_URL: "https://tiktok.com/@broc.le.jeu",
  lienNotation: () => lienNotation(),
}));

const demanderNotation = vi.fn(() => Promise.resolve());
vi.mock("@/lib/soutien/notation", () => ({
  demanderNotation: () => demanderNotation(),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
  useSettingsSafe: () => ({ playClick: vi.fn() }),
}));

import { SoutienBorneOverlay } from "./SoutienBorneOverlay";

function monter(onClose = () => {}) {
  return render(
    <LangueProvider>
      <SoutienBorneOverlay open onClose={onClose} />
    </LangueProvider>,
  );
}

beforeEach(() => {
  ouvrirLien.mockClear();
  demanderNotation.mockClear();
  lienNotation.mockReturnValue("itms-apps://test");
});

afterEach(cleanup);

describe("SoutienBorneOverlay", () => {
  it("fermé, ne rend rien", () => {
    render(
      <LangueProvider>
        <SoutienBorneOverlay open={false} onClose={() => {}} />
      </LangueProvider>,
    );
    expect(screen.queryByTestId("soutien-borne")).toBeNull();
  });

  it("la borne dit que le jeu n'existe pas, et ce qui pourrait le faire exister", () => {
    monter();
    expect(screen.getByText(en.soutien.borneBlague)).toBeTruthy();
    expect(screen.getByText(en.soutien.borneSuite)).toBeTruthy();
  });

  // La borne ne montre QUE l'avis : les réseaux vivent à la page du menu.
  // Les rajouter ici est un choix de produit, pas un oubli — d'où ce test.
  it("aucun bouton de réseau social", () => {
    monter();
    expect(screen.queryByTestId("soutien-instagram")).toBeNull();
    expect(screen.queryByTestId("soutien-tiktok")).toBeNull();
    expect(screen.getByTestId("soutien-noter")).toBeTruthy();
  });

  it("le décor est celui de la borne : police 8-bit et cœur pixélisé", () => {
    monter();
    const bouton = screen.getByTestId("soutien-noter") as HTMLElement;
    expect(bouton.style.fontFamily).toContain("--font-arcade");
    expect(bouton.querySelector('[data-testid="coeur-pixel"]')).toBeTruthy();
  });

  it("le bouton d'avis ouvre la fiche du store", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(ouvrirLien).toHaveBeenCalledWith("itms-apps://test");
  });

  it("sans fiche sur la plateforme, le bouton n'existe pas", () => {
    lienNotation.mockReturnValue(null);
    monter();
    expect(screen.queryByTestId("soutien-noter")).toBeNull();
    // L'overlay, lui, reste : la blague vaut d'être lue même sans store.
    expect(screen.getByTestId("soutien-borne")).toBeTruthy();
  });

  // Règle non négociable du chantier (voir src/lib/soutien/notation.ts) :
  // Google interdit de déclencher la feuille de notation NATIVE depuis un
  // bouton tapé pour ça. La sanction porterait sur la fiche Play.
  it("le bouton ne déclenche jamais la feuille de notation native", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(demanderNotation).not.toHaveBeenCalled();
  });

  it("le fond referme, le cadre non", () => {
    const onClose = vi.fn();
    monter(onClose);
    fireEvent.click(screen.getByText(en.soutien.borneSuite));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("soutien-borne"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // La borne écoute Échap elle aussi : sans arrêt en phase de capture, une
  // seule touche refermait l'overlay ET le meuble.
  it("Échap referme l'overlay sans laisser passer la touche", () => {
    const onClose = vi.fn();
    const parent = vi.fn();
    window.addEventListener("keydown", parent);
    try {
      monter(onClose);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(parent).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", parent);
    }
  });
});
