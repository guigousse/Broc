import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/**
 * Traduction À L'AFFICHAGE des unions internes persistées (EtatObjet,
 * Rarete). Les valeurs de save/logique ne changent JAMAIS (règle d'or de
 * la spec i18n) — seul le libellé rendu passe par le dictionnaire.
 */
export function libelleEtat(etat: EtatObjet, d: DictionnaireUI): string {
  switch (etat) {
    case "Mauvais":
      return d.etats.mauvais;
    case "Bon":
      return d.etats.bon;
    case "Très bon":
      return d.etats.tresBon;
    case "Pristin état":
      return d.etats.pristin;
  }
}

export function libelleRarete(rarete: Rarete, d: DictionnaireUI): string {
  switch (rarete) {
    case "commun":
      return d.raretes.commun;
    case "rare":
      return d.raretes.rare;
    case "legendaire":
      return d.raretes.legendaire;
  }
}

export function libelleCategorie(cat: CategorieObjet, d: DictionnaireUI): string {
  switch (cat) {
    case "Musique":
      return d.categories.musique;
    case "Jeux & Loisirs":
      return d.categories.jeuxLoisirs;
    case "Livres & Papeterie":
      return d.categories.livresPapeterie;
    case "Mode":
      return d.categories.mode;
    case "Maison":
      return d.categories.maison;
    case "Objets d'art":
      return d.categories.objetsArt;
    case "Bricolage":
      return d.categories.bricolage;
  }
}
