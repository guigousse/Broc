// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { LangueProvider } from "@/lib/i18n/LangueContext";
// Sans locale forcée, `LangueProvider` retient l'anglais sous jsdom
// (`navigator.language`) : c'est donc le dictionnaire à comparer.
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

// Ce mock existe pour le test « aucun bouton n'appelle la feuille native ».
const demanderNotation = vi.fn(() => Promise.resolve());
vi.mock("@/lib/soutien/notation", () => ({
  demanderNotation: () => demanderNotation(),
}));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ playClick: vi.fn() }),
  useSettingsSafe: () => ({ playClick: vi.fn() }),
}));

import { SoutienModal } from "./SoutienModal";

function monter(onClose = () => {}) {
  return render(
    <LangueProvider>
      <SoutienModal open onClose={onClose} />
    </LangueProvider>,
  );
}

beforeEach(() => {
  ouvrirLien.mockClear();
  demanderNotation.mockClear();
  lienNotation.mockReturnValue("itms-apps://test");
});

afterEach(cleanup);

describe("SoutienModal", () => {
  it("fermée, ne rend rien", () => {
    render(
      <LangueProvider>
        <SoutienModal open={false} onClose={() => {}} />
      </LangueProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ouvre le mot de remerciement en entier (les trois paragraphes)", () => {
    monter();
    expect(screen.getByText(en.soutien.merciTitre)).toBeTruthy();
    expect(screen.getByText(en.soutien.merciCorps)).toBeTruthy();
    expect(screen.getByText(en.soutien.merciPartage)).toBeTruthy();
    expect(screen.getByText(en.soutien.merciAvis)).toBeTruthy();
  });

  // Le défaut d'origine : les boutons portaient du texte `paper-100` sur fond
  // transparent, donc du blanc cassé sur le papier de la feuille — illisibles
  // sur appareil. Ce test fige le remède demandé : fond vert, bordure laiton.
  it("les trois boutons sont sur fond vert à bordure laiton", () => {
    monter();
    for (const id of ["soutien-instagram", "soutien-tiktok", "soutien-noter"]) {
      const style = (screen.getByTestId(id) as HTMLElement).style;
      expect(style.background).toContain("--forest-800");
      expect(style.borderColor || style.border).toContain("--brass-");
      expect(style.color).toContain("--brass-300");
    }
  });

  it("chaque bouton ouvre son lien", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-instagram"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://instagram.com/broc.le.jeu");
    fireEvent.click(screen.getByTestId("soutien-tiktok"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://tiktok.com/@broc.le.jeu");
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
  // « Laisser un avis » ouvre la FICHE du store, jamais la feuille NATIVE —
  // Google l'interdit nommément et sanctionne la fiche Play, pas un test rouge.
  it("aucun bouton ne déclenche la feuille de notation native", () => {
    monter();
    fireEvent.click(screen.getByTestId("soutien-instagram"));
    fireEvent.click(screen.getByTestId("soutien-tiktok"));
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(demanderNotation).not.toHaveBeenCalled();
  });

  it("le bouton Fermer referme la page", () => {
    const onClose = vi.fn();
    monter(onClose);
    fireEvent.click(screen.getByRole("button", { name: en.commun.fermer }));
    expect(onClose).toHaveBeenCalled();
  });
});
