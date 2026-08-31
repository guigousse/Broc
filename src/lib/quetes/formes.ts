import { ciblesPourNiveau } from "./echelle";
import type { TypePeriodique } from "./periodiques";
import type { CategorieObjet, EtatObjet, ObjectifMission, PrimeVariable } from "@/types/game";
import { JETONS_LEGENDAIRE, TAUX_PRIME_LEGENDAIRE } from "@/lib/recompenses";

/** Les formes qu'une quête périodique peut prendre. */
export type FormeQuete =
  | "objet"
  | "objetsRares"
  | "objetLegendaire"
  | "restauration"
  | "beneficeCumule"
  | "chiffreAffaires"
  | "profitVente"
  | "ventesCategorie";

/**
 * Famille d'une forme. Sert au garde-fou du lot hebdomadaire (sans au moins
 * une forme « vente », la semaine ne serait qu'une série de quotidiennes en
 * plus lent) ET à celui du lot quotidien (au plus UNE forme « vente » parmi
 * les deux tirées, sans quoi la journée cesserait d'être tournée vers la
 * chine).
 */
export const FAMILLE: Record<FormeQuete, "chine" | "vente" | "atelier"> = {
  objet: "chine",
  objetsRares: "chine",
  objetLegendaire: "chine",
  restauration: "atelier",
  beneficeCumule: "vente",
  chiffreAffaires: "vente",
  profitVente: "vente",
  ventesCategorie: "vente",
};

/**
 * Icône `lucide-react` de chaque forme, consommée par le carnet (chantier ②).
 * `objet` n'en a pas : cette forme s'affiche avec la PHOTO de l'objet demandé.
 */
export const ICONE_FORME: Record<FormeQuete, string | null> = {
  objet: null,
  objetsRares: "Gem",
  // Le bénéfice est une courbe qui monte ; le chiffre d'affaires est le
  // ticket de caisse — ce qui est encaissé, marge comprise. Les deux formes
  // partageaient `TrendingUp` : deux lignes hebdomadaires indiscernables à
  // l'œil, l'icône étant le gros visuel de gauche de la carte.
  beneficeCumule: "TrendingUp",
  chiffreAffaires: "Receipt",
  profitVente: "Coins",
  ventesCategorie: "Package",
  // La couronne dit « pièce d'exception » sans redire « rare » : `Gem` est
  // déjà pris par objetsRares, et les deux lignes peuvent coexister le même jour.
  objetLegendaire: "Crown",
  restauration: "Hammer",
};

/**
 * Déduit la forme (au sens `ICONE_FORME`) depuis le type d'un objectif de
 * mission. Partagée par les deux cartes du carnet (chapitre courant, ligne
 * périodique) — c'est la même question des deux côtés : quelle icône
 * générique représente ce type d'objectif chiffré ? Les types hors périmètre
 * périodique (`valeurCollection`, `niveau`) n'ont pas de forme — `null`,
 * cadre vide plutôt qu'une exception : un chapitre peut porter un de ces
 * types, l'affichage ne doit pas se briser pour autant.
 */
export function formeDepuisObjectif(type: ObjectifMission["type"]): FormeQuete | null {
  switch (type) {
    case "objetsRares":
      return "objetsRares";
    case "objetLegendaire":
      return "objetLegendaire";
    case "restauration":
      return "restauration";
    case "beneficeCumule":
      return "beneficeCumule";
    case "ventesCumulees":
      return "chiffreAffaires";
    case "profitVente":
      return "profitVente";
    case "ventesCategorie":
      return "ventesCategorie";
    default:
      return null;
  }
}

/** Formes éligibles au tirage hebdomadaire. Volontairement PAS élargi aux
 *  deux formes quotidiennes neuves — cf. « Hors périmètre » de la spec. */
export const FORMES_HEBDOMADAIRES: FormeQuete[] = [
  "objet",
  "objetsRares",
  "beneficeCumule",
  "chiffreAffaires",
  "profitVente",
  "ventesCategorie",
];

/** Paramètres interpolés dans le texte de la quête. */
export interface ParamsGabarit {
  nombre?: number;
  montant?: number;
  categorie?: CategorieObjet;
  /** État minimum, pour la marque `{etat}` (forme `restauration`). */
  etatMin?: EtatObjet;
}

