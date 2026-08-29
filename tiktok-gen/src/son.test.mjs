import { describe, expect, it } from "vitest";
import { evenementsSon, instantsCelebration } from "./son.js";

describe("evenementsSon", () => {
  it("roulette : tics puis célébration unique, triés", () => {
    const r = { instantsTics: [{ t: 2 }, { t: 0.5 }], instantCelebration: 1 };
    expect(evenementsSon(r)).toEqual([{ t: 0.5, type: "tic" }, { t: 1, type: "celebration" }, { t: 2, type: "tic" }]);
    expect(instantsCelebration({ instantCelebration: null })).toEqual([]);
  });
  it("série : la partition du type telle quelle", () => {
    const part = [{ t: 0, type: "impact" }];
    expect(evenementsSon({ evenementsSon: part, instantsTics: [{ t: 9 }] })).toBe(part);
  });
});
