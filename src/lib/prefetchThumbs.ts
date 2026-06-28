import { getItemThumbUrl } from "@/lib/itemImages";
import type { CollectionSlot } from "@/types/game";

/**
 * URLs de vignette des slots qui ont une image, dédupliquées (ordre de première
 * apparition). Les slots sans image (`getItemThumbUrl` → null) sont ignorés.
 */
export function thumbUrlsForSlots(slots: CollectionSlot[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const s of slots) {
    const u = getItemThumbUrl(s.templateId);
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

/**
 * Réchauffe le cache HTTP des vignettes : `fetch` les OCTETS (sans décoder).
 * Best-effort, fire-and-forget, concurrence bornée. NE PAS utiliser `new Image()`
 * ici : cela décoderait les bitmaps et referait exploser la mémoire (le crash
 * WebView iOS que la virtualisation évite). Le décodage reste assuré, borné, par
 * la grille virtualisée au moment où chaque cellule se monte.
 */
export function prefetchThumbs(urls: string[], concurrency = 6): void {
  if (typeof fetch !== "function" || urls.length === 0) return;
  let i = 0;
  const worker = (): void => {
    if (i >= urls.length) return;
    const url = urls[i++];
    fetch(url, { cache: "force-cache" })
      .catch(() => {})
      .finally(worker);
  };
  const n = Math.min(concurrency, urls.length);
  for (let k = 0; k < n; k++) worker();
}
