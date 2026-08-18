import type { GenrePersona } from "@/types/game";

/**
 * Pool de noms de célébrités susceptibles d'être annoncées à une brocante.
 * Personnages FICTIFS et titres mondains génériques uniquement (aucune
 * personnalité réelle ni marque déposée), pour éviter tout problème de droit
 * à l'image ou de marque.
 */
export const CELEBRITES: string[] = [
  "un grand couturier parisien",
  "une icône du cinéma des années 60",
  "un célèbre antiquaire de la rive gauche",
  "une héritière mondaine",
  "un collectionneur excentrique",
  "Madame de Saint-Marceaux",
  "Le Duc de Brissac",
  "Le Comte de Castiglione",
  "Le Marquis d'Hautpoul",
  "L'Ambassadeur de Belgique",
  "Le commissaire-priseur de l'Hôtel des Ventes",
  "L'expert du Petit Palais",
  "un magnat de l'industrie du luxe",
  "une actrice de la Nouvelle Vague",
  "une diva de l'opéra à la retraite",
  "un mécène discret",
  "La Baronne de Villemorin",
  "Lady Westmorland",
  "Le Baron de R.",
];

/**
 * Genre de chaque célébrité — table à part plutôt qu'un champ sur l'entrée,
 * car `CelebriteEvenement.nom` PERSISTE la chaîne FR en sauvegarde : elle est
 * la clé canonique, ici comme dans les overlays de traduction.
 */
export const GENRE_CELEBRITE: Record<string, GenrePersona> = {
  "un grand couturier parisien": "m",
  "une icône du cinéma des années 60": "f",
  "un célèbre antiquaire de la rive gauche": "m",
  "une héritière mondaine": "f",
  "un collectionneur excentrique": "m",
  "Madame de Saint-Marceaux": "f",
  "Le Duc de Brissac": "m",
  "Le Comte de Castiglione": "m",
  "Le Marquis d'Hautpoul": "m",
  "L'Ambassadeur de Belgique": "m",
  "Le commissaire-priseur de l'Hôtel des Ventes": "m",
  "L'expert du Petit Palais": "m",
  "un magnat de l'industrie du luxe": "m",
  "une actrice de la Nouvelle Vague": "f",
  "une diva de l'opéra à la retraite": "f",
  "un mécène discret": "m",
  "La Baronne de Villemorin": "f",
  "Lady Westmorland": "f",
  "Le Baron de R.": "m",
};
