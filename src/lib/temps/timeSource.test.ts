import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpTimeSource } from "./timeSource";

afterEach(() => vi.restoreAllMocks());

describe("HttpTimeSource", () => {
  it("renvoie un epoch ms depuis le champ unixtime", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unixtime: 1_700_000_000 }),
      }),
    );
    const src = new HttpTimeSource("https://exemple.test", 1000);
    expect(await src.maintenant()).toBe(1_700_000_000_000);
  });

  it("renvoie null sur réponse non ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si fetch rejette (offline/timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });

  it("renvoie null si unixtime absent/non numérique", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await new HttpTimeSource("https://exemple.test").maintenant()).toBeNull();
  });
});
