import type { CategorieObjet } from "@/types/game";

/**
 * Un archétype définit la trame mécanique d'un type de client.
 * Chaque archétype donne ensuite naissance à plusieurs personnages distincts.
 */
export interface ClientArchetype {
  id: string;
  nom: string;
  ambianceDefault: string;
  appetitMin: number;
  appetitMax: number;
  /** Dureté de négociation 0–1 : 0 = pingre généreux, 1 = lowball implacable. */
  durete: number;
  /** Probabilité que ce client s'intéresse à plusieurs objets d'un coup. */
  chanceMulti: number;
  categoriesPreferees: CategorieObjet[];
  categoriesEvitees?: CategorieObjet[];
  /** Bonus prixMax pour les catégories préférées (défaut 0,3 = +30 %). */
  bonusPreference?: number;
  /** Malus prixMax pour les catégories évitées (défaut 0,2 = −20 %). */
  malusEvitement?: number;
}

/** Personnage concret instancié à partir d'un archétype. */
export interface ClientPersonnage {
  id: string;
  archetypeId: string;
  archetypeNom: string;
  nom: string;
  ambiance: string;
  appetitMin: number;
  appetitMax: number;
  durete: number;
  chanceMulti: number;
  categoriesPreferees: CategorieObjet[];
  categoriesEvitees: CategorieObjet[];
  bonusPreference: number;
  malusEvitement: number;
}

// ======================================================================
// 15 ARCHÉTYPES — chacun avec une "personnalité mécanique" cohérente
// ======================================================================

const ARCHETYPES: ClientArchetype[] = [
  {
    id: "retraite_chineur",
    nom: "Retraité chineur",
    ambianceDefault: "Compte chaque sou et soupèse chaque pièce.",
    appetitMin: 0.4,
    appetitMax: 0.7,
    durete: 0.7,
    chanceMulti: 0.1,
    categoriesPreferees: [],
  },
  {
    id: "passionnee_artdeco",
    nom: "Passionnée d'Art Déco",
    ambianceDefault: "S'extasie devant les belles patines.",
    appetitMin: 0.9,
    appetitMax: 1.3,
    durete: 0.2,
    chanceMulti: 0.2,
    categoriesPreferees: ["Maison", "Mode"],
    bonusPreference: 0.35,
  },
  {
    id: "brocanteur_concurrent",
    nom: "Brocanteur concurrent",
    ambianceDefault: "Connaît la valeur de chaque objet et le montre.",
    appetitMin: 0.4,
    appetitMax: 0.7,
    durete: 0.9,
    chanceMulti: 0.05,
    categoriesPreferees: [],
  },
  {
    id: "collectionneur_musique",
    nom: "Collectionneur de musique",
    ambianceDefault: "Cherche LA pièce qui complétera sa collection.",
    appetitMin: 0.5,
    appetitMax: 0.9,
    durete: 0.5,
    chanceMulti: 0.35,
    categoriesPreferees: ["Musique"],
    bonusPreference: 0.5,
  },
  {
    id: "gamer_nostalgique",
    nom: "Gamer nostalgique",
    ambianceDefault: "Revit son enfance les yeux brillants.",
    appetitMin: 0.5,
    appetitMax: 0.9,
    durete: 0.4,
    chanceMulti: 0.3,
    categoriesPreferees: ["Jeux & Loisirs"],
    bonusPreference: 0.5,
  },
  {
    id: "bibliophile",
    nom: "Bibliophile",
    ambianceDefault: "Caresse les couvertures, lit les premières pages.",
    appetitMin: 0.7,
    appetitMax: 1.1,
    durete: 0.3,
    chanceMulti: 0.3,
    categoriesPreferees: ["Livres & Papeterie"],
    bonusPreference: 0.4,
  },
  {
    id: "bricoleur_dimanche",
    nom: "Bricoleur du dimanche",
    ambianceDefault: "Cherche de quoi finir son chantier.",
    appetitMin: 0.6,
    appetitMax: 1.0,
    durete: 0.5,
    chanceMulti: 0.4,
    categoriesPreferees: ["Bricolage"],
    bonusPreference: 0.3,
  },
  {
    id: "etudiant_fauche",
    nom: "Étudiant fauché",
    ambianceDefault: "Tâte ses poches, regarde plus qu'il n'achète.",
    appetitMin: 0.3,
    appetitMax: 0.6,
    durete: 0.6,
    chanceMulti: 0.15,
    categoriesPreferees: [],
  },
  {
    id: "snob_bourgeois",
    nom: "Snob bourgeois",
    ambianceDefault: "Lève le sourcil devant tout ce qui n'est pas reluisant.",
    appetitMin: 1.0,
    appetitMax: 1.5,
    durete: 0.3,
    chanceMulti: 0.1,
    categoriesPreferees: ["Maison", "Mode"],
    categoriesEvitees: ["Bricolage"],
    bonusPreference: 0.25,
    malusEvitement: 0.4,
  },
  {
    id: "touriste_perdu",
    nom: "Touriste perdu",
    ambianceDefault: "Tout l'amuse, rien ne lui est familier.",
    appetitMin: 0.7,
    appetitMax: 1.4,
    durete: 0.1,
    chanceMulti: 0.5,
    categoriesPreferees: [],
  },
  {
    id: "famille_dimanche",
    nom: "Famille du dimanche",
    ambianceDefault: "Les enfants tirent les manches, les parents temporisent.",
    appetitMin: 0.5,
    appetitMax: 0.9,
    durete: 0.5,
    chanceMulti: 0.55,
    categoriesPreferees: ["Jeux & Loisirs"],
    bonusPreference: 0.25,
  },
  {
    id: "decorateur",
    nom: "Décorateur d'intérieur",
    ambianceDefault: "Photographie, mesure, projette dans son salon.",
    appetitMin: 0.9,
    appetitMax: 1.4,
    durete: 0.4,
    chanceMulti: 0.25,
    categoriesPreferees: ["Maison"],
    bonusPreference: 0.5,
  },
  {
    id: "amateur_vintage",
    nom: "Amateur de vintage",
    ambianceDefault: "S'arrête sur tout ce qui sent les années 70-80.",
    appetitMin: 0.8,
    appetitMax: 1.3,
    durete: 0.3,
    chanceMulti: 0.3,
    categoriesPreferees: ["Mode", "Musique"],
    bonusPreference: 0.4,
  },
  {
    id: "notable_curieux",
    nom: "Notable curieux",
    ambianceDefault: "Politiquement courtois, le portefeuille discret.",
    appetitMin: 1.0,
    appetitMax: 1.5,
    durete: 0.2,
    chanceMulti: 0.25,
    categoriesPreferees: [],
  },
  {
    id: "opportuniste",
    nom: "Opportuniste flairant",
    ambianceDefault: "Flaire l'erreur d'étiquetage et fond dessus.",
    appetitMin: 0.5,
    appetitMax: 1.0,
    durete: 0.8,
    chanceMulti: 0.3,
    categoriesPreferees: [],
  },
];

