import { describe, expect, it } from "vitest";
import type { EtatPartie, Joueur } from "@/lib/duel/etat";
import { piocher } from "@/lib/duel/operations";

function joueur(vitrine: number, echecsPioche = 0): Joueur {
  return { vitrine, plafond: 0, energie: 0, bonusEnergie: 0, main: [], deck: [], etal: [], casse: [], echecsPioche };
}

describe("piocher — fatigue", () => {
  it("une pioche manquée journalise l'échec, sans être fatale tant que la vitrine reste > 0", () => {
    const e: EtatPartie = { joueurs: [joueur(20), joueur(20)], actif: 0, tour: 1, prochainUid: 1, fini: null, journal: [] };
    piocher(e, 0, 1); // deck vide : échec 1, vitrine 20 → 19
    expect(e.joueurs[0].vitrine).toBe(19);
    expect(e.journal).toContain("J0 fatigue 1");
    expect(e.journal).not.toContain("J0 fatigue fatale");
  });

  it("la pioche manquée qui fait tomber la vitrine à 0 ou moins journalise « fatigue fatale »", () => {
    // Déjà 1 échec (échecsPioche = 1) : la 2ᵉ pioche manquée coûte 2, et vitrine 2 → 0.
    const e: EtatPartie = { joueurs: [joueur(2, 1), joueur(20)], actif: 0, tour: 1, prochainUid: 1, fini: null, journal: [] };
    piocher(e, 0, 1);
    expect(e.joueurs[0].vitrine).toBe(0);
    expect(e.journal).toContain("J0 fatigue 2");
    expect(e.journal).toContain("J0 fatigue fatale");
  });

  it("le joueur qui ne pioche pas n'est pas concerné", () => {
    const e: EtatPartie = { joueurs: [joueur(20), joueur(1)], actif: 0, tour: 1, prochainUid: 1, fini: null, journal: [] };
    piocher(e, 0, 1);
    expect(e.journal.some((l) => l.startsWith("J1"))).toBe(false);
  });
});
