// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { notifsQuetes, synchroniserNotifsQuetes } from "./quetesNotif";
import { NOTIF_IDS } from "./ids";

describe("notifsQuetes (pur)", () => {
  it("2 notifs (quotidien+hebdo) aux bons IDs, à l'horloge murale", () => {
    const now = 1_000_000;
    const specs = notifsQuetes(now);
    expect(specs.map((s) => s.id)).toEqual([
      NOTIF_IDS.QUETES[0],
      NOTIF_IDS.QUETES[1],
    ]);
    for (const s of specs) expect(s.atMs).toBeGreaterThan(now);
    expect(specs[0].body.length).toBeGreaterThan(0);
  });
});

describe("synchroniserNotifsQuetes hors Tauri", () => {
  it("est un no-op sans lever", async () => {
    await expect(synchroniserNotifsQuetes(Date.now())).resolves.toBeUndefined();
  });
});
