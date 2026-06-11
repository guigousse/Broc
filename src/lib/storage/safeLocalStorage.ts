/**
 * Helpers localStorage sûrs et SSR-safe.
 *
 * - Côté serveur (`window` undefined) : `get` retourne le fallback, `set`
 *   retourne false, sans jamais lever d'exception.
 * - Côté client : toute erreur (JSON invalide, quota dépassé, stockage
 *   désactivé en navigation privée) est avalée et signalée par le fallback /
 *   le booléen de retour.
 *
 * Les valeurs sont sérialisées en JSON. Ne pas utiliser ces helpers pour des
 * clés stockant des chaînes brutes (non-JSON) écrites par ailleurs.
 */

/** Lit et parse une valeur JSON du localStorage. Retourne `fallback` en cas d'absence ou d'erreur. */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Sérialise et écrit une valeur dans le localStorage. Retourne `false` si l'écriture a échoué. */
export function safeLocalStorageSet(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
