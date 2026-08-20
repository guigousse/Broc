/**
 * Provider Firebase natif (plugin Tauri vendoré). Import DYNAMIQUE de l'API
 * Tauri pour que rien de natif ne soit évalué hors runtime Tauri — même motif
 * que src/lib/ads/adMobProvider.ts.
 */
import type { AnalyticsProvider, ParamsEvenement } from "./analytics";
import { tauriIosDisponible } from "@/lib/plateforme";

/** Vrai uniquement sous runtime Tauri sur iOS (le plugin n'existe que là). */
export function firebaseDisponible(): boolean {
  return tauriIosDisponible();
}

export class FirebaseAnalyticsProvider implements AnalyticsProvider {
  private initEnCours: Promise<void> | null = null;

  /** Idempotent ; en cas d'échec, le prochain appel retente. */
  initialiser(): Promise<void> {
    if (!this.initEnCours) {
      this.initEnCours = (async () => {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("plugin:firebase|initialize");
      })();
      this.initEnCours.catch(() => {
        this.initEnCours = null;
      });
    }
    return this.initEnCours;
  }

  // Volontairement synchrone et sans retour : un appelant ne doit jamais avoir
  // à attendre, ni à gérer une erreur de mesure. Tout est avalé.
  logEvent(nom: string, params: ParamsEvenement = {}): void {
    void (async () => {
      await this.initialiser();
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:firebase|log_event", { nom, params });
    })().catch(() => {});
  }

  setUserProperty(nom: string, valeur: string | null): void {
    void (async () => {
      await this.initialiser();
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:firebase|set_user_property", { nom, valeur });
    })().catch(() => {});
  }
}
