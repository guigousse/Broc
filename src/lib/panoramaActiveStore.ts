/**
 * Mini-store réactif pour l'onglet "actif" courant du panorama unifié.
 *
 * Permet à la TabBar (rendue à la racine, hors du layout panorama) de
 * refléter en TEMPS RÉEL la zone vers laquelle l'utilisateur swipe, sans
 * attendre le débounce 350 ms qui pousse l'URL. La synchronisation URL ←
 * scroll reste débouncée pour éviter le spam de router.replace.
 */

type ActiveTab = "bureau" | "stockage" | "atelier" | null;

let current: ActiveTab = null;
const listeners = new Set<() => void>();

export const panoramaActiveStore = {
  get(): ActiveTab {
    return current;
  },
  set(tab: ActiveTab): void {
    if (current === tab) return;
    current = tab;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Snapshot SSR : pas de live highlight côté serveur. */
export function panoramaActiveServerSnapshot(): ActiveTab {
  return null;
}
