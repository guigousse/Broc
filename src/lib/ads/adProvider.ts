import { AdMobAdProvider, adMobDisponible } from "./adMobProvider";

export interface AdResult {
  /** true si la pub a été visionnée jusqu'au bout (récompense due). */
  rewarded: boolean;
}

export interface AdProvider {
  showRewardedAd(): Promise<AdResult>;
}

/** Provider factice : simule un court délai puis accorde la récompense. */
export class StubAdProvider implements AdProvider {
  constructor(private readonly delaiMs: number = 800) {}

  async showRewardedAd(): Promise<AdResult> {
    await new Promise((r) => setTimeout(r, this.delaiMs));
    return { rewarded: true };
  }
}

// Singleton injectable — AdMob natif sous Tauri iOS, stub partout ailleurs
// (web Safari, simulateur, dev desktop).
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) {
    instance = adMobDisponible() ? new AdMobAdProvider() : new StubAdProvider();
  }
  return instance;
}
