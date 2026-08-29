import type { IapProvider, StatutAchat } from "./iapProvider";

/** Provider StoreKit natif (plugin Tauri vendoré `iap`). */
export class TauriIapProvider implements IapProvider {
  disponible(): boolean {
    return true;
  }

  async verifierEntitlement(): Promise<boolean> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ energieInfinie: boolean }>(
      "plugin:iap|verifier_entitlement",
    );
    return res.energieInfinie === true;
  }

  async obtenirPrix(): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ prix: string }>("plugin:iap|obtenir_prix");
    return res.prix;
  }

  async acheter(): Promise<StatutAchat> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ statut: string }>("plugin:iap|acheter");
    if (res.statut === "achete" || res.statut === "annule" || res.statut === "pending") {
      return res.statut;
    }
    throw new Error(`Statut d'achat inattendu : ${res.statut}`);
  }

  async restaurer(): Promise<boolean> {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ energieInfinie: boolean }>("plugin:iap|restaurer");
    return res.energieInfinie === true;
  }
}
