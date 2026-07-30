// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OngletCommandes } from "./OngletCommandes";
import { courrierDeChapitre } from "@/lib/quetes/principales";
import { chapitreParId } from "@/data/quetesPrincipales";
import { createMockGameState, createMockObjet } from "@/lib/__test-fixtures__/gameState";
import {
  degelerBudgetAffichage,
  degelerEnergieAffichage,
  degelerXpAffichage,
  useBudgetAffiche,
  useEnergieAffiche,
  useXpAffiche,
} from "@/lib/affichageGele";
import {
  DECALAGE_VOL_MS,
  SORTIE_APRES_DERNIER_MS,
  VOL_MS,
} from "@/lib/quetes/ceremonieLivraison";
import type { BrocanteurState, Courrier, GameState } from "@/types/game";

// Les gels d'affichage vivent dans un store de MODULE : un test qui laisse
// quelque chose de gelé contaminerait les suivants (cf. MobileHeader.test.tsx).
afterEach(() => {
  degelerXpAffichage();
  degelerBudgetAffichage();
  degelerEnergieAffichage();
  cleanup();
});

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
 *  « livree », lampe consommée, récompense (60 € + 100 XP) déjà créditée.
 *  Le chapitre 1 ne donne AUCUNE énergie — c'est ce qui rend le test du
 *  non-gel de l'énergie représentatif des quêtes réelles. */
function stateApresLivraison(): GameState {
  const base = stateLampeLivrable();
  return {
    ...base,
    inventaireJoueur: [],
    missions: [{ courrierId: "trame_ch1", statut: "livree", jourResolution: 1 }],
    budget: base.budget + 60,
    brocanteur: { ...base.brocanteur, xp: base.brocanteur.xp + 100 },
  };
}

/** Commande principale minimale dont la cible est une lampe (test à 2 cartes). */
function courrierLampe(id: string, titre: string): Courrier {
  return {
    id, type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "grand-pere",
      titre, corps: ["Rapporte-la-moi."],
      cibles: [{ templateId: "ma.lampe_petrole_ancienne", etatMin: "Bon" }],
      recompense: { argent: 60 },
    },
  };
}

/* ─── sondes de gel d'affichage (le header réel n'est pas monté ici) ───
 * Chaque sonde reçoit une valeur RÉELLE distincte de ce qu'un gel afficherait :
 * son texte dit donc sans ambiguïté « gelé » ou « pas gelé ». */

function SondeBudget({ reel }: { reel: number }) {
  const affiche = useBudgetAffiche(reel);
  return <span data-testid="sonde-budget">{affiche}</span>;
}

function SondeXp({ reel }: { reel: BrocanteurState }) {
  const affiche = useXpAffiche(reel);
  return <span data-testid="sonde-xp">{affiche.xp}</span>;
}

function SondeEnergie({ reel }: { reel: number }) {
  const affiche = useEnergieAffiche(reel);
  return <span data-testid="sonde-energie">{affiche}</span>;
}

/** Sentinelle d'énergie : jamais une valeur d'énergie plausible, donc la voir
 *  prouve l'ABSENCE de gel (un gel afficherait un entier ≥ 0). */
const ENERGIE_SENTINELLE = -1;

/** Les trois sondes, groupées, pour ne pas les oublier une par une. */
function Sondes({ state, budgetReel }: { state: GameState; budgetReel?: number }) {
  return (
    <>
      <SondeBudget reel={budgetReel ?? state.budget} />
      <SondeXp reel={state.brocanteur} />
      <SondeEnergie reel={ENERGIE_SENTINELLE} />
    </>
  );
}

