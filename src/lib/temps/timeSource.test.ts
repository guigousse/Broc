import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpTimeSource } from "./timeSource";

afterEach(() => vi.restoreAllMocks());

// Réponse typique de timeapi.io /api/time/current/zone?timeZone=UTC (heure UTC).
const REPONSE_TIMEAPI = {
  year: 2026,
  month: 6,
  day: 24,
  hour: 0,
  minute: 58,
  seconds: 23,
  milliSeconds: 348,
  dateTime: "2026-06-24T00:58:23.3488381",
  timeZone: "UTC",
};

describe("HttpTimeSource", () => {
  it("renvoie un epoch ms construit en UTC depuis les champs date/heure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => REPONSE_TIMEAPI,
      }),
    );
    const src = new HttpTimeSource("https://exemple.test", 1000);
    // Construit en UTC (mois 0-indexé) — pas d'interprétation en fuseau local.
    expect(await src.maintenant()).toBe(Date.UTC(2026, 5, 24, 0, 58, 23, 348));
  });

  it("tolère milliSeconds absent (→ 0)", async () => {
    const sansMs = { ...REPONSE_TIMEAPI };
    delete (sansMs as { milliSeconds?: number }).milliSeconds;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => sansMs }),
    );
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBe(
      Date.UTC(2026, 5, 24, 0, 58, 23, 0),
    );
  });

  it("renvoie null sur réponse non ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si fetch rejette (offline/timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si les champs date/heure sont absents/non numériques", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });
});
