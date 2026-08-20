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

  it("pose les trois lots sur la planche du bas", () => {
    monter();
    expect(screen.getByTestId("article-case4")).toBeTruthy();
    expect(screen.getByTestId("article-case5")).toBeTruthy();
    expect(screen.getByTestId("article-case6")).toBeTruthy();
  });

  it("pose l'objet de la semaine au milieu de la planche du haut", () => {
    monter();
    expect(screen.getByTestId("article-case2")).toBeTruthy();
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
    expect(screen.queryByTestId("article-case2")).toBeNull();
    expect(screen.getByText(/Vendu/)).toBeTruthy();
  });

  it("vitrine vendue : l'étiquette déborde sur toute la rangée, pas juste une case", () => {
    monter({ ...ETAL, vitrine: null });
    // La géométrie est portée par le cadre ; la plaque, à l'intérieur, se
    // serre autour du texte.
    const cadre = screen.getByTestId("etiquette-vendu");
    const largeurUneCase = qgPct(BAZAR_LAYOUT.objets.case2.width);
    const largeurEtiquette = parseFloat(cadre.style.width);
    expect(largeurEtiquette).toBeGreaterThan(largeurUneCase);
  });

  it("vitrine vendue : l'étiquette est posée sur une plaque, pas à même le mur", () => {
    monter({ ...ETAL, vitrine: null });
    const plaque = screen.getByText(/Vendu/);
    expect(plaque.style.backgroundColor).toBe("var(--forest-800)");
    expect(plaque.style.color).toBe("var(--brass-300)");
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

  // La spec (§4.4) exige ce cas sur la SCÈNE, pas seulement sur un article
  // isolé : bourse à 0 → les quatre articles sont désaturés d'un bloc.
  it("bourse à 0 : les quatre articles sont désaturés et n'achètent rien", () => {
    const { onAcheter } = monter(ETAL, 0);
    for (const cle of ["case4", "case5", "case6", "case2"]) {
      const article = screen.getByTestId(`article-${cle}`);
      expect(article.style.filter).toContain("grayscale");
    }
    fireEvent.click(screen.getByRole("button", { name: /Magnatimmo/ }));
    expect(onAcheter).not.toHaveBeenCalled();
    expect(screen.getByText(/Il vous manque 8 jetons/)).toBeTruthy();
  });

  // Revue du 2026-08-20 : la scène testait `etal.vitrine && template`. Un
  // templateId retiré du catalogue annonçait « Vendu — de retour lundi » sur
  // un objet pourtant en vente, et le rendait inachetable.
  it("template inconnu : l'article reste en vente, sous son identifiant brut", () => {
    const { onAcheter } = monter({
      ...ETAL,
      vitrine: { templateId: "zz.template_disparu", valeurBase: 200, prix: 8 },
    });
    expect(screen.queryByText(/Vendu/)).toBeNull();
    const bouton = screen.getByRole("button", { name: "zz.template_disparu" });
    fireEvent.click(bouton);
    expect(onAcheter).toHaveBeenCalledWith({ type: "vitrine" });
  });

  it("la sortie est posée à la coordonnée du layout, via le hook de calage", () => {
    monter();
    const porte = screen.getByRole("button", { name: /Sortir/ }) as HTMLElement;
    expect(porte.style.left).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.left)}%`);
    expect(porte.style.width).toBe(`${qgPct(BAZAR_LAYOUT.objets.sortie.width)}%`);
  });
});
