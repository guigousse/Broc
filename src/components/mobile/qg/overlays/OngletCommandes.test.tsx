// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OngletCommandes } from "./OngletCommandes";
import { courrierDeChapitre } from "@/lib/quetes/principales";
import { chapitreParId } from "@/data/quetesPrincipales";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import { useBudgetAffiche } from "@/lib/affichageGele";
import type { GameState } from "@/types/game";

afterEach(cleanup);

const livrer = () => ({ ok: true });

/** State avec la commande du chapitre 1 (« La lampe de mon atelier ») active. */
function stateAvecLampe(): GameState {
  const ch = chapitreParId("trame_ch1");
  if (!ch) throw new Error("chapitre trame_ch1 introuvable");
  return createMockGameState({
    courriers: [courrierDeChapitre(ch, 1)],
    missions: [{ courrierId: "trame_ch1", statut: "active" }],
  });
}

/** Même state, mais la lampe demandée est en poche : la commande est livrable. */
function stateLampeLivrable(): GameState {
  const base = stateAvecLampe();
  return {
    ...base,
    inventaireJoueur: [
      createMockObjet({
        templateId: "ma.lampe_petrole_ancienne",
        nom: "Lampe à pétrole ancienne",
        categorie: "Maison",
        etat: "Très bon",
      }),
    ],
  };
}

/** State tel que le GameContext le renvoie après `livrerMission` : mission
 *  « livree », lampe consommée, récompense (60 €) déjà créditée. */
function stateApresLivraison(): GameState {
  return {
    ...stateLampeLivrable(),
    inventaireJoueur: [],
    missions: [{ courrierId: "trame_ch1", statut: "livree", jourResolution: 1 }],
    budget: 1060,
  };
}

/** Sonde du gel d'affichage de la caisse (le header réel n'est pas monté ici). */
function SondeBudget({ reel }: { reel: number }) {
  const affiche = useBudgetAffiche(reel);
  return <span data-testid="sonde-budget">{affiche}</span>;
}

describe("OngletCommandes", () => {
  it("déplie la commande dont l'id arrive APRÈS le montage (carnet déjà ouvert)", () => {
    const vide = createMockGameState({ courriers: [], missions: [] });
    const { rerender } = render(
      <OngletCommandes state={vide} onLivrerMission={livrer} ouvertInitialId={null} />,
    );
    // Le grand-père vient d'écrire dans le carnet resté ouvert.
    rerender(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });

  it("déplie aussi la commande passée dès le montage (badge livrable tapé)", () => {
    render(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });

  it("en-tête de section : libellé + compte (n)", () => {
    render(<OngletCommandes state={stateAvecLampe()} onLivrerMission={livrer} />);
    expect(screen.getByRole("button", { name: /Commandes principales \(1\)/ })).toBeTruthy();
  });

  it("livraison : la carte reste affichée pendant la cérémonie puis disparaît", () => {
    vi.useFakeTimers();
    try {
      // Harnais qui joue le GameContext : le tap sur « Livrer » fait basculer la
      // mission en « livree » et crédite les 60 € dans le state rendu ensuite.
      let courant = stateLampeLivrable();
      const onLivrerMission = vi.fn((id: string) => {
        expect(id).toBe("trame_ch1");
        courant = stateApresLivraison();
        return { ok: true };
      });
      const vue = (s: GameState) => (
        <>
          <OngletCommandes state={s} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />
          <SondeBudget reel={s.budget} />
        </>
      );
      const { rerender } = render(vue(courant));

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
      expect(onLivrerMission).toHaveBeenCalledTimes(1);

      // Le state post-livraison arrive (mission « livree »), comme du vrai contexte.
      rerender(vue(courant));

      // La carte est TOUJOURS là : la cérémonie court.
      expect(screen.getByText("La lampe de mon atelier")).toBeTruthy();
      // Et la caisse affichée est gelée sur sa valeur d'AVANT versement.
      expect(screen.getByTestId("sonde-budget").textContent).toBe("1000");

      // Le jeton XP s'est posé (620 ms) mais pas encore celui de l'argent (880 ms).
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(screen.getByTestId("sonde-budget").textContent).toBe("1000");

      // Atterrissage du jeton argent : la caisse est dégelée.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByTestId("sonde-budget").textContent).toBe("1060");
      expect(screen.getByText("La lampe de mon atelier")).toBeTruthy();

      // Au-delà de la frise complète (sortie + fondu) : la carte a quitté la liste.
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.queryByText("La lampe de mon atelier")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("échec de livraison : pas de cérémonie, la carte reste active", () => {
    vi.useFakeTimers();
    try {
      const s = stateLampeLivrable();
      const onLivrerMission = vi.fn(() => ({ ok: false, raison: "stock plein" }));
      render(
        <>
          <OngletCommandes state={s} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />
          <SondeBudget reel={s.budget} />
        </>,
      );

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
      expect(onLivrerMission).toHaveBeenCalledTimes(1);

      // Aucun gel : la caisse affichée suit la valeur réelle.
      expect(screen.getByTestId("sonde-budget").textContent).toBe("1000");

      // Aucun timer de cérémonie : la commande reste active, telle quelle.
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText("La lampe de mon atelier")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Livrer" })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
