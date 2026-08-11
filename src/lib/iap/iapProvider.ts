import { plateformeNative, tauriIosDisponible } from "@/lib/plateforme";
import { energieInfinieActive } from "./energieInfinie";
import { TauriIapProvider } from "./iapNatif";

export type StatutAchat = "achete" | "annule" | "pending";

export interface IapProvider {
  /** Possession du non-consommable (source : StoreKit ; stub : drapeau local). */
  verifierEntitlement(): Promise<boolean>;
  /** Prix localisé formaté (displayPrice StoreKit) — jamais codé en dur en UI. */
  obtenirPrix(): Promise<string>;
  /** `annule` = fermeture volontaire (silence en UI) ; échec technique → exception. */
  acheter(): Promise<StatutAchat>;
  /** Relance la synchro App Store puis relit l'entitlement. */
  restaurer(): Promise<boolean>;
}

/** Provider factice (web/dev/simulateur) : achat toujours réussi après délai. */
export class StubIapProvider implements IapProvider {
  constructor(private readonly delaiMs: number = 300) {}

  async verifierEntitlement(): Promise<boolean> {
    return energieInfinieActive();
  }
  async obtenirPrix(): Promise<string> {
    return "3,99 €";
  }
  async acheter(): Promise<StatutAchat> {
    await new Promise((r) => setTimeout(r, this.delaiMs));
    return "achete";
  }
  async restaurer(): Promise<boolean> {
    return energieInfinieActive();
  }
}

/**
 * Provider des plateformes sans boutique branchée — Android, tant que le
 * plugin Google Play Billing du sous-projet C n'existe pas. Il n'accorde
 * jamais l'entitlement, et échoue franchement si on tente un achat.
 */
export class IndisponibleIapProvider implements IapProvider {
  async verifierEntitlement(): Promise<boolean> {
    return false;
  }
  async obtenirPrix(): Promise<string> {
    throw new Error("Achats indisponibles sur cette plateforme");
  }
  async acheter(): Promise<StatutAchat> {
    throw new Error("Achats indisponibles sur cette plateforme");
  }
  async restaurer(): Promise<boolean> {
    return false;
  }
}

/** Faux là où aucune boutique n'est branchée : l'UI ne doit alors ni proposer
 *  l'achat, ni proposer de le restaurer. */
export function achatDisponible(): boolean {
  return plateformeNative() !== "android";
}

// Singleton injectable — StoreKit natif sous Tauri iOS, stub partout ailleurs
// (même motif que getAdProvider), provider indisponible sous Tauri Android
// (aucune boutique n'y est encore branchée).
let instance: IapProvider | null = null;
export function getIapProvider(): IapProvider {
  if (!instance) {
    if (tauriIosDisponible()) instance = new TauriIapProvider();
    else if (plateformeNative() === "android") instance = new IndisponibleIapProvider();
    else instance = new StubIapProvider();
  }
  return instance;
}
