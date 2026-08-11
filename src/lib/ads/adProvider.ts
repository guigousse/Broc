import { AdMobAdProvider, adMobDisponible } from "./adMobProvider";

export interface AdResult {
  /** true si la pub a été visionnée jusqu'au bout (récompense due). */
  rewarded: boolean;
}

/**
 * Emplacements publicitaires du jeu. Chaque valeur correspond à un bloc
 * rewarded distinct dans la console AdMob (cf. AD_UNITS dans
 * gen/apple/Sources/app/AdmobBridge.swift) : c'est ce qui permet de lire les
 * revenus et le taux de complétion écran par écran.
 */
export const EMPLACEMENTS_PUB = {
  /** Machine à énergie : « regarder une pub » pour +1 ⚡. */
  energie: "energie",
  /** Boîte mystère du deck de chinage : la pub ouvre la boîte. */
  boiteMystere: "boite-mystere",
  /** Atelier : la pub termine une restauration immédiatement. */
  restauration: "restauration",
} as const;

export type EmplacementPub = (typeof EMPLACEMENTS_PUB)[keyof typeof EMPLACEMENTS_PUB];

export interface AdProvider {
  showRewardedAd(emplacement: EmplacementPub): Promise<AdResult>;
}

/** Provider factice : simule un court délai puis accorde la récompense. */
export class StubAdProvider implements AdProvider {
  constructor(private readonly delaiMs: number = 800) {}

  async showRewardedAd(_emplacement: EmplacementPub): Promise<AdResult> {
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
