// @vitest-environment jsdom
/**
 * `LevelUpOverlay` — écran de level-up global (plan 4/4, Task 4).
 * Pur lecteur de `useGame()` + 1 action (`marquerNiveauVu`) : on mocke le
 * contexte, `next/navigation` et `audioManager` (pas besoin du vrai provider).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LevelUpOverlay } from "./LevelUpOverlay";
import { setCoachOuvert } from "@/lib/coachActif";
import { setDialogueActif } from "@/lib/dialogueActif";

afterEach(() => {
  cleanup();
  // Modules à état partagé : jamais de fuite d'un test à l'autre.
  setCoachOuvert(false);
  setDialogueActif(false);
});

let mockState: Record<string, unknown> | null = null;
const marquerNiveauVu = vi.fn();
const avancerTutoriel = vi.fn();
let mockPathname = "/bureau";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({ state: mockState, marquerNiveauVu }),
  useGameActions: () => ({ avancerTutoriel }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const playLevelUp = vi.fn();
const playExplosion = vi.fn();
const preload = vi.fn();
vi.mock("@/lib/audio/audioManager", () => ({
  audioManager: {
    playLevelUp: (...args: unknown[]) => playLevelUp(...args),
    playExplosion: (...args: unknown[]) => playExplosion(...args),
    preload: (...args: unknown[]) => preload(...args),
  },
  SON_EXPLOSION: "/sounds/explosion.mp3",
  PIC_EXPLOSION_S: 0.035,
}));

// Plafond fictif simple (10) pour isoler le test de la vraie valeur (96) ;
// on garde le reste du module réel (deblocagesNiveau.ts en dépend).
vi.mock("@/data/competences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/competences")>();
  return {
    ...actual,
    COUT_TOTAL_COMPETENCES: 10,
    pointsDepensesCompetences: (ids: readonly string[]) => ids.length,
  };
});

// tutorielEtape "termine" par défaut : la plupart des tests célèbrent un
// niveau hors tutoriel — sinon `tutorielActif(state)` bloquerait affichable.
function etat(
  niveauVu: number,
  niveau: number,
  pointsDisponibles = 0,
  competencesDebloquees: string[] = [],
  tutorielEtape = "termine",
) {
  return {
    niveauVu,
    brocanteur: { niveau, xp: 0, pointsDisponibles },
    competencesDebloquees,
    tutorielEtape,
  };
}

describe("LevelUpOverlay", () => {
  it("rien à célébrer : ne rend rien", () => {
    mockState = etat(2, 2);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("niveau en attente : titre « Niveau 1 », déblocages du niveau, preview du prochain", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 1")).toBeTruthy();
    // deblocagesPourNiveau(1) = "Ouverture de l'écran Compétences (+1 point)" (famille jalon)
    expect(screen.getByText(/Ouverture de l'écran Compétences/)).toBeTruthy();
    // prochainDeblocage(1) = niveau 2, "L'Atelier vous tend les bras"
    expect(
      screen.getByText(/Niv\. 3 · Quêtes quotidiennes et hebdomadaires/),
    ).toBeTruthy();
  });

  it("deux sections intitulées, Récompenses avant À venir", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    const recompenses = screen.getByText("Récompenses");
    const aVenir = screen.getByText("À venir");
    // Ordre dans le document : les récompenses du niveau, puis le palier suivant.
    expect(
      recompenses.compareDocumentPosition(aVenir) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Chaque intertitre ouvre sa propre ligne de la cascade.
    const lignes = Array.from(
      container.querySelectorAll(".broc-levelup-ligne"),
    ) as HTMLElement[];
    expect(lignes[0].textContent).toContain("Récompenses");
    expect(lignes.some((l) => l.textContent?.includes("À venir"))).toBe(true);
  });

  it("dernier palier franchi : pas de section « À venir » orpheline", () => {
    // Niveau très haut : prochainDeblocage() ne renvoie plus rien.
    mockState = etat(998, 999);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.queryByText("À venir")).toBeNull();
    expect(screen.getByText("Récompenses")).toBeTruthy();
  });

  it("plafond atteint et niveau sans déblocage : pas de section « Récompenses » vide", () => {
    // 6 dispo + 4 dépensés = 10 = plafond mocké ; le niveau 2 n'a pas de
    // déblocage propre → il ne reste que le palier suivant.
    mockState = etat(1, 2, 6, ["a", "b", "c", "d"]);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.queryByText("Récompenses")).toBeNull();
    expect(screen.getByText("À venir")).toBeTruthy();
  });

  it("Continuer appelle marquerNiveauVu et joue le son une fois par niveau", () => {
    vi.useFakeTimers();
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playLevelUp.mockClear();
    marquerNiveauVu.mockClear();
    render(<LevelUpOverlay />);
    vi.advanceTimersByTime(450);
    expect(playLevelUp).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(marquerNiveauVu).toHaveBeenCalledTimes(1);
  });

  it("retenu pendant une session : pathname /chiner/xxx → null même avec un niveau en attente", () => {
    mockState = etat(0, 1);
    mockPathname = "/chiner/xxx";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("écran titre : pathname / → null et pas de son, même avec un niveau en attente", () => {
    mockState = etat(0, 1);
    mockPathname = "/";
    playLevelUp.mockClear();
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
    expect(playLevelUp).not.toHaveBeenCalled();
  });

  it("pages légales hors partie : pathname /mentions-legales → null", () => {
    mockState = etat(0, 1);
    mockPathname = "/mentions-legales";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("tutoriel en cours : niveau en attente mais tutorielActif → null (la célébration attend)", () => {
    mockState = etat(0, 1, 0, [], "vente-directe");
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("reste masqué pendant le tutoriel hors de l'étape de célébration", () => {
    mockState = etat(0, 1, 1, [], "vente-nego");
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("s'affiche à l'étape niveau-celebration", () => {
    mockState = etat(0, 1, 1, [], "niveau-celebration");
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 1")).toBeTruthy();
  });

  it("reste masqué à niveau-celebration si un dialogue est ouvert", () => {
    setDialogueActif(true);
    mockState = etat(0, 1, 1, [], "niveau-celebration");
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
    setDialogueActif(false);
  });

  it("à niveau-celebration, la fermeture marque le niveau vu ET avance vers competences-visite", () => {
    mockState = etat(0, 1, 1, [], "niveau-celebration");
    mockPathname = "/bureau";
    marquerNiveauVu.mockClear();
    avancerTutoriel.mockClear();
    render(<LevelUpOverlay />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(marquerNiveauVu).toHaveBeenCalledTimes(1);
    expect(avancerTutoriel).toHaveBeenCalledWith("competences-visite");
  });

  it("dialogue actif (DialogueOverlay, ex. tuto_conclusion) : niveau en attente mais → null", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    setDialogueActif(true);
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("coach ouvert (TutorielCoach) : niveau en attente mais → null", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    setCoachOuvert(true);
    const { container } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("niveau non perdu : conservé tant que l'écran n'est pas libre, célébré une fois le dialogue terminé", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    setDialogueActif(true);
    const { container, rerender } = render(<LevelUpOverlay />);
    expect(container.firstChild).toBeNull();
    setDialogueActif(false);
    rerender(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 1")).toBeTruthy();
  });

  it("multi-niveaux : célèbre niveauVu+1, pas le niveau final", () => {
    mockState = etat(3, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText("Niveau 4")).toBeTruthy();
    expect(screen.queryByText("Niveau 5")).toBeNull();
  });

  it("sous le plafond de compétences : « +1 point » affiché", () => {
    // Plafond mocké à 10 ; 3 dispo + 4 dépensés = 7 < 10.
    mockState = etat(0, 1, 3, ["a", "b", "c", "d"]);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText(/point de compétence/)).toBeTruthy();
  });

  it("plafond de compétences atteint : « +1 point » masqué", () => {
    // Plafond mocké à 10 ; 6 dispo + 4 dépensés = 10 >= 10.
    mockState = etat(0, 1, 6, ["a", "b", "c", "d"]);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.queryByText(/point de compétence/)).toBeNull();
  });

  it("atout débloqué (N5, Le Flair) : bloc grand format avec médaillon et description", () => {
    mockState = etat(4, 5);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    // Titre sans l'emoji inline (remplacé par le médaillon).
    expect(screen.getByText("Atout Le Flair")).toBeTruthy();
    expect(screen.getByText(/révèle la cote de l'objet affiché/)).toBeTruthy();
    const bloc = screen.getByText("Atout Le Flair").closest("[data-testid='levelup-atout']");
    expect(bloc).toBeTruthy();
    const img = bloc!.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    // Jamais grisé dans la célébration.
    expect(img!.style.filter).toBe("none");
    expect(bloc!.textContent).not.toContain("🔍");
    // Déblocage initial : pas de badge +1.
    expect(within(bloc as HTMLElement).queryByText("+1")).toBeNull();
  });

  it("palier 2ᵉ usage (N35, Le Flair) : médaillon avec badge +1", () => {
    mockState = etat(34, 35);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const bloc = screen.getByTestId("levelup-atout");
    expect(bloc.querySelector("img")?.getAttribute("src")).toBe("/competences/atout.flair.webp");
    expect(bloc.textContent).toContain("+1");
  });

  it("niveau sans atout (N1) : ligne simple, pas de bloc atout ni pill de famille", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.getByText(/Ouverture de l'écran Compétences/)).toBeTruthy();
    expect(screen.queryByTestId("levelup-atout")).toBeNull();
    // La pill de famille a disparu.
    expect(screen.queryByText("Jalon")).toBeNull();
  });

  it("titre au-dessus, bouton en dessous : l'encadré ne porte que l'information", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    const titre = screen.getByText("Niveau 1");
    const bouton = screen.getByRole("button", { name: "Continuer" });
    expect(titre.closest(".broc-levelup-carte")).toBeNull();
    expect(bouton.closest(".broc-levelup-carte")).toBeNull();
    const carte = container.querySelector(".broc-levelup-carte");
    expect(carte).toBeTruthy();
    expect(carte!.querySelector("button")).toBeNull();
    expect(carte!.textContent).not.toContain("Niveau 1");
    // Ordre à l'écran : chiffre, encadré, bouton.
    expect(
      carte!.compareDocumentPosition(bouton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("chaque mention porte une puce, et le bouton n'en porte pas", () => {
    mockState = etat(4, 5);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    const carte = container.querySelector(".broc-levelup-carte")!;
    // 3 mentions : +1 point, l'atout Le Flair, le palier à venir.
    // (width: 9px cible le point de puce, distinct du médaillon 44 px qui
    // partage lui aussi aria-hidden + border-radius: 50%.)
    const puces = carte.querySelectorAll("[aria-hidden='true'][style*='width: 9px']");
    expect(puces.length).toBe(3);
    expect(
      screen
        .getByRole("button", { name: "Continuer" })
        .querySelector("[aria-hidden='true']"),
    ).toBeNull();
  });

  it("plus de cachet de cire ni d'eyebrow « Certificat de brocanteur »", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    expect(screen.queryByTestId("levelup-cachet")).toBeNull();
    expect(screen.queryByText(/Certificat de brocanteur/)).toBeNull();
  });

  it("feu d'artifice : couche présente, décorative et non cliquable", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const couche = screen.getByTestId("levelup-confettis");
    expect(couche.getAttribute("aria-hidden")).toBe("true");
    expect(couche.style.pointerEvents).toBe("none");
    expect(couche.querySelectorAll(".broc-levelup-etincelle").length).toBe(50);
  });

  it("plusieurs bouquets décalés, tirés depuis des points distincts", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const etincelles = Array.from(
      screen.getByTestId("levelup-confettis").querySelectorAll("span"),
    ) as HTMLElement[];
    // Chaque bouquet a son propre point de tir (left/top) et son propre retard.
    const retards = new Set(etincelles.map((s) => s.style.animationDelay));
    expect(retards.size).toBeGreaterThan(3);
    const premier = parseFloat(etincelles[0].style.animationDelay);
    const dernier = parseFloat(
      etincelles[etincelles.length - 1].style.animationDelay,
    );
    expect(dernier).toBeGreaterThan(premier + 0.5);
    // Le premier bouquet part du centre exact du chiffre, les autres autour.
    const centres = new Set(
      etincelles.map((s) => `${Math.round(parseFloat(s.style.left) / 10)}`),
    );
    expect(centres.size).toBeGreaterThan(1);
  });

  it("étincelles orientées sur leur rayon, pas en rotation libre", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    render(<LevelUpOverlay />);
    const etincelles = Array.from(
      screen.getByTestId("levelup-confettis").querySelectorAll("span"),
    ) as HTMLElement[];
    for (const s of etincelles.slice(0, 16)) {
      const cx = parseFloat(s.style.getPropertyValue("--cx"));
      const cy = parseFloat(s.style.getPropertyValue("--cy"));
      const cr = parseFloat(s.style.getPropertyValue("--cr"));
      // L'orientation vaut l'angle du vecteur + 90° (le rectangle est vertical
      // au repos). La retombée gravitaire décale cy, d'où la tolérance large.
      const attendu = (Math.atan2(cy, cx) * 180) / Math.PI + 90;
      const ecart = Math.abs(((cr - attendu + 540) % 360) - 180);
      expect(ecart).toBeLessThan(35);
    }
  });

  it("le cadre n'arrive qu'une fois la dernière étincelle éteinte", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    const { container } = render(<LevelUpOverlay />);
    const dernierTir = Math.max(
      ...Array.from(
        screen.getByTestId("levelup-confettis").querySelectorAll("span"),
      ).map((s) => parseFloat((s as HTMLElement).style.animationDelay)),
    );
    // Durée de vol : `broc-levelup-etincelle` dure 1100 ms dans globals.css
    // (jsdom ne lit pas la feuille de style, d'où la constante en dur ici).
    const finDuFeu = dernierTir + 1.1;
    const carte = container.querySelector(".broc-levelup-carte") as HTMLElement;
    expect(parseFloat(carte.style.animationDelay)).toBeGreaterThanOrEqual(
      finDuFeu,
    );
  });

  it("feu déterministe : deux rendus produisent les mêmes vecteurs", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    const vecteurs = () =>
      Array.from(
        screen.getByTestId("levelup-confettis").querySelectorAll("span"),
      ).map((s) => (s as HTMLElement).style.getPropertyValue("--cx"));
    const { unmount } = render(<LevelUpOverlay />);
    const premier = vecteurs();
    unmount();
    render(<LevelUpOverlay />);
    expect(vecteurs()).toEqual(premier);
    expect(premier.every((v) => v !== "")).toBe(true);
  });

  it("le son est différé jusqu'au temps fort du chiffre", () => {
    vi.useFakeTimers();
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playLevelUp.mockClear();
    render(<LevelUpOverlay />);
    expect(playLevelUp).not.toHaveBeenCalled();
    vi.advanceTimersByTime(450);
    expect(playLevelUp).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("démontage avant le temps fort : ni fanfare ni détonation", () => {
    vi.useFakeTimers();
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playLevelUp.mockClear();
    playExplosion.mockClear();
    const { unmount } = render(<LevelUpOverlay />);
    unmount();
    vi.advanceTimersByTime(3000);
    expect(playLevelUp).not.toHaveBeenCalled();
    expect(playExplosion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("une détonation par bouquet, en avance du pic, décroissante et détimbrée", () => {
    vi.useFakeTimers();
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playExplosion.mockClear();
    const { container } = render(<LevelUpOverlay />);
    expect(playExplosion).not.toHaveBeenCalled();
    // Premier bouquet à 0,55 s, MAIS le bang est à 35 ms dans le fichier :
    // la lecture part à 515 ms pour que la détonation tombe sur l'éclat.
    vi.advanceTimersByTime(514);
    expect(playExplosion).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(playExplosion).toHaveBeenCalledTimes(1);
    // Les trois suivants sont tirés avant la fin du feu.
    vi.advanceTimersByTime(1000);
    const forces = playExplosion.mock.calls.map((c) => c[0] as number);
    const vitesses = playExplosion.mock.calls.map((c) => c[1] as number);
    expect(forces.length).toBe(4);
    // Chaque bouquet secondaire détone moins fort que le précédent.
    expect(forces).toEqual([...forces].sort((a, b) => b - a));
    expect(forces[0]).toBe(1);
    // Et à une hauteur différente : quatre fois le même échantillon à
    // l'identique s'entendrait comme un bug.
    expect(new Set(vitesses).size).toBe(4);
    // Autant de détonations que de bouquets réellement dessinés.
    const points = new Set(
      Array.from(
        container.querySelectorAll(".broc-levelup-etincelle"),
      ).map((s) => (s as HTMLElement).style.left + (s as HTMLElement).style.top),
    );
    expect(points.size).toBeGreaterThanOrEqual(forces.length);
    vi.useRealTimers();
  });

  it("l'échantillon est préchargé avant la première détonation", () => {
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    preload.mockClear();
    render(<LevelUpOverlay />);
    expect(preload).toHaveBeenCalledWith(["/sounds/explosion.mp3"]);
  });

  it("mouvement réduit : la fanfare part, mais aucune détonation", () => {
    vi.useFakeTimers();
    const matchMedia = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes("reduced-motion"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    mockState = etat(0, 1);
    mockPathname = "/bureau";
    playLevelUp.mockClear();
    playExplosion.mockClear();
    render(<LevelUpOverlay />);
    vi.advanceTimersByTime(3000);
    expect(playLevelUp).toHaveBeenCalledTimes(1);
    expect(playExplosion).not.toHaveBeenCalled();
    window.matchMedia = matchMedia;
    vi.useRealTimers();
  });
});