const txt = (id: string) => screen.getByTestId(id).textContent;

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
      // mission en « livree » et crédite 60 € + 100 XP dans le state rendu ensuite.
      let courant = stateLampeLivrable();
      const onLivrerMission = vi.fn((id: string) => {
        expect(id).toBe("trame_ch1");
        courant = stateApresLivraison();
        return { ok: true };
      });
      const vue = (s: GameState) => (
        <>
          <OngletCommandes state={s} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />
          <Sondes state={s} />
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
      // Caisse et XP gelés sur leurs valeurs d'AVANT versement (le state rendu
      // vaut déjà 1060 / 100 XP : les sondes discriminent donc bien).
      expect(txt("sonde-budget")).toBe("1000");
      expect(txt("sonde-xp")).toBe("0");
      // Récompense SANS énergie → aucun jeton ⚡ ne volera, donc aucun
      // atterrissage pour dégeler : l'énergie ne doit JAMAIS être gelée.
      expect(txt("sonde-energie")).toBe(String(ENERGIE_SENTINELLE));

      // La carte reste « accomplie » alors que le state est déjà vidé de la lampe.
      expect(screen.getByTestId("progression-compteur").textContent).toBe("1/1");
      expect(screen.getByRole("button", { name: "Prêt ✓" })).toBeTruthy();
      expect((screen.getByRole("button", { name: "Prêt ✓" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole("button", { name: /^Livrer/ })).toBeNull();

      // Le jeton XP s'est posé, pas encore celui de l'argent (départ décalé).
      act(() => {
        vi.advanceTimersByTime(VOL_MS + 1);
      });
      expect(txt("sonde-xp")).toBe("100");
      expect(txt("sonde-budget")).toBe("1000");

      // Atterrissage du jeton argent : la caisse est dégelée.
      act(() => {
        vi.advanceTimersByTime(DECALAGE_VOL_MS);
      });
      expect(txt("sonde-budget")).toBe("1060");
      expect(screen.getByText("La lampe de mon atelier")).toBeTruthy();

      // Au-delà de la frise complète (sortie + fondu) : la carte a quitté la liste.
      act(() => {
        vi.advanceTimersByTime(SORTIE_APRES_DERNIER_MS + 1000);
      });
      expect(screen.queryByText("La lampe de mon atelier")).toBeNull();
      // Et plus aucun compteur n'est resté gelé.
      expect(txt("sonde-budget")).toBe("1060");
      expect(txt("sonde-xp")).toBe("100");
      expect(txt("sonde-energie")).toBe(String(ENERGIE_SENTINELLE));
    } finally {
      vi.useRealTimers();
    }
  });

  it("démontage en pleine cérémonie : les compteurs sont dégelés par le cleanup du composant lui-même", () => {
    vi.useFakeTimers();
    try {
      // Deux arbres de rendu SÉPARÉS : `unmount()` ci-dessous ne doit couper
      // que celui d'OngletCommandes, en laissant les sondes en place pour
      // constater l'effet du cleanup (l'`afterEach` global, qui dégèle
      // systématiquement, ne doit pas être ce qui rend ce test vert).
      let courant = stateLampeLivrable();
      const onLivrerMission = vi.fn((id: string) => {
        expect(id).toBe("trame_ch1");
        courant = stateApresLivraison();
        return { ok: true };
      });
      const onglet = render(
        <OngletCommandes state={courant} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />,
      );
      const sondes = render(<Sondes state={courant} />);

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
      expect(onLivrerMission).toHaveBeenCalledTimes(1);
      onglet.rerender(
        <OngletCommandes state={courant} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />,
      );
      sondes.rerender(<Sondes state={courant} />);

      // Cérémonie en cours : caisse et XP gelés sur les valeurs d'AVANT versement.
      expect(txt("sonde-budget")).toBe("1000");
      expect(txt("sonde-xp")).toBe("0");

      // Le carnet se referme (démontage) EN PLEINE cérémonie, bien avant que
      // les jetons n'aient fini leur vol.
      onglet.unmount();

      // Assertion faite ICI, avant l'`afterEach` global : c'est le cleanup
      // au démontage du composant qui doit avoir dégelé les compteurs.
      expect(txt("sonde-budget")).toBe("1060");
      expect(txt("sonde-xp")).toBe("100");
      expect(txt("sonde-energie")).toBe(String(ENERGIE_SENTINELLE));
    } finally {
      vi.useRealTimers();
    }
  });

  it("échec de livraison : pas de cérémonie, la carte reste active", () => {
    vi.useFakeTimers();
    try {
      const s = stateLampeLivrable();
      const onLivrerMission = vi.fn(() => ({ ok: false, raison: "stock plein" }));
      // Sonde caisse alimentée par une valeur RÉELLE distincte du budget du
      // state (1000) : un gel serait donc immédiatement visible.
      render(
        <>
          <OngletCommandes state={s} onLivrerMission={onLivrerMission} ouvertInitialId="trame_ch1" />
          <Sondes state={s} budgetReel={9999} />
        </>,
      );

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
      expect(onLivrerMission).toHaveBeenCalledTimes(1);

      // Aucun gel : les trois sondes affichent leur valeur réelle.
      expect(txt("sonde-budget")).toBe("9999");
      expect(txt("sonde-xp")).toBe("0");
      expect(txt("sonde-energie")).toBe(String(ENERGIE_SENTINELLE));

      // Aucun timer de cérémonie : la commande reste active, telle quelle.
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByText("La lampe de mon atelier")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Livrer" })).toBeTruthy();
      expect(txt("sonde-budget")).toBe("9999");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cérémonie de A en cours : le bouton Livrer de B est verrouillé", () => {
    vi.useFakeTimers();
    try {
      const cA = courrierLampe("cmd_a", "Commande A");
      const cB = courrierLampe("cmd_b", "Commande B");
      const lampe = () =>
        createMockObjet({
          templateId: "ma.lampe_petrole_ancienne",
          categorie: "Maison",
          etat: "Très bon",
        });
      // Deux lampes : les deux commandes sont livrables en même temps.
      const avant = createMockGameState({
        courriers: [cA, cB],
        missions: [
          { courrierId: "cmd_a", statut: "active" },
          { courrierId: "cmd_b", statut: "active" },
        ],
        inventaireJoueur: [lampe(), lampe()],
      });
      let courant = avant;
      const onLivrerMission = vi.fn(() => {
        // A livrée : sa lampe est consommée, B reste livrable avec la seconde.
        courant = {
          ...avant,
          inventaireJoueur: [lampe()],
          missions: [
            { courrierId: "cmd_a", statut: "livree", jourResolution: 1 },
            { courrierId: "cmd_b", statut: "active" },
          ],
        };
        return { ok: true };
      });
      const vue = (s: GameState) => (
        <OngletCommandes state={s} onLivrerMission={onLivrerMission} ouvertInitialId="cmd_a" />
      );
      const { rerender } = render(vue(courant));

      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
      rerender(vue(courant));

      // Le carnet n'ouvre qu'un détail à la fois : on déplie B pour voir son bouton.
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: /Commande B/ }));
      });
      const btnB = screen.getByRole("button", { name: "Livrer" }) as HTMLButtonElement;
      expect(btnB.disabled).toBe(true);
      // Le tap est refusé : aucune seconde livraison.
      act(() => {
        fireEvent.click(btnB);
      });
      expect(onLivrerMission).toHaveBeenCalledTimes(1);

      // Cérémonie de A terminée → B redevient livrable.
      act(() => {
        vi.advanceTimersByTime(DECALAGE_VOL_MS + VOL_MS + SORTIE_APRES_DERNIER_MS + 1000);
      });
      expect((screen.getByRole("button", { name: "Livrer" }) as HTMLButtonElement).disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
