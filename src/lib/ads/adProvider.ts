import { AdMobAdProvider, adMobDisponible } from "./adMobProvider";
import { logEvenement } from "@/lib/analytics/contexte";
import { EVENEMENTS } from "@/lib/analytics/analytics";

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

  async showRewardedAd(emplacement: EmplacementPub): Promise<AdResult> {
    logEvenement(EVENEMENTS.pubDemandee, { emplacement });
    await new Promise((r) => setTimeout(r, this.delaiMs));
    logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded: true });
    return { rewarded: true };
  }
}

/** Garde consultée par l'UI avant de proposer une pub. Vraie partout depuis
 *  que le plugin Android existe (sous-projet B) ; conservée parce que c'est
 *  ELLE que les écrans interrogent — une plateforme sans régie la remettra à
 *  faux sans toucher aux appelants. */
export function pubDisponible(): boolean {
  return true;
}

// Singleton injectable — AdMob natif sous Tauri (iOS et Android), stub partout
// ailleurs (web Safari, simulateur, dev desktop).
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) {
    instance = adMobDisponible() ? new AdMobAdProvider() : new StubAdProvider();
  }
  return instance;
}
