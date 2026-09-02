import { describe, expect, it } from "vitest";
import { creerRng, melanger } from "@/lib/duel/rng";

describe("rng à graine", () => {
  it("même graine, même suite ; graines différentes, suites différentes", () => {
    const a = creerRng(42), b = creerRng(42), c = creerRng(43);
    const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const x of sa) expect(x >= 0 && x < 1).toBe(true);
  });

  it("melanger rend une permutation sans toucher l'original", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const m = melanger(xs, creerRng(7));
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...m].sort((p, q) => p - q)).toEqual(xs);
    expect(m).not.toEqual(xs);
  });
});
