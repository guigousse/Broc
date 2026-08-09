// @vitest-environment jsdom
/**
 * Le prix d'achat d'un objet doit survivre au passage par la collection :
 * déposé (donnerACollection) puis retiré (retirerDeCollection), l'objet
 * recréé dans l'inventaire garde son `prixAchat` — il alimentait la pastille
 * « achat » de la tarification et la négociation de vente, et se perdait
 * silencieusement à chaque aller-retour. Couvre aussi le remplacement d'une
 * donation (l'ancienne renvoyée à l'inventaire garde SON prix d'achat).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { OBJET_TEMPLATES } from "@/data/objetTemplates";
import { createMockObjet } from "@/lib/__test-fixtures__/gameState";

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

// Template réel : donnerACollection/retirerDeCollection passent par
// getTemplate() et le slot correspondant de la collection.
const TPL = OBJET_TEMPLATES[0];

function objetReel(id: string, prixAchat: number) {
  return createMockObjet({
    id,
    templateId: TPL.templateId,
    nom: TPL.nom,
    categorie: TPL.categorie,
    rarete: TPL.rarete,
    prixAchat,
  });
}

describe("GameContext — prixAchat conservé par la collection", () => {
  it("déposer puis retirer restitue le prixAchat de l'objet", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.ajouterObjet(objetReel("cycle-1", 17));
    });

    act(() => {
      expect(result.current.donnerACollection("cycle-1").ok).toBe(true);
    });
    expect(
      result.current.state!.inventaireJoueur.some((o) => o.id === "cycle-1"),
    ).toBe(false);

    act(() => {
      expect(result.current.retirerDeCollection(TPL.templateId).ok).toBe(true);
    });
    const revenu = result.current.state!.inventaireJoueur.find(
      (o) => o.templateId === TPL.templateId,
    );
    expect(revenu).toBeDefined();
    expect(revenu!.prixAchat).toBe(17);
  });

  it("remplacer une donation rend l'ancienne à l'inventaire avec SON prixAchat", async () => {
    const result = await setupNouvellePartie();
    act(() => {
      result.current.ajouterObjet(objetReel("premier", 17));
      result.current.ajouterObjet(objetReel("second", 42));
    });

    act(() => {
      expect(result.current.donnerACollection("premier").ok).toBe(true);
    });
    act(() => {
      expect(result.current.donnerACollection("second").ok).toBe(true);
    });

    // L'ancienne donation (le « premier », acheté 17 €) est revenue en stock.
    const revenu = result.current.state!.inventaireJoueur.find(
      (o) => o.templateId === TPL.templateId,
    );
    expect(revenu).toBeDefined();
    expect(revenu!.prixAchat).toBe(17);
  });
});
