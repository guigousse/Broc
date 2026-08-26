// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { LangueProvider } from "@/lib/i18n/LangueContext";

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

// Ce mock existe pour un seul test (« aucun bouton n'appelle... » plus bas),
// mais il doit être posé ici : c'est le module qu'il remplace.
const demanderNotation = vi.fn(() => Promise.resolve());
vi.mock("@/lib/soutien/notation", () => ({
  demanderNotation: () => demanderNotation(),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    playClick: vi.fn(),
  }),
  // `SoutienSheet` appelle désormais `useSettingsSafe` (voir SettingsContext.tsx) :
  // le mock du module doit fournir les deux, sous peine de casser au rendu
  // (le mock remplace tout l'export du module, `useSettings` seul ne suffit
  // plus).
  useSettingsSafe: () => ({
    playClick: vi.fn(),
  }),
}));

import { SoutienSheet } from "./SoutienSheet";

// `BottomSheet` lit `useLangue()` en interne pour son titre : sans provider,
// le rendu casse avant même d'atteindre le composant sous test.
function monter(props: Partial<ComponentProps<typeof SoutienSheet>> = {}) {
  return render(
    <LangueProvider>
      <SoutienSheet open onClose={() => {}} {...props} />
    </LangueProvider>,
  );
}

beforeEach(() => {
  ouvrirLien.mockClear();
  demanderNotation.mockClear();
  lienNotation.mockReturnValue("itms-apps://test");
});

afterEach(cleanup);

describe("SoutienSheet", () => {
  it("ouvre Instagram au tap", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-instagram"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://instagram.com/broc.le.jeu");
  });

  it("ouvre TikTok au tap", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-tiktok"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://tiktok.com/@broc.le.jeu");
  });

  it("le bouton de notation ouvre la fiche du store", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(ouvrirLien).toHaveBeenCalledWith("itms-apps://test");
  });

  it("sans fiche sur la plateforme, le bouton de notation n'existe pas", () => {
    lienNotation.mockReturnValue(null);
    monter();
    expect(screen.queryByTestId("soutien-noter")).toBeNull();
    expect(screen.getByTestId("soutien-instagram")).toBeTruthy();
  });

  // Règle non négociable du chantier (voir src/lib/soutien/notation.ts) :
  // la feuille de notation NATIVE ne doit JAMAIS partir d'un bouton — Google
  // l'interdit nommément et sanctionne la fiche Play, pas un test rouge.
  // Le bouton ★ de cette feuille doit toujours ouvrir l'URL de la fiche
  // (`ouvrirLien`), jamais déclencher `demanderNotation()`. Ce test existe
  // pour empêcher qu'un futur contributeur « simplifie » les deux chemins
  // en un seul sans savoir que l'un des deux est interdit par plateforme.
  it("aucun bouton (Instagram, TikTok, Noter) ne déclenche la feuille de notation native", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-instagram"));
    fireEvent.click(screen.getByTestId("soutien-tiktok"));
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(demanderNotation).not.toHaveBeenCalled();
  });

  it("l'intro n'est rendue que si on la fournit", () => {
    const { rerender } = render(
      <LangueProvider>
        <SoutienSheet open onClose={() => {}} />
      </LangueProvider>,
    );
    expect(screen.queryByText("ACCROCHE")).toBeNull();
    rerender(
      <LangueProvider>
        <SoutienSheet open onClose={() => {}} intro={<p>ACCROCHE</p>} />
      </LangueProvider>,
    );
    expect(screen.getByText("ACCROCHE")).toBeTruthy();
  });
});
