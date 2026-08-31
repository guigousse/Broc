// @vitest-environment jsdom
/**
 * Revue finale (I1) : `acheterAuBazar` calculait son résultat une seule fois
 * sur `stateRef.current` (hors de l'updater) puis l'appliquait tel quel via
 * `setState((prev) => (prev ? r.state : prev))` — `prev` n'était lu que pour
 * savoir si une partie existait, JAMAIS pour re-vérifier solde/disponibilité
 * ni pour servir de base à la fusion. Deux achats synchrones (même clic
 * double, même course avec le settle d'énergie/quêtes/Bazar qui tourne
 * toutes les 60 s dans ce contexte) faisaient donc perdre le premier : le
 * second `setState` réécrivait un instantané entier calculé AVANT le
 * premier achat, l'effaçant.
 *
 * Le correctif reprend le patron `acheterObjet` (juste au-dessus dans
 * GameContext.tsx) : pré-check informatif sur `stateRef.current`, mais
 * l'écriture réelle rejoue `acheterLotPieces`/`acheterVitrine` DANS
 * l'updater, sur `prev` — la seule source de vérité au moment où React
 * applique la mise à jour.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { cleSlot } from "@/lib/storage/slots";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";
import { initAlbums } from "@/lib/albums";
import { fr } from "@/lib/i18n/ui/fr";
import { en } from "@/lib/i18n/ui/en";
import { es } from "@/lib/i18n/ui/es";
import { el } from "@/lib/i18n/ui/el";
import type { GameState } from "@/types/game";

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

/**
 * Save au jour d'ouverture du Bazar. Le Bazar lui-même se compose tout seul
 * à l'hydratation (le `sync()` du GameContext appelle déjà
 * `rafraichirPeriodiques` au montage) : pas besoin de le pré-fabriquer ici.
 *
 * `patch` permute la save juste avant remontage — jetons, albums déjà
 * achetés, etc. — sans dupliquer toute la mécanique de montage/démontage.
 */
async function setupPartie(patch: (save: GameState) => void = () => {}) {
  const { result, unmount } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(
    () => expect(window.localStorage.getItem(cleSlot(1))).not.toBeNull(),
    { timeout: 3000 },
  );
  const save = JSON.parse(window.localStorage.getItem(cleSlot(1))!) as GameState;
  save.jourActuel = JOUR_OUVERTURE_BAZAR;
  patch(save);
  window.localStorage.setItem(cleSlot(1), JSON.stringify(save));
  unmount();

  const remonte = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(remonte.result.current.state).not.toBeNull());
  await waitFor(() => expect(remonte.result.current.state!.bazar).toBeDefined());
  return remonte.result;
}

/** 2 jetons — de quoi payer DEUX lots de pièces (1 jeton chacun, cf. `etal.ts`). */
function setupPartieAvecJetons() {
  return setupPartie((save) => {
    save.jetons = 2;
  });
}

/** Save avec l'album `albumId` déjà acheté et `jetons` en poche — pour tester les paquets. */
function setupPartieAvecAlbumAchete(albumId: "classeur" | "timbres", jetons: number) {
  return setupPartie((save) => {
    save.jetons = jetons;
    const albums = initAlbums();
    save.albums = { ...albums, [albumId]: { ...albums[albumId], achete: true } };
  });
}

