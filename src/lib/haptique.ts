/**
 * Pont haptique. Seul module qui importe `@tauri-apps/plugin-haptics`, en
 * import DYNAMIQUE pour que son code natif ne soit jamais évalué hors Tauri
 * (navigateur, `next dev`, tests) — même parti pris que le pont des
 * notifications, cf. `src/lib/notifications/index.ts`.
 *
 * `navigator.vibrate` n'est volontairement pas utilisé en secours : WebKit ne
 * l'implémente pas, il serait muet sur iOS, la plateforme principale du jeu.
 *
 * Toute erreur est avalée. Le plugin prévient lui-même que le retour haptique
 * n'est garanti sur aucun Android ; un téléphone sans moteur haptique n'a pas
 * le droit de casser l'apparition d'un acheteur.
 */

/** Vrai uniquement sous runtime Tauri (internals injectés par Tauri). */
export function haptiqueDisponible(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Petite secousse à l'apparition d'un acheteur : la plus légère des cinq. */
export async function vibrerApparition(): Promise<void> {
  if (!haptiqueDisponible()) return;
  try {
    const { impactFeedback } = await import("@tauri-apps/plugin-haptics");
    await impactFeedback("light");
  } catch {
    // Pas de moteur haptique, plugin absent, permission refusée : tant pis.
  }
}