/** Contenu d'une forme SANS objet nommé. */
export interface ContenuForme {
  objectifs: ObjectifMission[];
  recompenseArgent: number;
  /** Famille de gabarit de texte (cf. quetes/textes.ts). */
  gabaritCle: string;
  gabaritParams: ParamsGabarit;
  /** Jetons Bazar, si la forme déroge au tarif de sa période. */
  jetons?: number;
  /** Prime résolue à la livraison (cf. lib/recompenses). */
  primeVariable?: PrimeVariable;
}

/**
 * Construit le contenu d'une forme chiffrée. `null` si la forme est
 * inconstructible dans l'état courant (seul cas aujourd'hui : `ventesCategorie`
 * sans aucune catégorie accessible au joueur).
 *
 * La forme `objet` n'est PAS traitée ici : elle garde sa fabrique historique
 * dans `periodiques.ts`, qui choisit ses cibles dans le pool atteignable.
 *
 * Les formes d'argent (`beneficeCumule`, `chiffreAffaires`, `profitVente`,
 * `ventesCategorie`) lisent un barème DIFFÉRENT selon la période — cible
 * quotidienne réduite ET clé de gabarit dédiée (`"...Jour"`), pour que le
 * texte annonce bien « aujourd'hui » plutôt que « cette semaine ».
 */
export function contenuFormeChiffree(
  forme: Exclude<FormeQuete, "objet">,
  periode: TypePeriodique,
  niveau: number,
  categoriesDisponibles: CategorieObjet[],
  rng: () => number,
): ContenuForme | null {
  const c = ciblesPourNiveau(niveau);
  const recompenseArgent =
    periode === "quotidienne" ? c.recompenseQuotidienne : c.recompenseHebdo;
  const jour = periode === "quotidienne";

  switch (forme) {
    case "objetsRares": {
      const nombre = jour ? c.objetsRaresQuotidien : c.objetsRaresHebdo;
      return {
        objectifs: [{ type: "objetsRares", nombre }],
        recompenseArgent,
        gabaritCle: "rares",
        gabaritParams: { nombre },
      };
    }
    case "objetLegendaire":
      // Une seule pièce suffit : à 0,8 % par objet tiré au tier 4, en demander
      // deux reviendrait à écrire une quête qu'on ne réussit jamais.
      return {
        objectifs: [{ type: "objetLegendaire", nombre: 1 }],
        recompenseArgent,
        gabaritCle: "legendaire",
        gabaritParams: {},
        jetons: JETONS_LEGENDAIRE,
        primeVariable: { type: "pourcentageLegendaire", taux: TAUX_PRIME_LEGENDAIRE },
      };
    case "restauration": {
      const etatMin = c.restaurationEtatMin;
      return {
        objectifs: [{ type: "restauration", etatMin }],
        recompenseArgent,
        gabaritCle: "restauration",
        gabaritParams: { etatMin },
      };
    }
    case "beneficeCumule": {
      const montant = jour ? c.beneficeJour : c.beneficeSemaine;
      return {
        objectifs: [{ type: "beneficeCumule", montant }],
        recompenseArgent,
        gabaritCle: jour ? "beneficeJour" : "benefice",
        gabaritParams: { montant },
      };
    }
    case "chiffreAffaires": {
      const montant = jour ? c.chiffreAffairesJour : c.chiffreAffairesSemaine;
      return {
        objectifs: [{ type: "ventesCumulees", montant }],
        recompenseArgent,
        gabaritCle: jour ? "chiffreJour" : "chiffre",
        gabaritParams: { montant },
      };
    }
    case "profitVente": {
      const montant = jour ? c.profitVenteJour : c.profitVenteUnique;
      return {
        objectifs: [{ type: "profitVente", montant }],
        recompenseArgent,
        gabaritCle: jour ? "margeJour" : "marge",
        gabaritParams: { montant },
      };
    }
    case "ventesCategorie": {
      if (categoriesDisponibles.length === 0) return null;
      const categorie =
        categoriesDisponibles[Math.floor(rng() * categoriesDisponibles.length)];
      const nombre = jour ? c.ventesCategorieJour : c.ventesCategorie;
      return {
        objectifs: [{ type: "ventesCategorie", categorie, nombre }],
        recompenseArgent,
        gabaritCle: jour ? "categorieJour" : "categorie",
        gabaritParams: { nombre, categorie },
      };
    }
  }
}
