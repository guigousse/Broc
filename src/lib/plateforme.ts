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

/** Vrai sous n'importe quel runtime Tauri (iOS, Android, bureau). */
export function tauriDisponible(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
