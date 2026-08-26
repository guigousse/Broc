import { ciblesPourNiveau } from "./echelle";
import type { TypePeriodique } from "./periodiques";
import type { CategorieObjet, ObjectifMission } from "@/types/game";

/** Les six formes qu'une quête périodique peut prendre. */
export type FormeQuete =
  | "objet"
  | "objetsRares"
  | "beneficeCumule"
  | "chiffreAffaires"
  | "profitVente"
  | "ventesCategorie";

/**
 * Famille d'une forme. Sert au garde-fou du lot hebdomadaire : sans au moins
 * une forme « vente », la semaine ne serait qu'une série de quotidiennes en
 * plus lent.
 */
export const FAMILLE: Record<FormeQuete, "chine" | "vente"> = {
  objet: "chine",
  objetsRares: "chine",
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
};

/**
 * Déduit la forme (au sens `ICONE_FORME`) depuis le type d'un objectif de
 * mission. Partagée par les deux cartes du carnet (chapitre courant, ligne
 * périodique) — c'est la même question des deux côtés : quelle icône
 * générique représente ce type d'objectif chiffré ? Les types hors périmètre
 * périodique (`restauration`, `valeurCollection`, `niveau`) n'ont pas de
 * forme — `null`, cadre vide plutôt qu'une exception : un chapitre ou une
 * quête périodique peut porter un de ces types, l'affichage ne doit pas se
 * briser pour autant.
 */
export function formeDepuisObjectif(type: ObjectifMission["type"]): FormeQuete | null {
  switch (type) {
    case "objetsRares":
      return "objetsRares";
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

/** Formes éligibles au tirage hebdomadaire (les six). */
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
}

/** Contenu d'une forme SANS objet nommé. */
export interface ContenuForme {
  objectifs: ObjectifMission[];
  recompenseArgent: number;
  /** Famille de gabarit de texte (cf. quetes/textes.ts). */
  gabaritCle: string;
  gabaritParams: ParamsGabarit;
}

/**
 * Construit le contenu d'une forme chiffrée. `null` si la forme est
 * inconstructible dans l'état courant (seul cas aujourd'hui : `ventesCategorie`
 * sans aucune catégorie accessible au joueur).
 *
 * La forme `objet` n'est PAS traitée ici : elle garde sa fabrique historique
 * dans `periodiques.ts`, qui choisit ses cibles dans le pool atteignable.
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

  switch (forme) {
    case "objetsRares": {
      const nombre =
        periode === "quotidienne" ? c.objetsRaresQuotidien : c.objetsRaresHebdo;
      return {
        objectifs: [{ type: "objetsRares", nombre }],
        recompenseArgent,
        gabaritCle: "rares",
        gabaritParams: { nombre },
      };
    }
    case "beneficeCumule":
      return {
        objectifs: [{ type: "beneficeCumule", montant: c.beneficeSemaine }],
        recompenseArgent,
        gabaritCle: "benefice",
        gabaritParams: { montant: c.beneficeSemaine },
      };
    case "chiffreAffaires":
      return {
        objectifs: [{ type: "ventesCumulees", montant: c.chiffreAffairesSemaine }],
        recompenseArgent,
        gabaritCle: "chiffre",
        gabaritParams: { montant: c.chiffreAffairesSemaine },
      };
    case "profitVente":
      return {
        objectifs: [{ type: "profitVente", montant: c.profitVenteUnique }],
        recompenseArgent,
        gabaritCle: "marge",
        gabaritParams: { montant: c.profitVenteUnique },
      };
    case "ventesCategorie": {
      if (categoriesDisponibles.length === 0) return null;
      const categorie =
        categoriesDisponibles[Math.floor(rng() * categoriesDisponibles.length)];
      const nombre = c.ventesCategorie;
      return {
        objectifs: [{ type: "ventesCategorie", categorie, nombre }],
        recompenseArgent,
        gabaritCle: "categorie",
        gabaritParams: { nombre, categorie },
      };
    }
  }
}
