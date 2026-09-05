/**
 * Provider AdMob natif (plugin Tauri vendoré). Import DYNAMIQUE de
 * l'API Tauri pour que rien de natif ne soit évalué hors runtime Tauri
 * (même motif que src/lib/notifications).
 */
import type { AdProvider, AdResult, EmplacementPub } from "./adProvider";
import { plateformeNative } from "@/lib/plateforme";
import { logEvenement } from "@/lib/analytics/contexte";
import { EVENEMENTS } from "@/lib/analytics/analytics";

/** Vrai sous runtime Tauri sur iOS ET Android : le plugin existe sur les deux
 *  (Swift d'un côté, Kotlin de l'autre, même contrat). */
export function adMobDisponible(): boolean {
  return plateformeNative() !== null;
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
    logEvenement(EVENEMENTS.pubDemandee, { emplacement });
    await this.initialiser();
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      const res = await invoke<{ rewarded: boolean }>("plugin:admob|show_rewarded_ad", {
        emplacement,
      });
      const rewarded = res.rewarded === true;
      logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded });
      return { rewarded };
    } catch (e) {
      // Échec technique (pas d'inventaire, hors-ligne) : `rewarded: false`
      // distingue « pub non aboutie » de « joueur qui ferme avant la fin »
      // uniquement au croisement avec la console AdMob. On mesure les deux
      // pareil ici, et on relance : l'UI doit toujours voir l'erreur.
      logEvenement(EVENEMENTS.pubTerminee, { emplacement, rewarded: false });
      throw e;
    }
  }
}

/**
 * Vrai quand UMP exige un point d'entrée « options de confidentialité »
 * (joueur en UE). Faux sur toute erreur : mieux vaut pas de bouton qu'un
 * bouton qui échoue. Implémenté côté natif sur Android seulement (sous-projet
 * B) ; l'appelant gate sur la plateforme.
 */
export async function optionsConfidentialiteRequises(): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = await invoke<{ requis: boolean }>("plugin:admob|privacy_options_required");
    return res.requis === true;
  } catch {
    return false;
  }
}

/** Rouvre le formulaire de consentement UMP. L'erreur remonte à l'UI (toast). */
export async function montrerOptionsConfidentialite(): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("plugin:admob|show_privacy_options");
}
