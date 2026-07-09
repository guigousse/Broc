import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";
import type { FamilleDeblocage } from "@/data/deblocagesNiveau";
import type { ActiveId } from "@/lib/actives";
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

/** Libellé localisé d'une famille de déblocage (union fermée de 5). */
export function libelleFamille(f: FamilleDeblocage, d: DictionnaireUI): string {
  switch (f) {
    case "jalon":
      return d.familles.jalon;
    case "contenu":
      return d.familles.contenu;
    case "economie":
      return d.familles.economie;
    case "confort":
      return d.familles.confort;
    case "active":
      return d.familles.active;
  }
}

/**
 * Nom localisé d'une active (HUD de chine/vente). Cohérence obligatoire avec
 * les titres de déblocage EN/ES (`contenu/{en,es}/deblocages.ts`) : ce sont
 * les MÊMES noms d'active déjà actés là-bas, réutilisés ici.
 */
export function libelleActive(id: ActiveId, d: DictionnaireUI): string {
  switch (id) {
    case "flair":
      return d.actives.flair;
    case "lotGarni":
      return d.actives.lotGarni;
    case "fouille":
      return d.actives.fouille;
    case "boniment":
      return d.actives.boniment;
    case "tchatche":
      return d.actives.tchatche;
    case "criee":
      return d.actives.criee;
    case "diplomate":
      return d.actives.diplomate;
  }
}
