/**
 * Pont haptique. Seul module qui importe `@tauri-apps/plugin-haptics`, en
 * import DYNAMIQUE pour que son code natif ne soit jamais évalué hors Tauri
 * (navigateur, `next dev`, tests) — même parti pris que le pont des
 * notifications, cf. `src/lib/notifications/index.ts`.
 *
 * `navigator.vibrate` n'est volontairement pas utilisé en secours : WebKit ne
 * l'implémente pas, il serait muet sur iOS, la plateforme principale du jeu.
 *
 * La préférence joueur (`./prefs`) est relue à CHAQUE appel, jamais mise en
 * cache : c'est ce qui rend la coupure immédiate depuis les réglages, sans
 * remontage ni rechargement.
 *
 * Toute erreur est avalée — mais TRACÉE. Le plugin prévient lui-même que le
 * retour haptique n'est garanti sur aucun Android ; un téléphone sans moteur
 * n'a pas le droit de casser l'apparition d'un acheteur. En revanche, se taire
 * complètement a déjà coûté un cycle de build : la permission ACL manquait
 * (`haptics:default` n'existe pas, il faut `haptics:allow-impact-feedback`),
 * le refus était invisible, et l'app paraissait fonctionner.
 */

import { vibrationsActives } from "./prefs";

/** Vrai uniquement sous runtime Tauri (internals injectés par Tauri). */
export function haptiqueDisponible(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Petite secousse à l'apparition d'un acheteur : la plus légère des cinq. */
export async function vibrerApparition(): Promise<void> {
  if (!haptiqueDisponible()) return;
  if (!vibrationsActives()) return;
  try {
    const { impactFeedback } = await import("@tauri-apps/plugin-haptics");
    await impactFeedback("light");
  } catch (e) {
    // On n'interrompt jamais l'appelant — mais on ne se tait pas non plus.
    // Un refus de l'ACL ressemble EXACTEMENT à un succès vu d'ici (rien ne
    // vibre, rien ne lève) : sans cette trace, la panne est indétectable
    // autrement qu'en reconstruisant l'app.
    console.warn("[haptique] vibration impossible :", e);
  }
}
