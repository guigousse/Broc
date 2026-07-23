/**
 * Provider AdMob natif (plugin Tauri vendoré). Import DYNAMIQUE de
 * l'API Tauri pour que rien de natif ne soit évalué hors runtime Tauri
 * (même motif que src/lib/notifications).
 */
import type { AdProvider, AdResult } from "./adProvider";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function adMobDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  // iPadOS 13+ : WKWebView se présente par défaut avec un UA desktop
  // « Macintosh » sans « iPad » — on le distingue d'un vrai Mac (dev
  // desktop Tauri) par le tactile (maxTouchPoints > 1).
  const ua = window.navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
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
   * Échec technique → exception (l'UI affiche `erreurPub`).
   * Pub fermée avant la récompense → `{ rewarded: false }` sans exception.
   */
  async showRewardedAd(): Promise<AdResult> {
    await this.initialiser();
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ rewarded: boolean }>("plugin:admob|show_rewarded_ad");
    return { rewarded: res.rewarded === true };
  }
}
