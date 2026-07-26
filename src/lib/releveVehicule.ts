/**
 * Minutage de la « relève » du véhicule : l'ancien ferme son coffre et s'en
 * va comme s'il partait en brocante, puis le nouveau revient du fond en
 * marche arrière et ouvre son coffre. La seconde moitié est la première jouée
 * à l'envers — trajectoire, gestes et sons.
 *
 * Isolé du composant parce que c'est la seule partie où une erreur est
 * plausible, et que la piloter à travers requestAnimationFrame en jsdom
 * coûterait plus qu'elle ne rapporte.
 */

/** Fermeture du coffre avant le départ (durée du fondu ouvert → fermé). */
export const RELEVE_FERMETURE_MS = 500;
/** Temps mort entre le coffre fermé et le premier mètre parcouru. */
export const RELEVE_ATTENTE_MS = 350;
/** Éloignement de l'ancien véhicule (et, symétriquement, retour du nouveau). */
export const RELEVE_TRAJET_MS = 1600;
/** Garage vide entre les deux véhicules. */
export const RELEVE_ENTREDEUX_MS = 300;
/** Ouverture du coffre du nouveau véhicule, une fois rangé. */
export const RELEVE_OUVERTURE_MS = 500;

/**
 * Instant où le véhicule a quitté le cadre — c'est là que l'état bascule sur
 * le nouveau palier. DOIT tomber quand le garage est vide : plus tôt, et c'est
 * le nouveau véhicule qu'on verrait s'éloigner.
 */
export const RELEVE_BASCULE_MS =
  RELEVE_FERMETURE_MS + RELEVE_ATTENTE_MS + RELEVE_TRAJET_MS;

/** Instant où le nouveau véhicule est rangé et commence à ouvrir son coffre. */
export const RELEVE_ARRIVEE_MS =
  RELEVE_BASCULE_MS + RELEVE_ENTREDEUX_MS + RELEVE_TRAJET_MS;

export const RELEVE_DUREE_MS = RELEVE_ARRIVEE_MS + RELEVE_OUVERTURE_MS;

/** Point de fuite : loin, minuscule, au centre du fond de garage. */
export const RELEVE_CIBLE = { x: 0.5, y: 0.5, scale: 0.03 } as const;

/** Position et taille d'un véhicule sur le fond garage. */
export interface Geometrie {
  x: number;
  y: number;
  scale: number;
}

export interface EtatReleve {
  /** Où dessiner le véhicule, ou `null` quand le garage est vide. */
  geometrie: Geometrie | null;
  /** Opacité du véhicule (0 quand il est hors cadre). */
  opacite: number;
  /**
   * Le coffre doit-il être fermé ? Vrai de la fermeture initiale jusqu'à
   * l'arrivée : le véhicule ne roule jamais coffre ouvert.
   */
  coffreFerme: boolean;
  /** L'état du jeu doit-il déjà porter le nouveau palier ? */
  nouveauVehicule: boolean;
}

/** Interpolation douce (ease-in-out cubique), celle du départ en brocante. */
function adoucir(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function entre(depart: Geometrie, arrivee: Geometrie, t: number): Geometrie {
  const e = adoucir(t);
  return {
    x: depart.x + (arrivee.x - depart.x) * e,
    y: depart.y + (arrivee.y - depart.y) * e,
    scale: depart.scale + (arrivee.scale - depart.scale) * e,
  };
}

/**
 * Opacité pendant l'éloignement : pleine tant que le véhicule est lisible,
 * puis fondu sur le dernier tiers, quand il n'est plus qu'un point.
 */
function fonduEloignement(avance: number): number {
  const DEBUT_FONDU = 0.66;
  if (avance <= DEBUT_FONDU) return 1;
  if (avance >= 1) return 0;
  return Math.max(0, (1 - avance) / (1 - DEBUT_FONDU));
}

/**
 * État de la scène à `t` millisecondes du début de la séquence.
 *
 * `ancien` est la géométrie du véhicule possédé au moment du clic, `nouveau`
 * celle du véhicule acheté — elles diffèrent, chaque modèle ayant sa position
 * et son échelle propres sur le fond de garage.
 */
export function etatReleve(
  t: number,
  ancien: Geometrie,
  nouveau: Geometrie,
): EtatReleve {
  // Coffre qui se ferme, véhicule encore à sa place.
  if (t < RELEVE_FERMETURE_MS + RELEVE_ATTENTE_MS) {
    return {
      geometrie: ancien,
      opacite: 1,
      coffreFerme: true,
      nouveauVehicule: false,
    };
  }

  // Départ : l'ancien s'éloigne vers le point de fuite en s'effaçant.
  if (t < RELEVE_BASCULE_MS) {
    const avance =
      (t - RELEVE_FERMETURE_MS - RELEVE_ATTENTE_MS) / RELEVE_TRAJET_MS;
    return {
      geometrie: entre(ancien, RELEVE_CIBLE, avance),
      opacite: fonduEloignement(avance),
      coffreFerme: true,
      nouveauVehicule: false,
    };
  }

  // Garage vide : c'est ici que l'échange a lieu, à l'abri des regards.
  if (t < RELEVE_BASCULE_MS + RELEVE_ENTREDEUX_MS) {
    return {
      geometrie: null,
      opacite: 0,
      coffreFerme: true,
      nouveauVehicule: true,
    };
  }

  // Retour : le nouveau surgit du fond et se range en marche arrière — le
  // trajet du départ, parcouru à l'envers.
  if (t < RELEVE_ARRIVEE_MS) {
    const avance =
      (t - RELEVE_BASCULE_MS - RELEVE_ENTREDEUX_MS) / RELEVE_TRAJET_MS;
    return {
      geometrie: entre(RELEVE_CIBLE, nouveau, avance),
      opacite: fonduEloignement(1 - avance),
      coffreFerme: true,
      nouveauVehicule: true,
    };
  }

  // Rangé : le coffre s'ouvre, la séquence se termine.
  return {
    geometrie: nouveau,
    opacite: 1,
    coffreFerme: false,
    nouveauVehicule: true,
  };
}
