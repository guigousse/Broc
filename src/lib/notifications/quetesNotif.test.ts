// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { notifsQuetes, synchroniserNotifsQuetes } from "./quetesNotif";
import { NOTIF_IDS } from "./ids";

const RIEN_A_FAIRE = { quotidienNonTerminee: false, hebdoNonTerminee: false };

describe("notifsQuetes (pur)", () => {
  it("2 notifs (quotidien+hebdo) aux bons IDs, décalées à 8h locales", () => {
    const now = new Date(2026, 0, 5, 10, 0, 0).getTime(); // lundi 5 jan 2026, 10h
    const specs = notifsQuetes(now, RIEN_A_FAIRE);
    expect(specs.map((s) => s.id)).toEqual([
      NOTIF_IDS.QUETES[0],
      NOTIF_IDS.QUETES[1],
    ]);
    for (const s of specs) {
      expect(s.atMs).toBeGreaterThan(now);
      expect(new Date(s.atMs).getHours()).toBe(8);
      expect(s.sound).toBe("regen.wav");
    }
    expect(specs[0].body.length).toBeGreaterThan(0);
  });

  it("pas de rappel si les quêtes du jour/semaine sont déjà terminées", () => {
    const now = new Date(2026, 0, 5, 12, 0, 0).getTime();
    const specs = notifsQuetes(now, RIEN_A_FAIRE);
    expect(specs).toHaveLength(2);
  });

  it("ajoute le rappel quotidien à 19h si des quêtes du jour restent actives", () => {
    const now = new Date(2026, 0, 5, 12, 0, 0).getTime(); // lundi 12h
    const specs = notifsQuetes(now, { ...RIEN_A_FAIRE, quotidienNonTerminee: true });
    const rappel = specs.find((s) => s.id === NOTIF_IDS.RAPPEL_QUETES[0]);
    expect(rappel).toBeDefined();
    expect(new Date(rappel!.atMs).getHours()).toBe(19);
    expect(new Date(rappel!.atMs).getDate()).toBe(new Date(now).getDate());
  });

  it("n'ajoute PAS le rappel quotidien si 19h est déjà passé", () => {
    const now = new Date(2026, 0, 5, 20, 0, 0).getTime(); // lundi 20h
    const specs = notifsQuetes(now, { ...RIEN_A_FAIRE, quotidienNonTerminee: true });
    expect(specs.find((s) => s.id === NOTIF_IDS.RAPPEL_QUETES[0])).toBeUndefined();
  });

  it("ajoute le rappel hebdo le dimanche 19h si des quêtes de la semaine restent actives", () => {
    const now = new Date(2026, 0, 5, 12, 0, 0).getTime(); // lundi 12h
    const specs = notifsQuetes(now, { ...RIEN_A_FAIRE, hebdoNonTerminee: true });
    const rappel = specs.find((s) => s.id === NOTIF_IDS.RAPPEL_QUETES[1]);
    expect(rappel).toBeDefined();
    const d = new Date(rappel!.atMs);
    expect(d.getDay()).toBe(0); // dimanche
    expect(d.getHours()).toBe(19);
  });
});

describe("synchroniserNotifsQuetes hors Tauri", () => {
  it("est un no-op sans lever", async () => {
    await expect(
      synchroniserNotifsQuetes(Date.now(), RIEN_A_FAIRE),
    ).resolves.toBeUndefined();
  });
});
