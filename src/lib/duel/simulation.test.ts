import { describe, expect, it } from "vitest";
import { creerRng } from "@/lib/duel/rng";
import { deckAleatoire } from "@/lib/duel/generateursDecks";
import { jouerPartie } from "@/lib/duel/simulation";
import { MANCHES_MAX } from "@/lib/duel/etat";

describe("jouerPartie", () => {
  it("est déterministe par graine", () => {
    const rng = creerRng(11);
    const a = deckAleatoire(rng), b = deckAleatoire(rng);
    const r1 = jouerPartie({ deckA: a, deckB: b, profilA: "agressif", profilB: "prudent", graine: 3 });
    const r2 = jouerPartie({ deckA: a, deckB: b, profilA: "agressif", profilB: "prudent", graine: 3 });
    expect(r1).toEqual(r2);
    expect(r1.manches).toBeLessThanOrEqual(MANCHES_MAX);
  });

  it("robustesse : 200 parties aléatoires sans exception ni boucle", () => {
    const rng = creerRng(2026);
    let finies = 0;
    for (let i = 0; i < 200; i++) {
      const r = jouerPartie({
        deckA: deckAleatoire(rng), deckB: deckAleatoire(rng),
        profilA: i % 2 ? "agressif" : "prudent", profilB: i % 3 ? "prudent" : "agressif", graine: i,
      });
      expect(r.manches).toBeLessThanOrEqual(MANCHES_MAX);
      if (!r.epuisee) finies++;
      const totalPoses = Object.values(r.poses).reduce((s, n) => s + n, 0);
      expect(totalPoses).toBeGreaterThan(0);
    }
    expect(finies).toBeGreaterThan(190);
  });
});
