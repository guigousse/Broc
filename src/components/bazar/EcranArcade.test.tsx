// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { EcranArcade } from "./EcranArcade";
import type { JeuArcade } from "@/lib/bazar/arcade";
import { JEUX_ARCADE } from "@/lib/bazar/arcade";

const playArcadeTrack = vi.fn((_url: string) => Promise.resolve());
const stopArcade = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playArcadeTrack: (url: string) => playArcadeTrack(url),
    stopArcade: () => stopArcade(),
  },
}));

const toast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast }),
}));

// `SoutienBorneOverlay` (monté par `EcranArcade` au premier tap) tire ces deux
// modules en interne : sans mock, le rendu casse avant même d'atteindre le
// composant sous test — voir `SoutienBorneOverlay.test.tsx`.
const ouvrirLien = vi.fn((_url: string) => Promise.resolve());
vi.mock("@/lib/soutien/ouvrir", () => ({
  ouvrirLien: (url: string) => ouvrirLien(url),
}));
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    playClick: vi.fn(),
  }),
  // `SoutienBorneOverlay` appelle `useSettingsSafe` : le mock du module
  // doit fournir les deux exports, sous peine de casser au rendu.
  useSettingsSafe: () => ({
    playClick: vi.fn(),
  }),
}));

beforeEach(() => {
  playArcadeTrack.mockClear();
  stopArcade.mockClear();
});

afterEach(cleanup);

/** Les onze jeux, ceux d'indices `trouves` étant dans la collection. */
function jeux(...trouves: number[]): JeuArcade[] {
  return JEUX_ARCADE.map((templateId, i) => ({ templateId, trouve: trouves.includes(i) }));
}

describe("EcranArcade", () => {
  it("s'ouvre sur le premier jeu et affiche le compteur", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  it("un jeu trouvé montre son nom et sa capture", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    const img = screen.getByTestId("arcade-capture") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(`/bazar/arcade/${JEUX_ARCADE[0]}.webp`);
    expect(screen.getByTestId("arcade-titre").textContent).not.toBe("???");
  });

  it("un jeu inconnu montre ??? et pas de signal", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.getByTestId("arcade-titre").textContent).toBe("???");
    expect(screen.getByText("PAS DE SIGNAL")).toBeTruthy();
  });

  // La neige disait que le jeu manque, jamais COMMENT l'allumer. L'écran
  // porte donc maintenant la marche à suivre, sous « PAS DE SIGNAL ».
  it("un jeu inconnu dit comment le débloquer", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.getByTestId("arcade-indice").textContent).toBe(
      "AJOUTER LA CARTOUCHE À LA COLLECTION",
    );
  });

  it("un jeu trouvé n'affiche plus l'indice", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    expect(screen.queryByTestId("arcade-indice")).toBe(null);
  });

  // Une image posée dans le DOM puis masquée en CSS reste visible dans
  // l'onglet réseau : le contenu à découvrir fuiterait pour qui regarde.
  it("la capture d'un jeu inconnu n'est pas dans le DOM du tout", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.queryByTestId("arcade-capture")).toBe(null);
  });

  it("la flèche suivante avance d'un jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    fireEvent.click(screen.getByRole("button", { name: "Jeu suivant" }));
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
  });

  // Bornes strictes, pas de boucle : c'est la règle du carrousel de chinage,
  // et le joueur la connaît déjà.
  it("la flèche précédente est éteinte sur le premier jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const prec = screen.getByRole("button", { name: "Jeu précédent" }) as HTMLButtonElement;
    expect(prec.disabled).toBe(true);
  });

  it("la flèche suivante est éteinte sur le dernier jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const suiv = screen.getByRole("button", { name: "Jeu suivant" }) as HTMLButtonElement;
    for (let i = 0; i < 10; i++) fireEvent.click(suiv);
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("11 / 11");
    expect(suiv.disabled).toBe(true);
  });

  it("le swipe vers la gauche avance, celui vers la droite recule", () => {
    render(<EcranArcade jeux={jeux()} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 100, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
    fireEvent.pointerDown(zone, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 200, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  it("un geste plus court que le seuil ne change pas de jeu", () => {
    render(<EcranArcade jeux={jeux()} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(zone, { clientX: 175, pointerId: 1 });
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("01 / 11");
  });

  // Sans ça, un joueur non-voyant swipe dans le vide : rien ne lui dit que
  // l'écran a changé.
  it("annonce le jeu courant dans une région vivante", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.getByTestId("arcade-titre").getAttribute("aria-live")).toBe("polite");
  });

  // PLAY et FÉFÉ GAMES sont posés en HTML par-dessus la capture (pas peints
  // dans l'image) : ils n'ont de sens que sur un jeu réellement affiché.
  it("un jeu trouvé montre PLAY et FÉFÉ GAMES en décor, hors du lecteur d'écran", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    const fefe = screen.getByTestId("arcade-texte-fefe");
    const play = screen.getByTestId("arcade-texte-play");
    expect(fefe.textContent).toBe("FÉFÉ GAMES");
    expect(play.textContent).toBe("PLAY");
    expect(fefe.getAttribute("aria-hidden")).toBe("true");
    expect(play.getAttribute("aria-hidden")).toBe("true");
  });

  // Sur « PAS DE SIGNAL », un PLAY par-dessus n'aurait aucun sens.
  it("un jeu inconnu ne montre ni PLAY ni FÉFÉ GAMES", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(screen.queryByTestId("arcade-texte-fefe")).toBe(null);
    expect(screen.queryByTestId("arcade-texte-play")).toBe(null);
  });
});

