import { AdMobAdProvider, adMobDisponible } from "./adMobProvider";
import { plateformeNative } from "@/lib/plateforme";

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

/**
 * Provider des plateformes où aucune régie n'est encore branchée — Android,
 * tant que le plugin Kotlin du sous-projet B n'existe pas. Il ne récompense
 * jamais : c'est le filet, pas le mécanisme. Le mécanisme est `pubDisponible()`,
 * que l'UI consulte pour ne proposer aucune pub du tout.
 */
export class IndisponibleAdProvider implements AdProvider {
  async showRewardedAd(_emplacement: EmplacementPub): Promise<AdResult> {
    throw new Error("Publicités indisponibles sur cette plateforme");
  }
}

/** Faux là où aucune régie n'est branchée : l'UI ne doit alors ni proposer de
 *  pub, ni en offrir la récompense gratuitement. */
export function pubDisponible(): boolean {
  return plateformeNative() !== "android";
}

// Singleton injectable — AdMob natif sous Tauri iOS, stub partout ailleurs
// (web Safari, simulateur, dev desktop), provider indisponible sous Tauri
// Android (aucune régie n'y est encore branchée).
let instance: AdProvider | null = null;
export function getAdProvider(): AdProvider {
  if (!instance) {
    if (adMobDisponible()) instance = new AdMobAdProvider();
    else if (plateformeNative() === "android") instance = new IndisponibleAdProvider();
    else instance = new StubAdProvider();
  }
  return instance;
}
