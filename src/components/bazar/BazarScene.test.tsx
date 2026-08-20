// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BazarScene, ZONES_BAZAR } from "./BazarScene";
import { BAZAR_LAYOUT } from "./bazarLayout";
import { qgPct } from "@/components/mobile/qg/layout";
import type { EtalBazar } from "@/types/game";

afterEach(cleanup);

const ETAL: EtalBazar = {
  cleSemaine: "2026-W34",
  lotsPieces: [
    { categorie: "Musique", quantite: 5, prix: 1 },
    { categorie: "Mode", quantite: 5, prix: 1 },
    { categorie: "Maison", quantite: 5, prix: 1 },
  ],
  vitrine: { templateId: "jx.jeu_magnatimmo_annees_80", valeurBase: 200, prix: 8 },
};

function monter(etal: EtalBazar = ETAL, jetons = 25) {
  const onAcheter = vi.fn();
  const onSortir = vi.fn();
  render(<BazarScene etal={etal} jetons={jetons} onAcheter={onAcheter} onSortir={onSortir} />);
  return { onAcheter, onSortir };
}

describe("BazarScene", () => {
  it("a trois zones, en tiers, et s'ouvre sur le comptoir", () => {
    expect(ZONES_BAZAR.map((z) => z.key)).toEqual(["arcade", "comptoir", "antiquites"]);
    expect(ZONES_BAZAR.map((z) => z.center)).toEqual([1 / 6, 1 / 2, 5 / 6]);
    // La zone du milieu est celle que `UnifiedPanorama` centre au montage
    // quand `initialZone` n'est pas passé (cf. Task 1).
    expect(ZONES_BAZAR[Math.floor(ZONES_BAZAR.length / 2)].key).toBe("comptoir");
  });

  it("pose les trois lots sur la rangée du bas", () => {
    monter();
    expect(screen.getByTestId("article-case7")).toBeTruthy();
    expect(screen.getByTestId("article-case8")).toBeTruthy();
    expect(screen.getByTestId("article-case9")).toBeTruthy();
  });

  it("pose l'objet de la semaine dans la case centrale", () => {
    monter();
    expect(screen.getByTestId("article-case5")).toBeTruthy();
  });

  it("achète le lot touché, avec son index", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getAllByRole("button", { name: /Mode/ })[0]);
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 1 });
  });

  it("achète la vitrine", () => {
    const { onAcheter } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    expect(onAcheter).toHaveBeenCalledWith({ type: "vitrine" });
  });

  it("vitrine vendue : la place est vide et le dit", () => {
    monter({ ...ETAL, vitrine: null });
    expect(screen.queryByTestId("article-case5")).toBeNull();
    expect(screen.getByText(/Vendu/)).toBeTruthy();
  });

  it("vitrine vendue : l'étiquette déborde sur toute la rangée, pas juste une case", () => {
    monter({ ...ETAL, vitrine: null });
    const etiquette = screen.getByText(/Vendu/);
    const largeurUneCase = qgPct(BAZAR_LAYOUT.objets.case5.width);
    const largeurEtiquette = parseFloat(etiquette.style.width);
    expect(largeurEtiquette).toBeGreaterThan(largeurUneCase);
  });

  it("la porte fait sortir", () => {
    const { onSortir } = monter();
    fireEvent.click(screen.getByRole("button", { name: /Sortir/ }));
    expect(onSortir).toHaveBeenCalledTimes(1);
  });

  it("la borne et la table ne répondent pas", () => {
    monter();
    expect(screen.queryByTestId("article-borne")).toBeNull();
    expect(screen.queryByTestId("article-table")).toBeNull();
  });
});
