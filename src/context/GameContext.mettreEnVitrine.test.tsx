// @vitest-environment jsdom
/**
 * Une pièce UNIQUE n'existe qu'en un exemplaire par partie et ne réapparaît
 * jamais en chinage une fois possédée (`uniquesExclusDuChinage`). La vendre
 * serait une perte définitive et silencieuse.
 *
 * `mettreEnVitrine` est le goulot par lequel TOUT objet mis en vente passe :
 * il déplace l'objet de l'inventaire vers la vitrine. Le verrou y est le
 * dernier filet, sous celui des écrans (`stockChargeable`) — il garantit
 * qu'aucun chemin d'appel non prévu ne peut faire fuir une pièce.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
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

/** Partie neuve, vitrine ouverte, un objet donné posé dans l'inventaire. */
async function setupAvecObjet(templateId: string) {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  const objet = createMockObjet({ id: "cible", templateId });
  act(() => {
    result.current.ajouterObjet(objet);
    result.current.ouvrirVitrine("vide-grenier-quartier");
  });
  await waitFor(() => expect(result.current.state?.vitrine).toBeTruthy());
  return result;
}

describe("mettreEnVitrine — verrou sur les pièces uniques", () => {
  it("refuse une pièce unique : elle reste en stock, la vitrine reste vide", async () => {
    const result = await setupAvecObjet("uniq.art.toile_monet_inedite");
    act(() => {
      result.current.mettreEnVitrine("cible", 9999);
    });
    await waitFor(() => expect(result.current.state).not.toBeNull());
    expect(result.current.state?.vitrine?.objets ?? []).toHaveLength(0);
    expect(
      result.current.state?.inventaireJoueur.some((o) => o.id === "cible"),
    ).toBe(true);
  });

  it("laisse passer un objet ordinaire", async () => {
    const result = await setupAvecObjet("ma.lampe_petrole_ancienne");
    act(() => {
      result.current.mettreEnVitrine("cible", 40);
    });
    await waitFor(() =>
      expect(result.current.state?.vitrine?.objets ?? []).toHaveLength(1),
    );
    expect(
      result.current.state?.inventaireJoueur.some((o) => o.id === "cible"),
    ).toBe(false);
  });
});
