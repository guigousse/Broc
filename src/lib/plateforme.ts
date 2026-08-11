/**
 * Plateforme native sous laquelle tourne le jeu, ou `null` hors runtime Tauri
 * (web, dev desktop, tests) — où les stubs de développement prennent le relais.
 *
 * Source unique de vérité : `adMobDisponible` (src/lib/ads/adMobProvider.ts) et
 * `tauriIosDisponible` délèguent toutes deux ici. Le cas iPadOS 13+ vaut d'être
 * connu : sa WKWebView se présente avec un User-Agent desktop « Macintosh »
 * sans « iPad », qu'on ne distingue d'un vrai Mac que par le tactile.
 */
export type PlateformeNative = "ios" | "android";

export function plateformeNative(): PlateformeNative | null {
  if (typeof window === "undefined") return null;
  if (!("__TAURI_INTERNALS__" in window)) return null;
  const ua = window.navigator.userAgent;
  if (/Android/.test(ua)) return "android";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1) return "ios";
  return null;
}

/** Vrai uniquement sous runtime Tauri sur iOS. */
export function tauriIosDisponible(): boolean {
  return plateformeNative() === "ios";
}
