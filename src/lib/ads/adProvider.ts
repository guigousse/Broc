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

// Singleton injectable — swap futur vers AdMobAdProvider (Tauri natif) ici uniquement.
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) instance = new StubAdProvider();
  return instance;
}
