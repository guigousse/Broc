/**
 * Pipeline image des items.
 *
 * Convention : un item dont le `templateId` figure dans `ITEMS_WITH_IMAGE`
 * dispose d'un fichier à `public/items/{templateId}.png`.
 *
 * Pour ajouter une image :
 *   1. Générer le PNG (voir prompts dans docs ou /agent)
 *   2. Le placer dans `public/items/{templateId}.png`
 *   3. Ajouter le `templateId` dans le Set ci-dessous
 *
 * Le composant `<ItemImage />` se charge ensuite du fallback (icône catégorie)
 * si le `templateId` n'est pas dans le Set.
 */

export const ITEMS_WITH_IMAGE: ReadonlySet<string> = new Set<string>([
  "mus.diapason_acier",
  "mus.flute_traversiere_yamaha",
  "jx.monopoly_80s",
  "ma.tabouret_bois_patine",
  "mus.saxophone_selmer_mark_vi",
]);

export function getItemImageUrl(templateId: string): string | null {
  return ITEMS_WITH_IMAGE.has(templateId)
    ? `/items/${templateId}.png`
    : null;
}
