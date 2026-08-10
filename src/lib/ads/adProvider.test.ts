import { describe, it, expect } from "vitest";
import { StubAdProvider, getAdProvider, EMPLACEMENTS_PUB } from "./adProvider";

describe("EMPLACEMENTS_PUB", () => {
  it("chaque emplacement a un identifiant distinct (un bloc AdMob par emplacement)", () => {
    const ids = Object.values(EMPLACEMENTS_PUB);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("StubAdProvider", () => {
  it("résout une pub récompensée", async () => {
    const res = await new StubAdProvider(0).showRewardedAd(EMPLACEMENTS_PUB.energie);
    expect(res.rewarded).toBe(true);
  });

  it("getAdProvider renvoie un singleton stable", () => {
    expect(getAdProvider()).toBe(getAdProvider());
  });
});
