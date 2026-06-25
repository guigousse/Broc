import { describe, it, expect } from "vitest";
import {
  cleJourLocal,
  cleSemaineLocale,
  prochainMinuitLocalMs,
  prochainLundiLocalMs,
} from "./periode";

const JOUR = 24 * 60 * 60 * 1000;

describe("cleJourLocal", () => {
  it("format YYYY-MM-DD et change d'un jour à l'autre", () => {
    const t = Date.UTC(2026, 5, 25, 12, 0, 0);
    expect(cleJourLocal(t)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cleJourLocal(t)).not.toBe(cleJourLocal(t + JOUR));
  });
});

describe("prochainMinuitLocalMs", () => {
  it("est dans le futur, ≤ 24 h, et tombe à minuit local", () => {
    const now = Date.UTC(2026, 5, 25, 12, 0, 0);
    const m = prochainMinuitLocalMs(now);
    expect(m).toBeGreaterThan(now);
    expect(m - now).toBeLessThanOrEqual(JOUR);
    const d = new Date(m);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});

describe("cleSemaineLocale", () => {
  it("format YYYY-Www et stable sur la même semaine, change la suivante", () => {
    const t = Date.UTC(2026, 5, 24, 12, 0, 0); // un mercredi
    expect(cleSemaineLocale(t)).toMatch(/^\d{4}-W\d{2}$/);
    expect(cleSemaineLocale(t)).toBe(cleSemaineLocale(t + JOUR)); // jeudi, même semaine
    expect(cleSemaineLocale(t)).not.toBe(cleSemaineLocale(t + 7 * JOUR));
  });
});

describe("prochainLundiLocalMs", () => {
  it("est dans le futur, ≤ 7 j, tombe un lundi à minuit local", () => {
    const now = Date.UTC(2026, 5, 25, 12, 0, 0);
    const l = prochainLundiLocalMs(now);
    expect(l).toBeGreaterThan(now);
    expect(l - now).toBeLessThanOrEqual(7 * JOUR);
    const d = new Date(l);
    expect(d.getDay()).toBe(1); // lundi
    expect(d.getHours()).toBe(0);
  });
});
