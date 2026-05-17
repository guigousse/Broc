import type { CategorieObjet } from "@/types/game";

export interface ObjetTemplate {
  nom: string;
  categorie: CategorieObjet;
  /** Valeur de référence si "Comme neuf" */
  prixRefBase: number;
}

export const OBJET_TEMPLATES: ObjetTemplate[] = [
  // Musique
  { nom: "Vinyle Pink Floyd 'The Wall'", categorie: "Musique", prixRefBase: 45 },
  { nom: "Vinyle Téléphone 'Dure Limite'", categorie: "Musique", prixRefBase: 20 },
  { nom: "33 tours de jazz inconnu", categorie: "Musique", prixRefBase: 8 },
  { nom: "Coffret CD Nirvana 'In Utero'", categorie: "Musique", prixRefBase: 18 },
  { nom: "Harmonica chromatique Hohner", categorie: "Musique", prixRefBase: 35 },
  { nom: "Vieille guitare classique", categorie: "Musique", prixRefBase: 70 },

  // Jeux & Loisirs
  { nom: "Cartouche Super Mario Bros", categorie: "Jeux & Loisirs", prixRefBase: 80 },
  { nom: "Manette Megadrive", categorie: "Jeux & Loisirs", prixRefBase: 35 },
  { nom: "Game Boy Color violette", categorie: "Jeux & Loisirs", prixRefBase: 90 },
  { nom: "Jeu PS1 'Crash Bandicoot'", categorie: "Jeux & Loisirs", prixRefBase: 40 },
  { nom: "Boîte 'Risk' édition 1992", categorie: "Jeux & Loisirs", prixRefBase: 25 },
  { nom: "Lot cartes Pokémon 1ère édition", categorie: "Jeux & Loisirs", prixRefBase: 220 },
  { nom: "Figurine Star Wars Kenner 1978", categorie: "Jeux & Loisirs", prixRefBase: 55 },

  // Livres & Papiers
  { nom: "Roman 'Le Comte de Monte-Cristo'", categorie: "Livres & Papeterie", prixRefBase: 10 },
  { nom: "BD Tintin 'On a marché sur la Lune'", categorie: "Livres & Papeterie", prixRefBase: 22 },
  { nom: "Lot de magazines Paris-Match 70s", categorie: "Livres & Papeterie", prixRefBase: 14 },
  { nom: "Cartes postales anciennes (boîte)", categorie: "Livres & Papeterie", prixRefBase: 9 },

  // Mode
  { nom: "Veste en jean délavée", categorie: "Mode", prixRefBase: 15 },
  { nom: "Blouson cuir vintage", categorie: "Mode", prixRefBase: 60 },
  { nom: "Sac à main en cuir Lancel", categorie: "Mode", prixRefBase: 50 },
  { nom: "Broche émaillée Art Déco", categorie: "Mode", prixRefBase: 28 },
  { nom: "Chapeau de feutre années 50", categorie: "Mode", prixRefBase: 22 },

  // Maison
  { nom: "Petite figurine en porcelaine", categorie: "Maison", prixRefBase: 12 },
  { nom: "Boîte à musique ancienne", categorie: "Maison", prixRefBase: 35 },
  { nom: "Statuette africaine en bois", categorie: "Maison", prixRefBase: 25 },
  { nom: "Service à thé en faïence", categorie: "Maison", prixRefBase: 30 },
  { nom: "Lot de 6 verres à pied", categorie: "Maison", prixRefBase: 18 },
  { nom: "Lampe de bureau Art Déco", categorie: "Maison", prixRefBase: 65 },
  { nom: "Miroir doré à fronton", categorie: "Maison", prixRefBase: 80 },
  { nom: "Tabouret en bois patiné", categorie: "Maison", prixRefBase: 28 },

  // Outils & Mécanique
  { nom: "Marteau de menuisier", categorie: "Bricolage", prixRefBase: 8 },
  { nom: "Boîte à outils complète", categorie: "Bricolage", prixRefBase: 45 },
  { nom: "Établi pliant ancien", categorie: "Bricolage", prixRefBase: 55 },
  { nom: "Pince à étirer en cuivre", categorie: "Bricolage", prixRefBase: 12 },
];
