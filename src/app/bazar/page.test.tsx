// @vitest-environment jsdom
/**
 * Revue finale (C1) : `settleBazar` ne tournait que sur le tick 60 s /
 * focus / visibilitychange / pageshow du GameContext — rien ne le
 * déclenchait à la navigation. Un joueur qui passait au jour 20 et tapait
 * aussitôt sur la porte du Bazar tombait sur un `SkeletonScreen` muet
 * jusqu'à 60 s (le temps que le tick suivant compose l'étal). Ce test
 * verrouille le déclenchement explicite au montage de l'écran.
 *
 * Minor 2 (câblage `{ ok, raison }`) : la page ignorait le retour
 * d'`acheterAuBazar` — un achat refusé (jetons insuffisants, article déjà
 * vendu par une autre course) ne disait rien au joueur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import BazarPage from "./page";
import { genererEtal } from "@/lib/bazar/etal";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";
import { audioManager } from "@/lib/audio/audioManager";
import { dureesIris, lireFlagIris } from "@/lib/transitionIris";
import { initCollection } from "@/lib/collection";
import { volumeAmbianceBazarForPos } from "@/components/bazar/bazarAudioCurves";
import { DUREE_ENVOL_MS, ECART_ENVOL_MS } from "@/components/albums/OuverturePaquetCartesOverlay";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  // MobileHeader lit la route courante pour la navigation de la puce XP.
  usePathname: () => "/bazar",
}));

const rafraichirPeriodiques = vi.fn();
const acheterAuBazar = vi.fn();
// Requis par `ClasseurOverlay`/`AlbumTimbresOverlay` — câblées à la page par
// la Tâche 12, à l'ouverture d'un album depuis la cérémonie. Non exercées
// tant que `albumOuvert` reste `null` (la majorité des tests ici), mais
// `useGame()` les destructure sans condition.
const recyclerDoublonsAlbum = vi.fn();
const marquerPieceConsultee = vi.fn();
const poserTimbre = vi.fn();
const rendreTimbreAuBac = vi.fn();
let mockState: Record<string, unknown> | null = null;

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    state: mockState,
    isHydrated: true,
    acheterAuBazar,
    rafraichirPeriodiques,
    recyclerDoublonsAlbum,
    marquerPieceConsultee,
    poserTimbre,
    rendreTimbreAuBac,
  }),
  // MobileHeader lit `tempsConfiance` via useGameActions pour la jauge d'énergie.
  useGameActions: () => ({ tempsConfiance: () => Date.now() }),
}));

const toast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast }),
  // `ClasseurOverlay`/`AlbumTimbresOverlay` (Tâche 12, câblées ici mais
  // repliées `open={false}` la plupart du temps) appellent `useToast`
  // INCONDITIONNELLEMENT, avant leur propre garde `if (!open) return null` —
  // sans ce second export, tout rendu de la page planterait.
  useToast: () => ({ toast }),
}));

const etal = genererEtal("2026-W34");

beforeEach(() => {
  mockState = {
    jourActuel: JOUR_OUVERTURE_BAZAR,
    budget: 100,
    jetons: 5,
    bazar: etal,
    // MobileHeader (rendu par la page) a besoin de ces champs pour sa jauge
    // d'énergie et sa puce de niveau — hors sujet ici, juste de quoi monter.
    energie: 5,
    energieDerniereMaj: Date.now(),
    brocanteur: { niveau: 1, xp: 0, pointsDisponibles: 0 },
    // La page dérive désormais `jeuxArcade(state.collection)` pour la borne
    // d'arcade : la collection vide suffit, juste de quoi monter.
    collection: initCollection(),
    // La porte propose désormais « Chiner », qui grise si le stockage déborde,
    // et « Étaler », qui reprend une journée en cours : de quoi les juger.
    inventaireJoueur: [],
    niveauStockage: 1,
    vitrine: null,
    // Le classeur déjà acheté : la case propose un PAQUET (5 jetons), pas
    // l'album (10 jetons) — c'est le paquet que la cérémonie de la Tâche 12
    // concerne.
    albums: {
      classeur: { achete: true, pieces: {}, nouvelles: [] },
      timbres: { achete: false, pieces: {}, nouvelles: [], placements: {}, ordreZ: [] },
    },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Les espions posés sur le singleton audio ne doivent pas survivre au test
  // suivant : `clearAllMocks` vide les appels, il ne rend pas l'original.
  vi.restoreAllMocks();
});

describe("BazarPage — settle déclenché à l'entrée sur l'écran", () => {
  it("appelle rafraichirPeriodiques au montage — pas d'attente du tick 60 s", () => {
    render(<BazarPage />);
    expect(rafraichirPeriodiques).toHaveBeenCalledTimes(1);
  });

  it("rend l'étal directement quand le settle a déjà eu lieu — pas de Skeleton bloqué", () => {
    render(<BazarPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Le Bazar" })).toBeTruthy();
  });
});

// Revue du 2026-08-20, constat I2 : la page appelait `MobileLayout` SANS
// `fillContent`, donc 12 px de papier encadraient l'illustration sur les côtés
// et en haut. Et sans conteneur `position: fixed`, la scène n'héritait pas de
// l'immunité au scroll résiduel qu'a le panorama du QG.
describe("BazarPage — le panorama est plein cadre", () => {
  it("le contenu n'a pas les 12 px de papier de MobileLayout", () => {
    const { container } = render(<BazarPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.padding).not.toContain("12px");
  });

  it("la scène est ancrée hors flux entre l'en-tête et la barre d'onglets", () => {
    const { container } = render(<BazarPage />);
    const cadre = container.querySelector("[data-bazar-cadre]") as HTMLElement;
    expect(cadre).toBeTruthy();
    expect(cadre.style.position).toBe("fixed");
    expect(cadre.style.top).toBe("calc(var(--safe-top) + var(--mobile-header-h))");
    expect(cadre.style.bottom).toBe("var(--mobile-tabbar-h)");
    expect(cadre.style.overflow).toBe("hidden");
  });
});

// Le canal du refus a changé le 2026-08-20 : il passait par un toast —
// transitoire, posé au-dessus de la fiche (z-index 200 contre 105) et parti
// tout seul au bout de quelques secondes. C'est la fiche de l'article qui
// porte désormais la raison, et elle RESTE OUVERTE : un refus est le moment
// où le joueur a besoin de rester pour lire pourquoi.
describe("BazarPage — le refus d'acheterAuBazar remonte jusqu'à la fiche", () => {
  // Depuis la recette du 2026-08-20, l'achat demande DEUX gestes : taper
  // l'article sur l'étagère ouvre sa fiche, et c'est le bouton de la fiche qui
  // achète.
  async function acheterLePremierLot() {
    await act(async () => {
      screen.getAllByRole("button", { name: /pièces/i })[0].click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /^Acheter pour/ }).click();
    });
  }

  it("achat refusé : la raison localisée est montrée au joueur, fiche ouverte", async () => {
    acheterAuBazar.mockReturnValue({ ok: false, raison: "Stockage plein" });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Stockage plein");
  });

  // Le refus qui n'est PAS le manque de jetons — un étal périmé, un article
  // déjà parti — passait autrefois par le toast, et c'est le cas qu'il fallait
  // vérifier avant de retirer celui-ci : `acheterAuBazar` localise les trois
  // raisons de la même façon (`raisonLocaliseeBazar`), la page les rend telles
  // quelles, et la fiche les affiche toutes.
  it("refus « article indisponible » : la fiche le dit aussi, pas seulement le manque", async () => {
    acheterAuBazar.mockReturnValue({ ok: false, raison: "Article indisponible" });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Article indisponible");
  });

  it("achat refusé : plus de toast — un seul canal, le durable", async () => {
    acheterAuBazar.mockReturnValue({ ok: false, raison: "Stockage plein" });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(toast).not.toHaveBeenCalled();
  });

  it("achat réussi : la fiche se referme, sans rien dire", async () => {
    acheterAuBazar.mockReturnValue({ ok: true });
    render(<BazarPage />);
    await acheterLePremierLot();
    expect(acheterAuBazar).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });
});

// Le carillon de la boutique sonne à l'ARRIVÉE, pas au tap qui a lancé la
// navigation : le QG joue déjà `playDoorClose` (la porte du bureau qu'on
// referme derrière soi) au moment du tap, et les deux sons s'enchaînent de
// part et d'autre de la fermeture d'iris.
describe("BazarPage — le carillon de la porte", () => {
  it("sonne à l'arrivée sur l'écran", () => {
    const carillon = vi.spyOn(audioManager, "playCarillon").mockResolvedValue();
    render(<BazarPage />);
    expect(carillon).toHaveBeenCalledTimes(1);
  });

  // En développement, StrictMode monte/démonte/remonte chaque composant : un
  // `useEffect(..., [])` nu ferait sonner la cloche DEUX fois, et c'est
  // audible. Le garde est un ref, qui survit au remontage simulé.
  it("ne sonne qu'une fois, même sous StrictMode", () => {
    const carillon = vi.spyOn(audioManager, "playCarillon").mockResolvedValue();
    render(
      <StrictMode>
        <BazarPage />
      </StrictMode>,
    );
    expect(carillon).toHaveBeenCalledTimes(1);
  });

  it("sonne aussi quand l'étal n'est pas encore composé (Skeleton)", () => {
    // L'effet est en tête de composant, avant le retour anticipé : le joueur
    // qui arrive une seconde avant le settle entend quand même la porte.
    mockState = { ...mockState, bazar: undefined } as Record<string, unknown>;
    const carillon = vi.spyOn(audioManager, "playCarillon").mockResolvedValue();
    render(<BazarPage />);
    expect(carillon).toHaveBeenCalledTimes(1);
  });
});

// On ne quitte pas le Bazar comme on change d'onglet : c'est un LIEU, et on en
// sort par la porte. Le même iris qu'entre l'écran-titre et le bureau, 30 %
// plus court, ferme la boutique avant de rendre la main au bureau — dont le
// layout (qg) rouvre l'iris de son côté, sur le flag posé ici.
describe("BazarPage — sortir par la porte", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  function pousserLaPorte() {
    act(() => {
      screen.getByRole("button", { name: "Sortir du Bazar" }).click();
    });
  }

  function choisir(sortie: string) {
    act(() => {
      screen.getByRole("button", { name: sortie }).click();
    });
  }

  /**
   * La porte ne ramène plus droit au bureau : elle propose les mêmes sorties
   * que celle du bureau, pour qu'on aille chiner ou étaler sans repasser par
   * chez soi. Le tap sur la porte n'est donc plus un départ — c'est un choix
   * qui s'ouvre, et rien ne doit bouger tant qu'il n'est pas fait.
   */
  it("la porte ouvre les trois sorties, et ne part nulle part", () => {
    render(<BazarPage />);
    pousserLaPorte();
    expect(screen.getByRole("button", { name: "Chiner" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Étaler" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Bureau" })).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect(lireFlagIris()).toBe(null);
  });

  it("la sortie Bureau ferme l'iris et ne navigue pas encore", () => {
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Bureau");
    expect(push).not.toHaveBeenCalled();
    expect(lireFlagIris()).toBe(null);
  });

  it("au noir : le flag court est posé, puis on revient au bureau", async () => {
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Bureau");
    await act(() =>
      vi.advanceTimersByTimeAsync(dureesIris("court").fermeture + 200),
    );
    expect(lireFlagIris()).toBe("court");
    expect(push).toHaveBeenCalledWith("/bureau");
  });

  /**
   * Chiner et étaler ne repassent PAS par l'iris. L'iris est le passage entre
   * le bureau et la boutique, dans un sens comme dans l'autre ; il n'a pas
   * d'ouverture de l'autre côté sur ces écrans-là, et l'y appeler laisserait
   * le joueur au noir.
   */
  it("la sortie Chiner part droit au chinage, sans iris", () => {
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Chiner");
    expect(push).toHaveBeenCalledWith("/chiner");
    expect(lireFlagIris()).toBe(null);
  });

  it("la sortie Étaler mène à la préparation quand aucune journée n'est ouverte", () => {
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Étaler");
    expect(push).toHaveBeenCalledWith("/vitrine/prep");
  });

  it("la sortie Étaler reprend la journée déjà commencée", () => {
    mockState!.vitrine = { brocanteId: "broc-42", objets: [] };
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Étaler");
    expect(push).toHaveBeenCalledWith("/vitrine/broc-42/journee");
  });

  /**
   * Les mêmes bruits de porte qu'au bureau : elle grince en s'ouvrant sur les
   * choix, et se referme derrière le joueur quand il en fait un. Le carillon
   * de la boutique, lui, ne sonne qu'à l'ARRIVÉE — c'est la cloche du
   * commerçant, pas le battant.
   */
  it("la porte grince quand on l'ouvre", () => {
    const ouvre = vi.spyOn(audioManager, "playDoorOpen").mockResolvedValue();
    render(<BazarPage />);
    pousserLaPorte();
    expect(ouvre).toHaveBeenCalledTimes(1);
  });

  it.each(["Chiner", "Étaler", "Bureau"])(
    "la sortie %s referme la porte derrière soi",
    (sortie) => {
      const ferme = vi.spyOn(audioManager, "playDoorClose").mockResolvedValue();
      render(<BazarPage />);
      pousserLaPorte();
      choisir(sortie);
      expect(ferme).toHaveBeenCalledTimes(1);
    },
  );

  /**
   * Renoncer, c'est aussi refermer la porte. Un joueur qui tape à côté pour
   * annuler doit entendre le battant retomber, sinon le geste ne dit rien
   * qu'un tap dans le vide. C'est ce que fait déjà la porte du bureau.
   */
  it("referme la porte quand on renonce sans choisir", () => {
    const ferme = vi.spyOn(audioManager, "playDoorClose").mockResolvedValue();
    render(<BazarPage />);
    pousserLaPorte();
    // Le voile posé derrière les boutons : c'est lui qu'on tape pour annuler.
    const voile = screen.getByRole("dialog").previousElementSibling as HTMLElement;
    act(() => voile.click());
    expect(ferme).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Chiner" })).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * La porte se referme MÊME quand la sortie est refusée faute d'énergie : le
   * geste a eu lieu, le battant a bougé, et c'est ce que fait déjà la porte du
   * bureau. Un silence ici se lirait comme un tap perdu.
   */
  it("referme la porte même quand l'énergie manque", () => {
    mockState!.energie = 0;
    const ferme = vi.spyOn(audioManager, "playDoorClose").mockResolvedValue();
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Chiner");
    expect(ferme).toHaveBeenCalledTimes(1);
  });

  /**
   * Sans énergie, la porte du bureau pope la machine à énergie plutôt que de
   * refuser en silence. Celle du Bazar doit faire pareil — sinon le joueur
   * tape un bouton qui ne fait rien.
   */
  it("sans énergie, Chiner pope la machine au lieu de partir", () => {
    mockState!.energie = 0;
    render(<BazarPage />);
    pousserLaPorte();
    choisir("Chiner");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText("Pas assez d'énergie pour cette sortie !")).not.toBeNull();
  });
});

