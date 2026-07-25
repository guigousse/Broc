// @vitest-environment jsdom
/**
 * Cérémonie du bilan : les items s'envolent un à un vers le stockage, puis le
 * décompte XP se compose et la pastille part vers la barre de niveau. Les vols
 * (`flyToTab`) sont espionnés — on teste l'enchaînement, pas l'animation CSS.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BilanSession } from "./BilanSession";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
  POP_PASTILLE_MS,
  RESPIRATION_MS,
  SORTIE_APRES_PASSAGE_MS,
  VOL_MS,
} from "@/lib/bilan/ceremonie";

const vols: { cible: string; playSound?: boolean }[] = [];
vi.mock("@/lib/flyAnimation", () => ({
  flyToTab: (opts: { targetSelector: string; playSound?: boolean }) => {
    vols.push({ cible: opts.targetSelector, playSound: opts.playSound });
  },
}));

const degel = vi.fn();
vi.mock("@/lib/xpAffichageGele", () => ({
  degelerXpAffichage: () => degel(),
}));

let motionReduite = false;
vi.mock("@/lib/transitionIris", () => ({
  prefersReducedMotion: () => motionReduite,
}));

const playPickup = vi.fn();
const playRarete = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: { playPickup: () => playPickup(), playRarete: () => playRarete() },
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    locale: "fr",
    d: {
      bilan: {
        titreChinage: "Bilan de chinage",
        pochesVides: "Les poches vides.",
        unObjetTotal: "1 objet · −{total} €",
        nObjetsTotal: "{n} objets · −{total} €",
        xpEyebrow: "— expérience —",
        xpAchats: "Achats",
        xpDecouvertes: "Découvertes",
        xpNegociations: "Négociations",
        xpTotal: "+{n} XP",
        retourQg: "Retour au QG",
        retourQgAria: "Retour au QG",
        stockageAria: "Stockage : {occupe} sur {capacite}",
      },
    },
    tr: (modele: string, vars: Record<string, string | number>) =>
      Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        modele,
      ),
  }),
}));

// Les templateId sont volontairement absents du catalogue : `nomObjet` retombe
// alors sur le `nom` fourni, ce qui rend les assertions lisibles.
const ITEMS = [
  { templateId: "chaise-thonet", nom: "Chaise Thonet", categorie: "Maison" as const, prix: 45 },
  { templateId: "poste-tsf", nom: "Poste TSF", categorie: "Musique" as const, prix: 80 },
];

const XP = [
  { cle: "achats" as const, montant: 24 },
  { cle: "negociations" as const, montant: 9 },
];

function monter(patch: Partial<Parameters<typeof BilanSession>[0]> = {}) {
  const onTermine = vi.fn();
  const { unmount } = render(
    <BilanSession
      titre="Brocante de Sarlat"
      items={ITEMS}
      xpLignes={XP}
      cibleVolItems='[data-fly-target="stockage-bilan"]'
      stockageDepart={{ occupe: 8, capacite: 12 }}
      onTermine={onTermine}
      {...patch}
    />,
  );
  return { onTermine, unmount };
}

beforeEach(() => {
  vi.useFakeTimers();
  vols.length = 0;
  degel.mockClear();
  playPickup.mockClear();
  playRarete.mockClear();
  motionReduite = false;
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("BilanSession — état initial", () => {
  it("affiche le cadre, les items et le total dépensé", () => {
    monter();
    expect(screen.getByText("Bilan de chinage")).toBeTruthy();
    expect(screen.getByText("Brocante de Sarlat")).toBeTruthy();
    expect(screen.getByText("2 objets · −125 €")).toBeTruthy();
    expect(screen.getByText("Chaise Thonet")).toBeTruthy();
    expect(screen.getByText("Poste TSF")).toBeTruthy();
  });

  it("affiche la jauge de stockage à sa valeur d'entrée de session", () => {
    monter();
    expect(screen.getByText("8/12")).toBeTruthy();
  });

  it("sans achat : la mention des poches vides remplace la liste", () => {
    monter({ items: [] });
    expect(screen.getByText("Les poches vides.")).toBeTruthy();
  });

  it("le décompte XP n'est pas visible avant la cérémonie", () => {
    monter();
    expect(screen.queryByText("Achats")).toBeNull();
  });
});

describe("BilanSession — cérémonie", () => {
  it("les items s'envolent un à un vers le stockage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(vols).toHaveLength(2);
    expect(vols[0].cible).toBe('[data-fly-target="stockage-bilan"]');
  });

  it("la jauge de stockage s'incrémente à chaque atterrissage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(screen.getByText("9/12")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(screen.getByText("10/12")).toBeTruthy();
  });

  it("le décompte XP se compose après le dernier atterrissage, puis la pastille s'envole", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    const finItems = DECALAGE_ITEM_MS + VOL_MS;
    act(() => void vi.advanceTimersByTime(finItems));
    expect(screen.getByText("Achats")).toBeTruthy();
    expect(screen.queryByText("Négociations")).toBeNull();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("Négociations")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("+33 XP")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(POP_PASTILLE_MS + RESPIRATION_MS));
    expect(vols).toHaveLength(3);
    expect(vols[2].cible).toBe('[data-fly-target="xp-header"]');
  });

  it("la barre est dégelée à l'atterrissage de la pastille, la sortie suit", () => {
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    const jusquAuDegel =
      DECALAGE_ITEM_MS + VOL_MS + 2 * CASCADE_XP_MS + POP_PASTILLE_MS + RESPIRATION_MS + VOL_MS;
    act(() => void vi.advanceTimersByTime(jusquAuDegel));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(PAUSE_FINALE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le bouton ne peut pas relancer la cérémonie", () => {
    monter();
    const bouton = screen.getByRole("button", { name: "Retour au QG" });
    fireEvent.click(bouton);
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(bouton);
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
  });

  it("le son de la pastille n'est pas celui de l'ajout d'objet", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    // Avances fractionnées : la pastille (setPastilleVisible) doit être
    // commitée — donc `refPastille` attaché — avant que le minuteur du
    // "volPastille" ne s'exécute et lise cette ref. Un unique gros bond
    // batcherait les deux mises à jour dans le même act() et laisserait
    // la ref à null (React 19 + timers fake synchrones).
    const jusquaPastille = DECALAGE_ITEM_MS + VOL_MS + 2 * CASCADE_XP_MS;
    act(() => void vi.advanceTimersByTime(jusquaPastille));
    act(() => void vi.advanceTimersByTime(POP_PASTILLE_MS + RESPIRATION_MS));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(vols[2].playSound).toBe(false);
    expect(playRarete).toHaveBeenCalledTimes(1);
  });

  it("démonté en pleine cérémonie : plus aucune étape ne se déclenche", () => {
    const { onTermine, unmount } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    unmount();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("rien acheté, rien gagné : aucun son de rang", () => {
    const { onTermine } = monter({ items: [], xpLignes: [] });
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(playRarete).not.toHaveBeenCalled();
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});

describe("BilanSession — passer la cérémonie", () => {
  it("un tap pose l'état final, dégèle et sort après 400 ms", () => {
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(screen.getByText("+33 XP")).toBeTruthy();
    expect(screen.getByText("10/12")).toBeTruthy();
    expect(degel).toHaveBeenCalled();
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SORTIE_APRES_PASSAGE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("aucun nouveau vol n'est lancé après le passage", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    const avant = vols.length;
    fireEvent.click(screen.getByTestId("bilan-passer"));
    act(() => void vi.advanceTimersByTime(5000));
    expect(vols).toHaveLength(avant);
  });

  it("après le passage, le capteur disparaît et le bouton redevient actif", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(screen.queryByTestId("bilan-passer")).toBeNull();
    const bouton = screen.getByRole("button", { name: "Retour au QG" }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(false);
  });

  it("un tap de plus après le passage sort tout de suite, sans attendre", () => {
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le son de rang accompagne aussi le dégel du passage anticipé, une seule fois", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(playRarete).toHaveBeenCalledTimes(1);
  });
});

describe("BilanSession — mouvement réduit", () => {
  it("premier tap : état final sans vol ni sortie automatique", () => {
    motionReduite = true;
    const { onTermine } = monter();
    fireEvent.click(screen.getByRole("button", { name: "Retour au QG" }));
    expect(vols).toHaveLength(0);
    expect(playPickup).toHaveBeenCalledTimes(1);
    expect(screen.getByText("+33 XP")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(5000));
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("second tap : sortie", () => {
    motionReduite = true;
    const { onTermine } = monter();
    const bouton = screen.getByRole("button", { name: "Retour au QG" });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});