/* ------------------------------------------------------------------ */
/* La bande-son du jeu affiché                                         */
/* ------------------------------------------------------------------ */

describe("EcranArcade — la bande-son", () => {
  const piste = (i: number) => `/sounds/arcade/${JEUX_ARCADE[i]}.m4a`;

  it("joue la piste du jeu affiché", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    expect(playArcadeTrack).toHaveBeenCalledWith(piste(0));
  });

  // Allumage ou changement de cartouche ne se décide PAS ici : le manager le
  // sait mieux, puisqu'il sait si une piste tourne déjà. Cet écran ne dit que
  // quel jeu est à l'affiche.
  it("changer de jeu rejoue sur la nouvelle piste", () => {
    render(<EcranArcade jeux={jeux(0, 1)} />);
    playArcadeTrack.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Jeu suivant" }));
    expect(playArcadeTrack).toHaveBeenCalledWith(piste(1));
  });

  // « PAS DE SIGNAL » n'a pas de bande-son — même raison que la capture, qui
  // n'est même pas demandée au réseau : rien ne doit trahir un jeu pas encore
  // trouvé.
  it("un jeu inconnu éteint la borne au lieu de jouer quoi que ce soit", () => {
    render(<EcranArcade jeux={jeux()} />);
    expect(playArcadeTrack).not.toHaveBeenCalled();
    expect(stopArcade).toHaveBeenCalled();
  });

  // On peut ouvrir la borne sur la neige et swiper jusqu'au premier jeu
  // trouvé : c'est LUI qui allume le meuble, pas l'écran vide d'avant.
  it("le premier jeu trouvé après la neige lance bien sa piste", () => {
    render(<EcranArcade jeux={jeux(1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Jeu suivant" }));
    expect(playArcadeTrack).toHaveBeenCalledWith(piste(1));
  });

  it("revenir sur le même jeu ne relance pas la piste", () => {
    render(<EcranArcade jeux={jeux(0, 1)} />);
    playArcadeTrack.mockClear();
    const suiv = screen.getByRole("button", { name: "Jeu suivant" });
    fireEvent.click(suiv);
    fireEvent.click(screen.getByRole("button", { name: "Jeu précédent" }));
    fireEvent.click(suiv);
    // Deux allers pour le jeu 1, un retour pour le jeu 0 : trois appels, et
    // pas un de plus — un re-rendu ne doit jamais redéclencher la lecture.
    expect(playArcadeTrack).toHaveBeenCalledTimes(3);
  });

  it("quitter l'écran éteint la borne", () => {
    const vue = render(<EcranArcade jeux={jeux(0)} />);
    stopArcade.mockClear();
    vue.unmount();
    expect(stopArcade).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Le pop-up de soutien                                                */
/* ------------------------------------------------------------------ */

describe("EcranArcade — pop-up de soutien", () => {
  beforeEach(() => {
    window.localStorage.clear();
    toast.mockClear();
  });

  /** Un tap = pointerdown puis pointerup au MÊME endroit (dx = 0). */
  function taper(zone: HTMLElement) {
    fireEvent.pointerDown(zone, { clientX: 100 });
    fireEvent.pointerUp(zone, { clientX: 100 });
  }

  it("un tap sur un jeu trouvé ouvre l'overlay de soutien", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.getByTestId("soutien-borne")).toBeTruthy();
  });

  // La borne répond à CHAQUE tap, y compris d'une session à l'autre. Elle ne
  // s'ouvrait qu'une fois par appareil du temps où l'overlay était une demande
  // greffée sur PLAY ; c'est devenu la réponse de la machine elle-même, et une
  // machine qui ne répond qu'une fois sur onze passe pour cassée.
  it("le deuxième tap rouvre l'overlay, même après un remontage", () => {
    const { unmount } = render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    unmount();

    render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.getByTestId("soutien-borne")).toBeTruthy();
    // Plus de toast de repli : il n'y a plus de tap « sans réponse ».
    expect(toast).not.toHaveBeenCalled();
  });

  it("taper un jeu NON trouvé n'ouvre rien", () => {
    render(<EcranArcade jeux={jeux()} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.queryByTestId("soutien-borne")).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("un swipe navigue et n'ouvre jamais la feuille", () => {
    render(<EcranArcade jeux={jeux(0, 1)} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200 });
    fireEvent.pointerUp(zone, { clientX: 100 });
    expect(screen.queryByTestId("soutien-borne")).toBeNull();
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
  });
});