describe("GameContext.acheterAuBazar — atomicité (I1)", () => {
  it("deux achats synchrones du même lot débitent et livrent DEUX fois, pas une", async () => {
    const result = await setupPartieAvecJetons();
    const cat = result.current.state!.bazar!.lotsPieces[0].categorie;
    const piecesAvant = result.current.state!.piecesAmelioration[cat];

    // Synchrones, dans le MÊME batch : c'est exactement la course que
    // `stateRef.current` (lu une fois, hors updater) ne pouvait pas voir.
    act(() => {
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });

    expect(result.current.state!.jetons).toBe(0);
    expect(result.current.state!.piecesAmelioration[cat]).toBe(piecesAvant + 10);
  });

  it("refuse le second achat sans rien perdre du premier quand les jetons ne couvrent qu'un seul lot", async () => {
    const result = await setupPartieAvecJetons();
    const cat = result.current.state!.bazar!.lotsPieces[0].categorie;
    const piecesAvant = result.current.state!.piecesAmelioration[cat];
    // Dépense un premier jeton (solde initial 2) pour ne laisser que le
    // strict nécessaire à UN SEUL des deux achats synchrones qui suivent.
    // NB_LOTS_PIECES = 1 depuis 2026-08-30 : un seul lot en vente, donc les
    // trois achats de ce test portent tous sur `index: 0`.
    act(() => {
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });
    expect(result.current.state!.jetons).toBe(1);

    act(() => {
      // Deux achats du même lot (1 jeton chacun) alors qu'il n'en reste
      // qu'un : le premier doit passer, le second doit être refusé — et
      // SURTOUT ne pas effacer l'effet des deux premiers.
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
      result.current.acheterAuBazar({ type: "pieces", index: 0 });
    });

    expect(result.current.state!.jetons).toBe(0);
    expect(result.current.state!.piecesAmelioration[cat]).toBe(piecesAvant + 10);
  });

  it("un paquet renvoie ses 3 ids et les range dans l'album, en débitant 5 Ƶ", async () => {
    const result = await setupPartieAvecAlbumAchete("classeur", 5);

    let retour: { ok: boolean; raison?: string; pieces?: string[] } | undefined;
    act(() => {
      retour = result.current.acheterAuBazar({ type: "paquet", album: "classeur" });
    });

    expect(retour!.ok).toBe(true);
    expect(retour!.pieces).toHaveLength(3);

    await waitFor(() => expect(result.current.state!.jetons).toBe(0));
    const pieces = result.current.state!.albums!.classeur.pieces;
    // Les ids retournés sont exactement ceux rangés dans l'album, et leur
    // total de quantités vaut 3 (des doublons possibles réduisent le nombre
    // de clés distinctes, jamais la somme).
    expect(Object.keys(pieces).sort()).toEqual([...new Set(retour!.pieces)].sort());
    expect(Object.values(pieces).reduce((s, q) => s + q, 0)).toBe(3);
  });

  it("deux achats de paquet synchrones débitent et livrent DEUX fois, pas une (I1)", async () => {
    const result = await setupPartieAvecAlbumAchete("classeur", 10);

    // Même course que les lots de pièces plus haut : deux achats dans le
    // MÊME batch, exactement ce que `stateRef.current` lu une seule fois ne
    // pouvait pas voir.
    act(() => {
      result.current.acheterAuBazar({ type: "paquet", album: "classeur" });
      result.current.acheterAuBazar({ type: "paquet", album: "classeur" });
    });

    await waitFor(() => expect(result.current.state!.jetons).toBe(0));
    const pieces = result.current.state!.albums!.classeur.pieces;
    expect(Object.values(pieces).reduce((s, q) => s + q, 0)).toBe(6);
  });

  it("acheter un album le marque acheté, et refuse un second achat avec une raison localisée", async () => {
    const result = await setupPartieAvecAlbumAchete("classeur", 30);
    expect(result.current.state!.albums!.timbres.achete).toBe(false);

    let premier: { ok: boolean; raison?: string } | undefined;
    act(() => {
      premier = result.current.acheterAuBazar({ type: "album", album: "timbres" });
    });
    expect(premier!.ok).toBe(true);
    await waitFor(() => expect(result.current.state!.albums!.timbres.achete).toBe(true));
    await waitFor(() => expect(result.current.state!.jetons).toBe(20));

    let second: { ok: boolean; raison?: string } | undefined;
    act(() => {
      second = result.current.acheterAuBazar({ type: "album", album: "timbres" });
    });
    expect(second!.ok).toBe(false);
    // Localisée : jamais la clé brute "indisponible", ni "jetons"/"stockagePlein"
    // — la locale par défaut de l'environnement de test n'est pas garantie
    // (ici "en"), donc on compare aux 4 traductions plutôt qu'à un texte figé.
    expect(second!.raison).toBeTruthy();
    expect(["indisponible", "jetons", "stockagePlein"]).not.toContain(second!.raison);
    expect([
      fr.raisons.bazarAlbumDejaAchete,
      en.raisons.bazarAlbumDejaAchete,
      es.raisons.bazarAlbumDejaAchete,
      el.raisons.bazarAlbumDejaAchete,
    ]).toContain(second!.raison);
  });
});
