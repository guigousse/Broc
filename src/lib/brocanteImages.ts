/**
 * Pipeline image des brocantes.
 *
 * Convention : `public/brocantes/{brocanteId}.png` si le brocanteId figure
 * dans `BROCANTES_WITH_IMAGE`. Sinon le composant retombe sur un placeholder.
 */

export const BROCANTES_WITH_IMAGE: ReadonlySet<string> = new Set<string>([
  "vide-grenier-quartier",
  "marche-aux-puces-dimanche",
  "bouquinerie-plein-air",
  "vide-dressing-centre",
  "brocante-club-jeux",
  "deballage-collectionneurs",
  "marche-saint-ouen",
  "disquaire-independant",
  "atelier-bricoleur",
  "marche-antiquaires-bibelots",
  "foire-chatou",
  "salon-grands-collectionneurs",
  "drouot-mode-couture",
  "salon-violon-ancien",
  "galerie-arts-decoratifs",
  "galerie-tableaux-sculptures",
  "salon-antiquaires-drouot",
]);

/**
 * Retourne le chemin du WebP de la brocante (généré par `scripts/generate-webp.mjs`).
 */
export function getBrocanteImageUrl(brocanteId: string): string | null {
  return BROCANTES_WITH_IMAGE.has(brocanteId)
    ? `/brocantes/${brocanteId}.webp`
    : null;
}
