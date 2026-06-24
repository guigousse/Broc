import { describe, it, expect } from "vitest";
import { StubAdProvider, getAdProvider } from "./adProvider";

describe("StubAdProvider", () => {
  it("résout une pub récompensée", async () => {
    const res = await new StubAdProvider(0).showRewardedAd();
    expect(res.rewarded).toBe(true);
  });

  it("getAdProvider renvoie un singleton stable", () => {
    expect(getAdProvider()).toBe(getAdProvider());
  });
});