// L'ambiance de rue du bureau se rejoue au Bazar, mais elle vient de la porte :
// pleine à la sortie (zone de droite), au tiers dans le coin arcade (zone de
// gauche). Le volume d'entrée n'est pas un détail — sans lui la boucle monte au
// niveau du bureau avant de retomber, et ça s'entend à l'ouverture de l'écran.
describe("BazarPage — l'ambiance de rue", () => {
  it("démarre au montage, au volume de la zone ouverte", () => {
    const start = vi.spyOn(audioManager, "startAmbience").mockResolvedValue();
    render(<BazarPage />);
    // 2 = les antiquités, côté porte : la zone d'arrivée au Bazar.
    expect(start).toHaveBeenCalledWith(volumeAmbianceBazarForPos(2));
  });

  it("s'arrête quand on quitte l'écran", () => {
    vi.spyOn(audioManager, "startAmbience").mockResolvedValue();
    const stop = vi.spyOn(audioManager, "stopAmbience").mockImplementation(() => {});
    const { unmount } = render(<BazarPage />);
    expect(stop).not.toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});

// Tâche 12 : la cérémonie d'ouverture d'un paquet de 3 pièces, câblée à la
// page. `acheterAuBazar` a déjà rangé les pièces dans la save au moment où
// il répond `{ ok, pieces }` — cet écran ne fait qu'annoncer ce qui a déjà
// eu lieu.
describe("BazarPage — la cérémonie d'ouverture d'un paquet", () => {
  function acheterLaPochetteDeCartes() {
    act(() => {
      screen.getByRole("button", { name: "Paquet de 3 cartes" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: /^Acheter pour/ }).click();
    });
  }

  /** Réduction de mouvement : le paquet Brocomon arrive déjà ouvert, ses
   *  3 cartes retournées et les boutons Voir/Ranger présents d'emblée. */
  function avecMouvementReduit(fn: () => void) {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as unknown as typeof window.matchMedia;
    try {
      fn();
    } finally {
      window.matchMedia = original;
    }
  }

  it("un achat de paquet de CARTES affiche le paquet Brocomon scellé, à déchirer", () => {
    acheterAuBazar.mockReturnValue({
      ok: true,
      pieces: ["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.boite_de_construction_metallique_no_3"],
    });
    render(<BazarPage />);
    acheterLaPochetteDeCartes();
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs.some((el) => el.getAttribute("aria-label") === "Ouverture")).toBe(true);
    expect(screen.getByTestId("paquet-scelle")).toBeTruthy();
    expect(screen.queryAllByTestId("carte-paquet")).toHaveLength(0);
  });

  it("un achat de pochette de TIMBRES affiche l'enveloppe fermée, à ouvrir", () => {
    (mockState as { albums: { timbres: { achete: boolean } } }).albums.timbres.achete = true;
    acheterAuBazar.mockReturnValue({
      ok: true,
      pieces: ["timbre.renard_roux", "timbre.renard_roux", "timbre.renard_roux"],
    });
    render(<BazarPage />);
    act(() => {
      screen.getByRole("button", { name: "Pochette de 3 timbres" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: /^Acheter pour/ }).click();
    });
    expect(screen.queryByTestId("paquet-scelle")).toBeNull();
    expect(screen.getByTestId("pochette").dataset.phase).toBe("fermee");
    expect(screen.queryAllByTestId("timbre-paquet")).toHaveLength(0);
  });

  it("un achat de lot de pièces (pas un paquet) n'ouvre PAS la cérémonie", async () => {
    acheterAuBazar.mockReturnValue({ ok: true });
    render(<BazarPage />);
    await act(async () => {
      screen.getAllByRole("button", { name: /pièces/i })[0].click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /^Acheter pour/ }).click();
    });
    expect(
      screen.queryAllByRole("dialog").some((el) => el.getAttribute("aria-label") === "Ouverture"),
    ).toBe(false);
  });

  it("« Ranger » fait s'envoler les cartes puis referme la cérémonie", () => {
    vi.useFakeTimers();
    acheterAuBazar.mockReturnValue({
      ok: true,
      pieces: ["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.boite_de_construction_metallique_no_3"],
    });
    avecMouvementReduit(() => {
      render(<BazarPage />);
      acheterLaPochetteDeCartes();
    });
    act(() => {
      screen.getByRole("button", { name: "Ranger" }).click();
    });
    // Les 3 vols vers la Collection s'enchaînent avant que le voile tombe.
    const ouverte = () =>
      screen.queryAllByRole("dialog").some((el) => el.getAttribute("aria-label") === "Ouverture");
    expect(ouverte()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(2 * ECART_ENVOL_MS + DUREE_ENVOL_MS + 50);
    });
    expect(ouverte()).toBe(false);
    vi.useRealTimers();
  });

  it("ni le paquet de cartes ni la pochette de timbres n'ont de bouton Voir", () => {
    acheterAuBazar.mockReturnValue({
      ok: true,
      pieces: ["carte.marteau_menuisier", "carte.marteau_menuisier", "carte.boite_de_construction_metallique_no_3"],
    });
    avecMouvementReduit(() => {
      render(<BazarPage />);
      acheterLaPochetteDeCartes();
    });
    expect(screen.queryByRole("button", { name: "Voir" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
    cleanup();
    (mockState as { albums: { timbres: { achete: boolean } } }).albums.timbres.achete = true;
    acheterAuBazar.mockReturnValue({
      ok: true,
      pieces: ["timbre.renard_roux", "timbre.renard_roux", "timbre.renard_roux"],
    });
    avecMouvementReduit(() => {
      render(<BazarPage />);
      act(() => {
        screen.getByRole("button", { name: "Pochette de 3 timbres" }).click();
      });
      act(() => {
        screen.getByRole("button", { name: /^Acheter pour/ }).click();
      });
    });
    expect(screen.queryByRole("button", { name: "Voir" })).toBeNull();
    expect(screen.getByRole("button", { name: "Ranger" })).toBeTruthy();
  });
});
