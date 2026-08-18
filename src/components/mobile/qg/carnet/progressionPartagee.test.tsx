// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LigneQuete } from "./LigneQuete";
import { CarteHistoire } from "./CarteHistoire";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { Courrier } from "@/types/game";

afterEach(cleanup);

/**
 * `LigneQuete` (quête périodique) et `CarteHistoire` (chapitre de trame)
 * partagent `progressionAffichee` (objectifs.ts) précisément parce que c'est
 * la MÊME question posée deux fois : où en est cette quête, et que doit
 * afficher son compteur ? Ce test pin la propriété que le partage garantit —
 * la même quête, dans le même state, produit le même compteur quelle que
 * soit la carte qui la rend. Avant l'extraction, les deux cartes portaient
 * chacune une copie inline du calcul : un correctif appliqué à une seule
 * aurait dérivé silencieusement de l'autre sans qu'aucun test ne le voie.
 */
function courrierChiffre(): Courrier {
  return {
    id: "partage_1", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "grand-pere",
      titre: "Le nerf de la guerre", corps: ["Un pari."],
      cibles: [], objectifs: [{ type: "beneficeCumule", montant: 850 }],
      recompense: { argent: 210 },
    },
  };
}

describe("progression partagée entre les deux cartes", () => {
  it("même quête active, même state → même compteur dans LigneQuete et CarteHistoire", () => {
    const c = courrierChiffre();
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "partage_1", statut: "active" }],
    });

    const ligne = render(
      <LigneQuete courrier={c} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />,
    );
    const compteurLigne = screen.getByTestId("progression-compteur").textContent;
    ligne.unmount();

    render(<CarteHistoire courrier={c} state={state} onLivrer={() => {}} />);
    const compteurCarte = screen.getByTestId("progression-compteur").textContent;

    expect(compteurLigne).toBe(compteurCarte);
    expect(compteurLigne).toBe("0 / 850 €");
  });

  it("même quête en cérémonie, même state post-livraison → même compteur plein dans les deux cartes", () => {
    const c = courrierChiffre();
    const state = createMockGameState({
      courriers: [c],
      missions: [{ courrierId: "partage_1", statut: "livree", jourResolution: 3 }],
    });

    const ligne = render(
      <LigneQuete courrier={c} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} enCeremonie />,
    );
    const compteurLigne = screen.getByTestId("progression-compteur").textContent;
    const barreLigne = (document.querySelector('[data-testid="progression-barre"]') as HTMLElement).style.width;
    ligne.unmount();

    render(<CarteHistoire courrier={c} state={state} onLivrer={() => {}} enCeremonie />);
    const compteurCarte = screen.getByTestId("progression-compteur").textContent;
    const barreCarte = (document.querySelector('[data-testid="progression-barre"]') as HTMLElement).style.width;

    expect(compteurLigne).toBe(compteurCarte);
    expect(compteurLigne).toBe("850 / 850 €");
    expect(barreLigne).toBe(barreCarte);
    expect(barreLigne).toBe("100%");
  });
});
