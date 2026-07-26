// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CoffreChargement } from "./CoffreChargement";
import { createMockObjetEnVitrine } from "@/lib/__test-fixtures__/gameState";
import {
  RELEVE_BASCULE_MS,
  RELEVE_DUREE_MS,
  RELEVE_FONDU_SORTIE_MS,
  RELEVE_PAUSE_MS,
} from "@/lib/releveVehicule";

afterEach(cleanup);

beforeEach(() => {
  // jsdom ne décode pas les images : les masques du coffre et des objets
  // retombent sur leurs fallbacks, ce qui suffit à cette suite.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

function poser(over: Partial<Parameters<typeof CoffreChargement>[0]> = {}) {
  const props = {
    niveauCamion: 1 as const,
    budget: 500,
    stock: [],
    coffre: [],
    onAjouter: vi.fn(),
    onMove: vi.fn(),
    onRotate: vi.fn(),
    onRetirer: vi.fn(),
    onUpgrade: vi.fn(),
    onValider: vi.fn(),
    onAnnuler: vi.fn(),
    ...over,
  };
  render(<CoffreChargement {...props} />);
  return props;
}

describe("CoffreChargement — concession", () => {
  it("affiche le panneau du palier suivant au niveau 1", () => {
    poser();
    expect(screen.getByText("Concession")).toBeTruthy();
    expect(screen.getByText("Break")).toBeTruthy();
  });

  it("aucun panneau au niveau max", () => {
    poser({ niveauCamion: 3 });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("aucun panneau pendant le tutoriel de préparation d'étal", () => {
    poser({ tuto: true });
    expect(screen.queryByText("Concession")).toBeNull();
  });

  it("le tap ouvre la fiche, l'achat appelle onUpgrade avec le palier suivant", () => {
    vi.useFakeTimers();
    try {
      const props = poser();
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
      // L'échange est différé jusqu'à ce que le véhicule soit invisible.
      expect(props.onUpgrade).not.toHaveBeenCalled();
      vi.advanceTimersByTime(RELEVE_BASCULE_MS);
      expect(props.onUpgrade).toHaveBeenCalledTimes(1);
      expect(props.onUpgrade).toHaveBeenCalledWith(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("budget insuffisant : la fiche s'ouvre mais l'achat reste bloqué", () => {
    const props = poser({ budget: 40 });
    fireEvent.click(screen.getByText("Concession"));
    expect(screen.getByText("Il vous manque 160 €")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));
    expect(props.onUpgrade).not.toHaveBeenCalled();
  });

  it("tap sur Valider (voiture qui part) : la pancarte ET la fiche disparaissent", () => {
    // Un objet centré, sans chevauchement (trunkMask reste null en jsdom →
    // computeOverlapsPixel retombe sur les bornes [0,1]), pour que
    // peutValider soit vrai et que « Valider » soit tapable.
    const coffre = [
      {
        ...createMockObjetEnVitrine({
          objet: { templateId: "mus.33tours_jazz_1", categorie: "Musique" },
        }),
        posX: 0.5,
        posY: 0.5,
      },
    ];
    try {
      vi.useFakeTimers();
      poser({ coffre });

      // Ouvre la pancarte, puis la fiche de concession.
      fireEvent.click(screen.getByText("Concession"));
      expect(screen.getByRole("dialog")).toBeTruthy();

      // Fiche ouverte : « Valider » reste tapable (barre d'actions au-dessus
      // du scrim/corps de la sheet) et déclenche le départ de la voiture.
      fireEvent.click(screen.getByRole("button", { name: "Valider le chargement" }));

      // La pancarte disparaît (panneauVisible retombe sur !closing) et la
      // fiche aussi (open dérivé de sheetOuverte && !closing).
      expect(screen.queryByText("Concession")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();

      // Laisse l'animation de départ (sons + tween + rAF) aller à son terme
      // pour ne laisser aucun minuteur en suspens à la fin du test.
      act(() => {
        vi.advanceTimersByTime(6000);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("le calque plein écran de la relève ne capte plus les gestes ; le bandeau devient la cible du saut", () => {
    // NB (limite jsdom) : jsdom ne fait ni hit-testing ni `pointer-events` —
    // un clic simulé atteint toujours l'élément visé, quelle que soit la
    // pile de calques. On ne peut donc pas reproduire ici « un tap sur
    // Valider traverse le calque » ; on vérifie ce qui EST vérifiable : la
    // configuration pointerEvents qui produit ce comportement (calque
    // transparent, bandeau opaque aux pointeurs), et que le bandeau
    // lui-même déclenche bien le saut de séquence. La preuve par le geste
    // réel (tap sur « Valider » pendant la relève) revient à la recette
    // device.
    vi.useFakeTimers();
    try {
      poser();
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));

      // Le bandeau n'apparaît qu'après le fondu de sortie + la pause.
      act(() => {
        vi.advanceTimersByTime(RELEVE_FONDU_SORTIE_MS + RELEVE_PAUSE_MS);
      });

      const bandeau = screen.getByRole("button", { name: "Break — 16 places" });
      const calque = bandeau.parentElement as HTMLElement;

      expect(calque.style.pointerEvents).toBe("none");
      expect(bandeau.style.pointerEvents).toBe("auto");

      // Le tap sur le bandeau lui-même saute bien la séquence.
      fireEvent.click(bandeau);
      expect(screen.queryByRole("button", { name: "Break — 16 places" })).toBeNull();

      // Ne laisse aucun minuteur en suspens à la fin du test.
      act(() => {
        vi.advanceTimersByTime(RELEVE_DUREE_MS + 600);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("deux achats coup sur coup ne laissent vivre qu'une seule relève (pas de boucle rAF orpheline)", () => {
    // Angle honnêtement vérifiable en jsdom (pas d'accès direct à la boucle
    // rAF interne) : si la première séquence n'était pas coupée avant que
    // la seconde démarre, ses propres minuteurs arriveraient à échéance en
    // même temps que ceux de la seconde et `onUpgrade` serait appelé deux
    // fois. On vérifie aussi que la séquence se termine proprement (bandeau
    // disparu, aucun avertissement React) et pas dans un état orphelin.
    vi.useFakeTimers();
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const props = poser();

      // Premier achat : arme une première relève (minuteurs + boucle rAF).
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));

      // La pancarte ne dépend que de niveauCamion (figé dans ce test) : elle
      // reste affichée pendant la relève, comme en jeu réel — on peut donc
      // la retaper et relancer un second achat avant la fin du premier.
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));

      act(() => {
        vi.advanceTimersByTime(RELEVE_BASCULE_MS);
      });
      expect(props.onUpgrade).toHaveBeenCalledTimes(1);

      // Va jusqu'au bout : le bandeau finit par disparaître proprement.
      act(() => {
        vi.advanceTimersByTime(RELEVE_DUREE_MS + 600);
      });
      expect(screen.queryByRole("button", { name: "Break — 16 places" })).toBeNull();
      expect(erreurs).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      erreurs.mockRestore();
    }
  });

  it("« Valider » pendant la relève ne relance pas le tween de départ ; il redevient opérant une fois la relève terminée", () => {
    // Un objet centré, sans chevauchement, pour que peutValider soit vrai
    // et que « Valider » reste cliquable (non disabled) pendant tout le
    // scénario — c'est bien le garde applicatif qu'on veut exercer, pas
    // l'attribut disabled du bouton.
    const coffre = [
      {
        ...createMockObjetEnVitrine({
          objet: { templateId: "mus.33tours_jazz_1", categorie: "Musique" },
        }),
        posX: 0.5,
        posY: 0.5,
      },
    ];
    vi.useFakeTimers();
    try {
      const props = poser({ coffre });
      fireEvent.click(screen.getByText("Concession"));
      fireEvent.click(screen.getByRole("button", { name: "Acheter · 200 €" }));

      // La relève vient de démarrer (releveRafRef armé) : un tap sur
      // Valider dans cette fenêtre ne doit RIEN déclencher — sinon le tween
      // de départ capturerait la géométrie de l'ancien véhicule (Finding
      // I1).
      fireEvent.click(screen.getByRole("button", { name: "Valider le chargement" }));

      // Même en avançant bien au-delà de toute la séquence de fermeture +
      // attente + tween, rien ne s'est enclenché : preuve que le clic
      // bloqué n'a armé aucun minuteur.
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(props.onValider).not.toHaveBeenCalled();

      // La relève, elle, est bien allée à son terme (onUpgrade appelé une
      // seule fois, bandeau disparu) : le clic bloqué ne l'a pas perturbée.
      expect(props.onUpgrade).toHaveBeenCalledTimes(1);
      expect(props.onUpgrade).toHaveBeenCalledWith(2);
      expect(screen.queryByRole("button", { name: "Break — 16 places" })).toBeNull();

      // La relève terminée (releveRafRef retombé à null), « Valider »
      // redevient opérant : le second clic engage bien la fermeture puis
      // le départ jusqu'à onValider — sans quoi le correctif troquerait un
      // défaut cosmétique contre un blocage permanent.
      fireEvent.click(screen.getByRole("button", { name: "Valider le chargement" }));
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(props.onValider).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
