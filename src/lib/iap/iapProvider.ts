import { tauriIosDisponible } from "@/lib/plateforme";
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

// Singleton injectable — StoreKit natif sous Tauri iOS, stub partout ailleurs
// (même motif que getAdProvider).
let instance: IapProvider | null = null;
export function getIapProvider(): IapProvider {
  if (!instance) {
    instance = tauriIosDisponible() ? new TauriIapProvider() : new StubIapProvider();
  }
  return instance;
}
