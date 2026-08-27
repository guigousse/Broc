/**
 * LE CONTOUR D'ENGRENAGE de la pièce de réparation.
 *
 * Dessiné ici plutôt qu'emprunté à lucide : le `Cog` de la bibliothèque n'est
 * pas une silhouette pleine mais un cercle à rayons tracés. On ne peut pas
 * biseauter un rebord qui n'existe pas — il fallait un CONTOUR, c'est-à-dire
 * une forme fermée qu'on puisse remplir d'un dégradé, redessiner en plus petit
 * pour le chanfrein, et éclairer d'un seul côté.
 *
 * Repère : une boîte de 100 × 100, centre (50, 50). C'est le `viewBox` du SVG,
 * donc la pièce suit sa boîte quelle que soit sa taille à l'écran (18 px dans
 * un bouton de l'atelier, 150 px dans la fiche du Bazar).
 */

/** Rayon de la pointe d'une dent, dans le repère de 100. */
export const RAYON_DENT = 49;
/** Rayon du creux entre deux dents. */
export const RAYON_CREUX = 41.5;

/** Demi-largeur angulaire d'une pointe, en fraction du pas d'une dent. */
const PART_POINTE = 0.3;
/** Demi-largeur angulaire d'un creux, en fraction du pas. */
const PART_CREUX = 0.28;

const arrondi = (n: number) => Math.round(n * 100) / 100;

/** Point du cercle de rayon `r` à l'angle `deg`, dans le repère de 100. */
function polaire(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [arrondi(50 + r * Math.cos(a)), arrondi(50 + r * Math.sin(a))];
}

/**
 * Le chemin SVG d'un engrenage à `dents` dents.
 *
 * Chaque dent porte quatre sommets — deux au creux, deux à la pointe — reliés
 * par des flancs droits, et les pointes comme les creux sont fermés par un ARC
 * de leur propre rayon. C'est ce qui distingue une denture d'une étoile : les
 * sommets ne sont pas des angles mais des plats courbes, sur lesquels la
 * lumière du rebord peut courir.
 */
export function cheminEngrenage(dents: number): string {
  if (dents < 5) {
    throw new Error(`Un engrenage demande au moins 5 dents (reçu : ${dents}).`);
  }
  const pas = 360 / dents;
  const segments: string[] = [];

  for (let i = 0; i < dents; i++) {
    const centre = i * pas;
    const creuxAvant = polaire(RAYON_CREUX, centre - pas * PART_CREUX);
    const pointeAvant = polaire(RAYON_DENT, centre - pas * PART_POINTE);
    const pointeApres = polaire(RAYON_DENT, centre + pas * PART_POINTE);
    const creuxApres = polaire(RAYON_CREUX, centre + pas * PART_CREUX);

    // Le sommet d'entrée n'est posé qu'une fois, au tout début : pour les
    // dents suivantes, l'arc de creux de la dent précédente y a déjà amené le
    // tracé. Le répéter dessinerait un segment de longueur nulle.
    if (i === 0) segments.push(`M${creuxAvant[0]} ${creuxAvant[1]}`);
    segments.push(`L${pointeAvant[0]} ${pointeAvant[1]}`);
    segments.push(
      `A${RAYON_DENT} ${RAYON_DENT} 0 0 1 ${pointeApres[0]} ${pointeApres[1]}`,
    );
    segments.push(`L${creuxApres[0]} ${creuxApres[1]}`);
    // Le creux vers la dent suivante est fermé par l'arc du cercle de fond ;
    // le dernier rejoint le tout premier sommet, d'où la fermeture par `Z`.
    const suivant = polaire(RAYON_CREUX, (i + 1) * pas - pas * PART_CREUX);
    segments.push(
      `A${RAYON_CREUX} ${RAYON_CREUX} 0 0 1 ${suivant[0]} ${suivant[1]}`,
    );
  }

  return `${segments.join(" ")} Z`;
}
