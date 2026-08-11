/**
 * Provider AdMob natif (plugin Tauri vendoré). Import DYNAMIQUE de
 * l'API Tauri pour que rien de natif ne soit évalué hors runtime Tauri
 * (même motif que src/lib/notifications).
 */
import type { AdProvider, AdResult, EmplacementPub } from "./adProvider";
import { plateformeNative } from "@/lib/plateforme";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function adMobDisponible(): boolean {
  return plateformeNative() === "ios";
}

export class AdMobAdProvider implements AdProvider {
  /** Promesse d'init partagée — consentement UMP/ATT + start SDK + préchargement. */
  private initEnCours: Promise<void> | null = null;

  /** Idempotent ; en cas d'échec (hors-ligne…), le prochain appel retente. */
  initialiser(): Promise<void> {
    if (!this.initEnCours) {
      this.initEnCours = (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("plugin:admob|initialize");
      })();
      this.initEnCours.catch(() => {
        this.initEnCours = null;
      });
    }
    return this.initEnCours;
  }

  /**
   * `emplacement` choisit le bloc AdMob côté natif (un par écran appelant).
   * Échec technique → exception (l'UI affiche `erreurPub`).
   * Pub fermée avant la récompense → `{ rewarded: false }` sans exception.
   */
  async showRewardedAd(emplacement: EmplacementPub): Promise<AdResult> {
    await this.initialiser();
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ rewarded: boolean }>("plugin:admob|show_rewarded_ad", {
      emplacement,
    });
    return { rewarded: res.rewarded === true };
  }
}
