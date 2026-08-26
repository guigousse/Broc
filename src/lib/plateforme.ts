/**
 * Vrai sous runtime Tauri, quelle que soit la plateforme (iOS, Android,
 * desktop). Sert à distinguer « dans l'app » de « dans un navigateur »
 * (Broc tourne aussi sur Vercel) sans se soucier du système en dessous.
 *
 * N'a PAS remplacé les détections déjà en place ailleurs dans le dépôt
 * (`haptique/index.ts`, `notifications/index.ts`) : ce sont des modules que
 * cette relecture n'a pas touchés, et les faire pointer ici serait élargir le
 * chantier au-delà de ce qui a été relu.
 */
export function tauriDisponible(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

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
