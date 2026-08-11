/**
 * Pile des fermetures ouvertes, du plus bas au plus haut. Le bouton retour
 * matériel d'Android ferme d'abord ce qui est au-dessus, comme le ferait un
 * tap sur le voile : c'est la seule façon d'avoir un comportement correct
 * quel que soit l'empilement (sheet par-dessus overlay par-dessus modale).
 *
 * Volontairement hors React : les overlays s'y enregistrent au montage, et le
 * lecteur du bouton retour (BoutonRetourAndroid) la consulte sans avoir à
 * connaître qui que ce soit.
 */
type Fermeture = () => void;

const pile: Fermeture[] = [];

/** Enregistre un fermoir. Retourne la fonction de désenregistrement, à appeler
 *  au démontage (elle est sans effet si le fermoir a déjà été consommé). */
export function empilerFermeture(f: Fermeture): () => void {
  pile.push(f);
  return () => {
    const i = pile.lastIndexOf(f);
    if (i !== -1) pile.splice(i, 1);
  };
}

/** Ferme l'élément le plus haut. Vrai s'il y en avait un à fermer. */
export function fermerLePlusHaut(): boolean {
  const f = pile.pop();
  if (!f) return false;
  f();
  return true;
}

/** Réservé aux tests : remet la pile à zéro entre deux cas. */
export function viderPile(): void {
  pile.length = 0;
}
