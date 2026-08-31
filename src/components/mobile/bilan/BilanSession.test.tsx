// @vitest-environment jsdom
/**
 * Cérémonie du bilan, en deux actes pilotés par le joueur : « Continuer »
 * envoie les objets au stockage et compose le décompte XP ; le bouton devient
 * « Rentrer à la boutique », qui envoie la pastille vers la barre de niveau
 * puis quitte la session. Les vols (`flyToTab`) sont espionnés — on teste
 * l'enchaînement, pas l'animation CSS.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BilanSession } from "./BilanSession";
import {
  CASCADE_XP_MS,
  DECALAGE_ITEM_MS,
  PAUSE_FINALE_MS,
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
const degelBudget = vi.fn();
const supplements: number[] = [];
vi.mock("@/lib/affichageGele", () => ({
  degelerXpAffichage: () => degel(),
  degelerBudgetAffichage: () => degelBudget(),
  poserSupplementBudget: (montant: number) => supplements.push(montant),
}));

let motionReduite = false;
vi.mock("@/lib/transitionIris", () => ({
  prefersReducedMotion: () => motionReduite,
}));

const playPickup = vi.fn();
const playRarete = vi.fn();
const playCash = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playPickup: () => playPickup(),
    playRarete: () => playRarete(),
    playCash: () => {
      playCash();
      return Promise.resolve();
    },
  },
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
        continuer: "Continuer",
        rentrerBoutique: "Rentrer à la boutique",
        stockageAria: "Stockage : {occupe} sur {capacite}",
        titreVente: "Bilan de journée",
        rienVendu: "Aucune vente aujourd'hui.",
        unObjetVendu: "1 objet · +{total} €",
        nObjetsVendus: "{n} objets · +{total} €",
        beneficeTotal: "bénéfice {montant} €",
        venteAchatVente: "achat {achat} € · vente {vente} €",
        venteSansAchat: "vente {vente} € · sans prix d'achat",
        xpVentes: "Ventes",
        xpJustePrix: "Juste prix",
        recetteAria: "Recette : {montant} €",
        rangeeDansAlbum: "rangée dans l'album",
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

/** Durée de l'acte 1 avec les fixtures ci-dessus (2 items, 2 lignes). */
const FIN_ACTE_1 = DECALAGE_ITEM_MS + VOL_MS + 2 * CASCADE_XP_MS;

function monter(patch: Partial<Parameters<typeof BilanSession>[0]> = {}) {
  const onTermine = vi.fn();
  const { unmount } = render(
    <BilanSession
      mode="chinage"
      titre="Brocante de Sarlat"
      items={ITEMS}
      xpLignes={XP}
      cibleVolItems='[data-fly-target="stockage-bilan"]'
      compteur={{ kind: "stockage", occupe: 8, capacite: 12 }}
      onTermine={onTermine}
      {...patch}
    />,
  );
  return { onTermine, unmount };
}

const bouton = (nom: string) =>
  screen.getByRole("button", { name: nom }) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers();
  vols.length = 0;
  degel.mockClear();
  degelBudget.mockClear();
  supplements.length = 0;
  playCash.mockClear();
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

  it("le décompte XP n'est pas visible avant le premier acte", () => {
    monter();
    expect(screen.queryByText("Achats")).toBeNull();
  });

  it("le bouton invite d'abord à continuer", () => {
    monter();
    expect(bouton("Continuer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Rentrer à la boutique" })).toBeNull();
  });

  it("rien à montrer : le bouton propose directement la sortie", () => {
    monter({ items: [], xpLignes: [] });
    expect(bouton("Rentrer à la boutique")).toBeTruthy();
  });
});

describe("BilanSession — pièce (carte/timbre)", () => {
  it("une pièce achetée est rangée dans l'album : mention + visuel de pièce", () => {
    monter({
      items: [
        {
          templateId: "timbre.renard_roux",
          nom: "Renard roux",
          categorie: "Livres & Papeterie" as const,
          prix: 12,
          album: "timbres",
        },
      ],
    });
    expect(screen.getByText(/rangée dans l'album/)).toBeTruthy();
    expect(document.querySelector('[data-testid="piece-visuel"]')).not.toBeNull();
  });

  it("un objet ordinaire n'affiche pas la mention album", () => {
    monter();
    expect(screen.queryByText(/rangée dans l'album/)).toBeNull();
  });
});

describe("BilanSession — acte 1 : « Continuer »", () => {
  it("les items s'envolent un à un vers le stockage", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(vols).toHaveLength(2);
    expect(vols[0].cible).toBe('[data-fly-target="stockage-bilan"]');
  });

  it("la jauge de stockage s'incrémente à chaque atterrissage", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(screen.getByText("9/12")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(screen.getByText("10/12")).toBeTruthy();
  });

  it("le décompte XP se compose après le dernier atterrissage", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS + VOL_MS));
    expect(screen.getByText("Achats")).toBeTruthy();
    expect(screen.queryByText("Négociations")).toBeNull();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("Négociations")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(CASCADE_XP_MS));
    expect(screen.getByText("+33 XP")).toBeTruthy();
  });

  it("l'acte 1 s'arrête sur la pastille : ni vol XP, ni dégel, ni sortie", () => {
    const { onTermine } = monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(vols).toHaveLength(2);
    expect(degel).not.toHaveBeenCalled();
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("l'acte 1 terminé, le bouton devient « Rentrer à la boutique »", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
    expect(bouton("Rentrer à la boutique").disabled).toBe(false);
    expect(screen.queryByTestId("bilan-passer")).toBeNull();
  });

  it("le bouton est inerte pendant l'animation", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    expect(bouton("Continuer").disabled).toBe(true);
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(1);
  });
});

