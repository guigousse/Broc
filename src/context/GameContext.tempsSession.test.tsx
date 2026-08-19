// @vitest-environment jsdom
/**
 * Fix « deux horloges » (revue de branche feat/quetes-periodiques-variees) :
 * `timestampAcceptation` des missions périodiques est posé depuis l'horloge
 * de confiance (`tempsConfiance()`, réseau — cf. `rafraichirPeriodiques`), tandis
 * que les sessions de chine/vente étaient horodatées `Date.now()` (horloge de
 * l'appareil). Un appareil en retard (pile HS, réglage manuel…) rendait alors
 * `session.timestamp < timestampAcceptation` en permanence : les objectifs
 * périodiques cumulatifs (`ventesCumulees`, `objetsRares`, `beneficeCumule`,
 * `ventesCategorie`) restaient bloqués à 0 toute la période.
 *
 * `ClientPage.tsx` (chiner ET vitrine/journee) horodatent maintenant avec
 * `tempsConfiance() ?? Date.now()`, exactement comme `restaurations` (cf.
 * `appliquerRecuperation` dans lib/atelier.ts, jamais touché par ce bug).
 *
 * Portée : rendre les deux pages de route (chine/vitrine) dans ce test
 * demanderait de simuler une brocante complète, un client scripté, des
 * timers de journée, etc. — trop de surface pour un test de régression ciblé.
 * On reproduit ici le SEUL geste qui compte pour ce bug, à l'identique de ce
 * que fait chaque ClientPage : lire `tempsConfiance()` depuis le contexte,
 * l'utiliser pour horodater la session via `enregistrerSession`, et vérifier
 * que `progressionObjectif` (le consommateur, `lib/quetes/objectifs.ts`)
 * compte bien la session. Un second bloc simule EXPLICITEMENT l'ancien code
 * (`Date.now()`) pour prouver que le test échoue sans le correctif.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { GameProvider, useGame } from "./GameContext";
import { progressionObjectif } from "@/lib/quetes/objectifs";
import type { MissionResolution, SessionVente } from "@/types/game";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Simule un appareil en retard : le temps de confiance renvoyé par le réseau
// est posé 20 min DEVANT l'horloge murale (Date.now()) au moment de la sync.
const AVANCE_MS = 20 * 60 * 1000;
vi.mock("@/lib/temps/timeSource", () => ({
  getTimeSource: () => ({ maintenant: async () => Date.now() + AVANCE_MS }),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}

async function setupPartieAncreeEnAvance() {
  const { result } = renderHook(() => useGame(), { wrapper });
  await waitFor(() => expect(result.current.isHydrated).toBe(true));
  act(() => {
    result.current.nouvellePartie();
  });
  await waitFor(() => expect(result.current.state).not.toBeNull());
  // Laisse la sync réseau (effet de montage) reposer l'ancre sur le temps
  // avancé simulé ci-dessus.
  await waitFor(() =>
    expect(result.current.tempsConfiance()).toBeGreaterThan(Date.now()),
  );
  return result;
}

function sessionVenteDe(timestamp: number): SessionVente {
  return {
    id: "s1",
    type: "vente",
    jour: 0,
    timestamp,
    niveauCamion: 1,
    loyer: 0,
    ventes: [
      {
        templateId: "tpl.x",
        nom: "Objet test",
        categorie: "Maison",
        etat: "Bon",
        prixReferenceReel: 100,
        prixVente: 100,
        prixAchat: 50,
      },
    ],
    invendus: 0,
    xpGagne: {},
    xpBrocanteur: 0,
  };
}

describe("GameContext — horodatage des sessions vs horloge de confiance (régression)", () => {
  it("une vente enregistrée avec l'horloge de confiance compte pour une quête acceptée juste avant, même si l'horloge de l'appareil retarde", async () => {
    const result = await setupPartieAncreeEnAvance();

    // Quête périodique acceptée « maintenant » (temps de confiance), comme
    // `settleQuetesPeriodiques` le fait via `rafraichirPeriodiques`.
    const now = result.current.tempsConfiance()!;
    const reso: MissionResolution = {
      courrierId: "heb_test_0",
      statut: "active",
      timestampAcceptation: now,
    };

    // Un vrai chinage/vente prend plusieurs minutes ; la comparaison est
    // stricte (`>`), donc on laisse une poignée de ms réelles s'écouler
    // avant d'horodater la session pour ne pas dépendre d'une résolution
    // d'horloge inframillimétrique.
    await new Promise((r) => setTimeout(r, 10));

    // Ce que fait désormais chaque ClientPage : `tempsConfiance() ?? Date.now()`.
    act(() => {
      result.current.enregistrerSession(
        sessionVenteDe(result.current.tempsConfiance() ?? Date.now()),
      );
    });
    await waitFor(() => expect(result.current.state!.historique).toHaveLength(1));

    const prog = progressionObjectif(
      { type: "ventesCumulees", montant: 50 },
      result.current.state!,
      reso,
      0,
    );
    expect(prog.actuel).toBe(100);
    expect(prog.atteint).toBe(true);
  });

  it("(preuve par mutation) la même session horodatée par l'ancien code Date.now() ne compte PAS quand l'appareil retarde", async () => {
    const result = await setupPartieAncreeEnAvance();

    const now = result.current.tempsConfiance()!;
    const reso: MissionResolution = {
      courrierId: "heb_test_0",
      statut: "active",
      timestampAcceptation: now,
    };

    await new Promise((r) => setTimeout(r, 10));

    // Reproduit fidèlement l'ANCIEN bug : `timestamp: Date.now()` au lieu de
    // `tempsConfiance()`. Avec l'appareil en retard de AVANCE_MS sur le
    // réseau, ce timestamp tombe AVANT `timestampAcceptation`.
    act(() => {
      result.current.enregistrerSession(sessionVenteDe(Date.now()));
    });
    await waitFor(() => expect(result.current.state!.historique).toHaveLength(1));

    const prog = progressionObjectif(
      { type: "ventesCumulees", montant: 50 },
      result.current.state!,
      reso,
      0,
    );
    // La barre reste bloquée à 0 : c'est exactement le symptôme du bug.
    expect(prog.actuel).toBe(0);
    expect(prog.atteint).toBe(false);
  });
});
