/**
 * Vrai sous runtime Tauri, quelle que soit la plateforme (iOS, Android,
 * desktop). Sert à distinguer « dans l'app » de « dans un navigateur »
 * (Broc tourne aussi sur Vercel) sans se soucier du système en dessous.
 *
 * N'a PAS remplacé les détections déjà en place ailleurs dans le dépôt
 * (`adMobProvider.ts`, `haptique/index.ts`, `notifications/index.ts`,
 * ni la garde ci-dessous) : ce sont des modules que cette relecture n'a pas
 * touchés, et les faire pointer ici serait élargir le chantier au-delà de ce
 * qui a été relu.
 */
export function tauriDisponible(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

/**
 * Vrai uniquement sous runtime Tauri sur iOS. Même détection que
 * `adMobDisponible` (src/lib/ads/adMobProvider.ts) — dupliquée à dessein pour
 * ne pas coupler le module iap au module ads (y compris le cas iPadOS 13+ qui
 * se présente en UA « Macintosh » : on le distingue d'un vrai Mac au tactile).
 */
export function tauriIosDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  const ua = window.navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}

/**
 * Vrai uniquement sous runtime Tauri sur Android. Pendant symétrique de
 * `tauriIosDisponible` — même structure, même ordre de gardes, pour qu'un
 * lecteur qui connaît l'une reconnaisse l'autre au premier coup d'œil.
 */
export function tauriAndroidDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  return /Android/.test(window.navigator.userAgent);
}