describe("BilanSession — acte 2 : « Rentrer à la boutique »", () => {
  function jusquaLActe2() {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
  }

  it("la pastille s'envole vers la barre de niveau", () => {
    jusquaLActe2();
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(0));
    expect(vols).toHaveLength(3);
    expect(vols[2].cible).toBe('[data-fly-target="xp-header"]');
  });

  it("la barre est dégelée à l'atterrissage, la sortie suit une seconde plus tard", () => {
    const onTermine = vi.fn();
    render(
      <BilanSession
        mode="chinage"
        titre="Brocante de Sarlat"
        items={ITEMS}
        xpLignes={XP}
        cibleVolItems='[data-fly-target="stockage-bilan"]'
        compteur={{ kind: "stockage", occupe: 8, capacite: 12 }}
        onTermine={onTermine}
      />,
    );
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(PAUSE_FINALE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("le son de la pastille n'est pas celui de l'ajout d'objet", () => {
    jusquaLActe2();
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(vols[2].playSound).toBe(false);
    expect(playRarete).toHaveBeenCalledTimes(1);
  });

  it("rien acheté, rien gagné : sortie sans vol ni son de rang", () => {
    const { onTermine } = monter({ items: [], xpLignes: [] });
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(vols).toHaveLength(0);
    expect(playRarete).not.toHaveBeenCalled();
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});

describe("BilanSession — passer une animation", () => {
  it("acte 1 : un tap pose l'état de fin d'acte, sans dégeler ni sortir", () => {
    const { onTermine } = monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(screen.getByText("+33 XP")).toBeTruthy();
    expect(screen.getByText("10/12")).toBeTruthy();
    expect(bouton("Rentrer à la boutique").disabled).toBe(false);
    expect(degel).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("acte 1 : aucun nouveau vol n'est lancé après le passage", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    const avant = vols.length;
    fireEvent.click(screen.getByTestId("bilan-passer"));
    act(() => void vi.advanceTimersByTime(5000));
    expect(vols).toHaveLength(avant);
  });

  it("acte 2 : un tap dégèle et sort après 400 ms", () => {
    const onTermine = vi.fn();
    render(
      <BilanSession
        mode="chinage"
        titre="Brocante de Sarlat"
        items={ITEMS}
        xpLignes={XP}
        cibleVolItems='[data-fly-target="stockage-bilan"]'
        compteur={{ kind: "stockage", occupe: 8, capacite: 12 }}
        onTermine={onTermine}
      />,
    );
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SORTIE_APRES_PASSAGE_MS));
    expect(onTermine).toHaveBeenCalledTimes(1);
  });

  it("démonté en pleine animation : plus aucune étape ne se déclenche", () => {
    const { onTermine, unmount } = monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    unmount();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onTermine).not.toHaveBeenCalled();
    // Le capteur est porté sur document.body : resté orphelin, il bloquerait
    // toute l'interface, pas seulement le bilan.
    expect(document.querySelector('[data-testid="bilan-passer"]')).toBeNull();
  });
});

describe("BilanSession — mouvement réduit", () => {
  it("acte 1 : état final immédiat, un seul son, pas de sortie", () => {
    motionReduite = true;
    const { onTermine } = monter();
    fireEvent.click(bouton("Continuer"));
    expect(vols).toHaveLength(0);
    expect(playPickup).toHaveBeenCalledTimes(1);
    expect(playRarete).not.toHaveBeenCalled();
    expect(screen.getByText("+33 XP")).toBeTruthy();
    expect(bouton("Rentrer à la boutique")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(onTermine).not.toHaveBeenCalled();
  });

  it("acte 2 : dégel et sortie immédiats", () => {
    motionReduite = true;
    const { onTermine } = monter();
    fireEvent.click(bouton("Continuer"));
    fireEvent.click(bouton("Rentrer à la boutique"));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});

describe("BilanSession — pastille non commitée", () => {
  it("l'acte 2 lancé sans que la pastille soit rendue ne bloque pas la sortie", () => {
    // Cas limite : `refPastille` encore nulle (rendu non commité). Le vol est
    // sauté, mais dégel et sortie doivent suivre leur cours.
    const { onTermine } = monter({ xpLignes: [] });
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(PAUSE_FINALE_MS));
    expect(degel).toHaveBeenCalledTimes(1);
    expect(onTermine).toHaveBeenCalledTimes(1);
  });
});

describe("BilanSession — mode vente", () => {
  const VENTES = [
    // Revendue plus cher : bénéfice positif.
    { templateId: "chaise-thonet", nom: "Chaise Thonet", categorie: "Maison" as const, prix: 120, prixAchat: 45 },
    // Bradée : bénéfice négatif.
    { templateId: "poste-tsf", nom: "Poste TSF", categorie: "Musique" as const, prix: 60, prixAchat: 80 },
    // Cadeau du grand-père : sans prix d'achat, tout est bénéfice.
    { templateId: "veste-jean", nom: "Veste en jean", categorie: "Mode" as const, prix: 30, prixAchat: null },
  ];

  function monterVente(patch: Record<string, unknown> = {}) {
    const onTermine = vi.fn();
    render(
      <BilanSession
        mode="vente"
        titre="Vide-grenier du quartier"
        items={VENTES}
        xpLignes={[{ cle: "ventes", montant: 40 }]}
        cibleVolItems='[data-fly-target="caisse-header"]'
        compteur={{ kind: "recette" }}
        onTermine={onTermine}
        {...patch}
      />,
    );
    return { onTermine };
  }

  it("chaque objet affiche son achat, sa vente et son bénéfice", () => {
    monterVente();
    expect(screen.getByText("achat 45 € · vente 120 €")).toBeTruthy();
    expect(screen.getByText("+75 €")).toBeTruthy();
    expect(screen.getByText("achat 80 € · vente 60 €")).toBeTruthy();
    expect(screen.getByText("−20 €")).toBeTruthy();
  });

  it("sans prix d'achat connu, le prix de vente est tout le bénéfice", () => {
    monterVente();
    expect(screen.getByText("vente 30 € · sans prix d'achat")).toBeTruthy();
    expect(screen.getByText("+30 €")).toBeTruthy();
  });

  it("le cadre annonce la recette puis le bénéfice de la journée", () => {
    monterVente();
    expect(screen.getByText("Bilan de journée")).toBeTruthy();
    expect(screen.getByText("3 objets · +210 €")).toBeTruthy();
    // 75 − 20 + 30
    expect(screen.getByText("bénéfice +85 €")).toBeTruthy();
  });

  it("aucune vente : la mention le dit et le bénéfice disparaît", () => {
    monterVente({ items: [] });
    expect(screen.getByText("Aucune vente aujourd'hui.")).toBeTruthy();
    expect(screen.queryByText(/bénéfice/)).toBeNull();
  });

  it("les objets vendus s'envolent vers la caisse, la recette monte", () => {
    monterVente();
    expect(screen.getByText("+0 €")).toBeTruthy();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(vols[0].cible).toBe('[data-fly-target="caisse-header"]');
    expect(screen.getByText("+120 €")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(screen.getByText("+180 €")).toBeTruthy();
  });
});

describe("BilanSession — la caisse encaisse en direct", () => {
  const VENTES = [
    { templateId: "chaise-thonet", nom: "Chaise Thonet", categorie: "Maison" as const, prix: 120, prixAchat: 45 },
    { templateId: "poste-tsf", nom: "Poste TSF", categorie: "Musique" as const, prix: 60, prixAchat: 80 },
  ];

  function monterVente() {
    const onTermine = vi.fn();
    render(
      <BilanSession
        mode="vente"
        titre="Vide-grenier du quartier"
        items={VENTES}
        xpLignes={[{ cle: "ventes", montant: 40 }]}
        cibleVolItems='[data-fly-target="caisse-header"]'
        compteur={{ kind: "recette" }}
        onTermine={onTermine}
      />,
    );
    return { onTermine };
  }

  it("chaque atterrissage pose le cumul encaissé, pas un delta", () => {
    monterVente();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(supplements).toEqual([120]);
    act(() => void vi.advanceTimersByTime(DECALAGE_ITEM_MS));
    expect(supplements).toEqual([120, 180]);
  });

  it("l'argent qui atterrit sonne comme de l'argent, pas comme un rangement", () => {
    monterVente();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(playCash).toHaveBeenCalledTimes(1);
    expect(playPickup).not.toHaveBeenCalled();
  });

  it("passer la cérémonie encaisse tout d'un coup", () => {
    monterVente();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(0));
    fireEvent.click(screen.getByTestId("bilan-passer"));
    expect(supplements[supplements.length - 1]).toBe(180);
  });

  it("le dégel rend la caisse à sa vraie valeur", () => {
    monterVente();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(FIN_ACTE_1));
    expect(degelBudget).not.toHaveBeenCalled();
    fireEvent.click(bouton("Rentrer à la boutique"));
    act(() => void vi.advanceTimersByTime(VOL_MS));
    expect(degelBudget).toHaveBeenCalledTimes(1);
  });

  it("en chinage, la caisse n'est jamais touchée", () => {
    monter();
    fireEvent.click(bouton("Continuer"));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(supplements).toEqual([]);
    expect(playCash).not.toHaveBeenCalled();
  });
});
