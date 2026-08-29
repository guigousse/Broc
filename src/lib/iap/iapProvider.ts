import { OUTILS_DEV } from "@/lib/outilsDev";
import { tauriIosDisponible } from "@/lib/plateforme";
import { energieInfinieActive } from "./energieInfinie";
import { TauriIapProvider } from "./iapNatif";

/**
 * `indisponible` = aucune boutique réelle sur cette plateforme (Android/desktop/
 * web en production) : l'UI masque le bouton et, si l'achat est quand même
 * tenté, affiche un message plutôt que de débloquer quoi que ce soit.
 */
export type StatutAchat = "achete" | "annule" | "pending" | "indisponible";

export interface IapProvider {
  /** Vrai si une boutique réelle (ou le stub de recette en dev) peut vendre. */
  disponible(): boolean;
  /** Possession du non-consommable (source : StoreKit ; stub : drapeau local). */
  verifierEntitlement(): Promise<boolean>;
  /** Prix localisé formaté (displayPrice StoreKit) — jamais codé en dur en UI. */
  obtenirPrix(): Promise<string>;
  /** `annule` = fermeture volontaire (silence en UI) ; échec technique → exception. */
  acheter(): Promise<StatutAchat>;
  /** Relance la synchro App Store puis relit l'entitlement. */
  restaurer(): Promise<boolean>;
}

/**
 * Provider factice (web/dev/simulateur). En développement (`OUTILS_DEV`) il
 * simule un achat réussi après délai, pour la recette du paywall. En
 * production (Android, desktop, web) il est INACTIF : l'achat ne réussit
 * jamais — sinon n'importe quel joueur hors iOS débloquerait l'énergie
 * infinie gratuitement d'un simple tap.
 */
export class StubIapProvider implements IapProvider {
  constructor(
    private readonly delaiMs: number = 300,
    private readonly actif: boolean = OUTILS_DEV,
  ) {}

  disponible(): boolean {
    return this.actif;
  }
  async verifierEntitlement(): Promise<boolean> {
    return energieInfinieActive();
  }
  async obtenirPrix(): Promise<string> {
    return "3,99 €";
  }
  async acheter(): Promise<StatutAchat> {
    if (!this.actif) return "indisponible";
    await new Promise((r) => setTimeout(r, this.delaiMs));
    return "achete";
  }
  async restaurer(): Promise<boolean> {
    if (!this.actif) return false;
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
