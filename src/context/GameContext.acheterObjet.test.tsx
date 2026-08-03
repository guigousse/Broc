// @vitest-environment jsdom
/**
 * Audit 2026-08-03 (H1) : l'achat au chinage était scindé en deux actions
 * indépendantes (`ajusterBudget(-prix)` puis `ajouterObjet`) ; stockage plein,
 * la seconde no-opait silencieusement — argent débité, objet jamais livré.
 * `acheterObjet` rend l'achat atomique : budget ET place vérifiés dans le
 * MÊME updater, échec signalé par `{ok, raison}` (patron debloquerCompetence).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { getCapaciteStockage, stockageEstPlein, totalEnStock } from "@/lib/stockage";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { localeCourante } from "@/lib/i18n/locales";

// GameProvider appelle useRouter() (nouvellePartie → router.push("/bureau")).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Évite un vrai appel réseau (HttpTimeSource interroge timeapi.io).
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => null }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupNouvellePartie() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  return result;
}

describe("GameContext.acheterObjet — achat atomique budget + stockage", () => {
  it("succès : débite le budget ET ajoute l'objet dans la même transaction", async () => {
    const result = await setupNouvellePartie();
    const budgetAvant = result.current.state!.budget;
    const stockAvant = totalEnStock(result.current.state!);
    const objet = createMockObjet({ id: "achat-ok", prixAchat: 30 });

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.acheterObjet(objet, 30);
    });

    expect(res).toEqual({ ok: true });
    expect(result.current.state!.budget).toBe(budgetAvant - 30);
    expect(totalEnStock(result.current.state!)).toBe(stockAvant + 1);
    expect(
      result.current.state!.inventaireJoueur.some((o) => o.id === "achat-ok"),
    ).toBe(true);
  });

  it("budget insuffisant : refuse sans rien débiter ni ajouter", async () => {
    const result = await setupNouvellePartie();
    const budgetAvant = result.current.state!.budget;
    const stockAvant = totalEnStock(result.current.state!);

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.acheterObjet(createMockObjet(), budgetAvant + 1);
    });

    expect(res!.ok).toBe(false);
    expect(res!.raison).toBeTruthy();
    expect(result.current.state!.budget).toBe(budgetAvant);
    expect(totalEnStock(result.current.state!)).toBe(stockAvant);
  });

  it("stockage plein : refuse AVEC raison et ne débite pas un centime", async () => {
    const result = await setupNouvellePartie();
    // Remplit le stockage à ras bord via l'action existante.
    act(() => {
      const capacite = getCapaciteStockage(result.current.state!);
      const manque = capacite - totalEnStock(result.current.state!);
      for (let i = 0; i < manque; i++) {
        result.current.ajouterObjet(createMockObjet({ id: `remplissage-${i}` }));
      }
    });
    expect(stockageEstPlein(result.current.state!)).toBe(true);
    const budgetAvant = result.current.state!.budget;
    const stockAvant = totalEnStock(result.current.state!);

    let res: { ok: boolean; raison?: string } | undefined;
    act(() => {
      res = result.current.acheterObjet(createMockObjet({ id: "achat-plein" }), 10);
    });

    expect(res!.ok).toBe(false);
    expect(res!.raison).toBe(
      DICTIONNAIRES[localeCourante()].raisons.stockagePlein,
    );
    // L'invariant qui manquait avant l'audit : AUCUN débit sans livraison.
    expect(result.current.state!.budget).toBe(budgetAvant);
    expect(totalEnStock(result.current.state!)).toBe(stockAvant);
    expect(
      result.current.state!.inventaireJoueur.some((o) => o.id === "achat-plein"),
    ).toBe(false);
  });
});
