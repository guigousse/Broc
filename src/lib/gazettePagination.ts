/**
 * Répartition des sections de la gazette en pages (spec
 * 2026-08-05-gazette-pagination-onglet-evenement).
 *
 * Remplissage glouton dans l'ordre : une section est INSÉCABLE ; si elle ne
 * tient plus sur la page courante, elle ouvre la suivante. Une section plus
 * haute qu'une page obtient sa page dédiée (léger débord toléré). Garde-fous
 * jsdom/premier rendu : hauteur disponible non positive → une seule page.
 */
export function paginerSections(
  hauteurs: readonly number[],
  hauteurDisponible: number,
): number[][] {
  if (hauteurs.length === 0) return [[]];
  if (hauteurDisponible <= 0) return [hauteurs.map((_, i) => i)];
  const pages: number[][] = [];
  let courante: number[] = [];
  let reste = hauteurDisponible;
  hauteurs.forEach((h, i) => {
    if (courante.length > 0 && h > reste) {
      pages.push(courante);
      courante = [];
      reste = hauteurDisponible;
    }
    courante.push(i);
    reste -= h;
  });
  pages.push(courante);
  return pages;
}