// ======================================================================
// PERSONNAGES — 3 incarnations par archétype
// ======================================================================

interface PersonnageSource {
  nom: string;
  ambiance?: string;
}

function makePersonnages(
  arch: ClientArchetype,
  sources: PersonnageSource[],
): ClientPersonnage[] {
  return sources.map((src, i) => ({
    id: `${arch.id}.${i}`,
    archetypeId: arch.id,
    archetypeNom: arch.nom,
    nom: src.nom,
    ambiance: src.ambiance ?? arch.ambianceDefault,
    appetitMin: arch.appetitMin,
    appetitMax: arch.appetitMax,
    durete: arch.durete,
    chanceMulti: arch.chanceMulti,
    categoriesPreferees: arch.categoriesPreferees,
    categoriesEvitees: arch.categoriesEvitees ?? [],
    bonusPreference: arch.bonusPreference ?? 0.3,
    malusEvitement: arch.malusEvitement ?? 0.2,
  }));
}

export const ALL_PERSONNAGES: ClientPersonnage[] = [
  ...makePersonnages(ARCHETYPES[0], [
    { nom: "Monsieur Durand", ambiance: "Compte chaque sou en regardant par-dessus ses lunettes." },
    { nom: "Madame Rivoire", ambiance: "Demande systématiquement « c'est votre dernier prix ? »." },
    { nom: "Pierre du quartier", ambiance: "Vient surtout pour bavarder, achète peu." },
  ]),
  ...makePersonnages(ARCHETYPES[1], [
    { nom: "Léonie de Tourcoing", ambiance: "S'exclame doucement devant chaque belle patine." },
    { nom: "Camille Mercier", ambiance: "Photographie discrètement les pièces qui l'intéressent." },
    { nom: "Madame Renaud", ambiance: "Caresse le bois ouvragé d'un doigt connaisseur." },
  ]),
  ...makePersonnages(ARCHETYPES[2], [
    { nom: "Maxime du puçier", ambiance: "Ne sourit jamais, propose toujours 30 % en dessous." },
    { nom: "Hugo le revendeur", ambiance: "Connaît votre stand et vos prix par cœur." },
    { nom: "Jean-Claude « la cote »", ambiance: "Cite des ventes aux enchères pour justifier ses lowballs." },
  ]),
  ...makePersonnages(ARCHETYPES[3], [
    { nom: "Bertrand le mélomane", ambiance: "Renifle chaque pochette de vinyle avec respect." },
    { nom: "Sophie 33-tours", ambiance: "Repart toujours avec deux ou trois disques sous le bras." },
    { nom: "Vinyle Vincent", ambiance: "Connaît tous les pressages, tous les labels." },
  ]),
  ...makePersonnages(ARCHETYPES[4], [
    { nom: "Léo le rétro", ambiance: "S'attendrit devant chaque cartouche d'enfance." },
    { nom: "Thomas le pixel", ambiance: "Vérifie l'état des manettes, soupire de bonheur." },
    { nom: "Marina la geek", ambiance: "Cherche un cadeau pour son frère collectionneur." },
  ]),
  ...makePersonnages(ARCHETYPES[5], [
    { nom: "Hélène la bibliothécaire", ambiance: "Vérifie les pages manquantes, sentencieuse." },
    { nom: "Professeur Lambert", ambiance: "Furète parmi les éditions originales." },
    { nom: "Émilie au stylo plume", ambiance: "Cherche du papier ancien et des plumes Sergent-Major." },
  ]),
  ...makePersonnages(ARCHETYPES[6], [
    { nom: "Marcel le bricoleur", ambiance: "Sent l'odeur de la sciure depuis trois mètres." },
    { nom: "Patrice à la perceuse", ambiance: "Demande systématiquement si ça marche encore." },
    { nom: "Jacques aux pinces", ambiance: "Inspecte chaque outil comme un chirurgien." },
  ]),
  ...makePersonnages(ARCHETYPES[7], [
    { nom: "Théo en stage", ambiance: "Regarde longuement, tâte ses poches, repose." },
    { nom: "Anaïs sans le sou", ambiance: "Négocie comme s'il y avait sa vie en jeu." },
    { nom: "Yanis le bohème", ambiance: "Veut tout, peut s'offrir un dixième." },
  ]),
  ...makePersonnages(ARCHETYPES[8], [
    { nom: "Charles-Henri de B.", ambiance: "Ne salue pas le commerçant, examine du bout des doigts." },
    { nom: "Madame de Lacombe", ambiance: "Lorgne les pièces sans daigner les toucher." },
    { nom: "Aristide père", ambiance: "Refuse poliment tout ce qui semble vulgaire." },
  ]),
  ...makePersonnages(ARCHETYPES[9], [
    { nom: "Karl le Berlinois", ambiance: "S'enthousiasme dans un français hésitant." },
    { nom: "Maria de Milan", ambiance: "Compare les prix au cours du jour, surprise et conquise." },
    { nom: "Hiroshi & Yuka", ambiance: "Tendent la main vers tout ce qui brille un peu." },
  ]),
  ...makePersonnages(ARCHETYPES[10], [
    { nom: "Famille Martinez", ambiance: "Les enfants s'agrippent à tout ce qui fait du bruit." },
    { nom: "Madame Petit et son fils", ambiance: "Cherchent un petit cadeau pour la grand-mère." },
    { nom: "Les Garnier", ambiance: "Partent rarement les mains vides quand il y a du jouet." },
  ]),
  ...makePersonnages(ARCHETYPES[11], [
    { nom: "Sylvain le designer", ambiance: "Visualise déjà la pièce dans un loft à Lyon." },
    { nom: "Bérénice la déco", ambiance: "Snape, prend ses cotes, repart avec." },
    { nom: "Olivier rénovateur", ambiance: "Cherche du caractère pour ses chantiers." },
  ]),
  ...makePersonnages(ARCHETYPES[12], [
    { nom: "Inès la rockabilly", ambiance: "Cherche une veste en cuir et un 45-tours." },
    { nom: "Théo le mod", ambiance: "Tape du pied sur un Téléphone qui tourne dans sa tête." },
    { nom: "Clara en jean", ambiance: "Essaie tout, repart avec deux pièces." },
  ]),
  ...makePersonnages(ARCHETYPES[13], [
    { nom: "Maître Lefèvre", ambiance: "Politesse exquise, portefeuille discret mais profond." },
    { nom: "Docteur Roux", ambiance: "Curieux de tout, parle latin avec les livres." },
    { nom: "Madame la Comtesse", ambiance: "Vient pour passer le temps, repart pour le plaisir." },
  ]),
  ...makePersonnages(ARCHETYPES[14], [
    { nom: "Sébastien le malin", ambiance: "Pointe du doigt vos prix les plus tendres." },
    { nom: "Rachida l'œil", ambiance: "Repère l'erreur d'étiquette à dix pas." },
    { nom: "Vincent du Marché", ambiance: "Surprend toujours par un prix très bas… qui passe." },
  ]),
];

/** Sélectionne N personnages au hasard, sans répétition. */
export function genererPoolClients(taille: number): ClientPersonnage[] {
  const copy = [...ALL_PERSONNAGES];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(taille, copy.length));
}
