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
