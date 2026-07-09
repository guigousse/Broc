/**
 * Overlay EN des petits domaines (spec i18n §2, SP3) : camions (clé `visuelId`),
 * paliers de stockage (clé = niveau en chaîne) et célébrités (clé = chaîne FR
 * canonique de `CELEBRITES`, car `CelebriteEvenement.nom` persiste la chaîne).
 * Résolu À L'AFFICHAGE, fallback FR. « Rogers » = nom de modèle → conservé ;
 * « Break »/« Utilitaire » sont descriptifs → traduits. Titres mondains traduits,
 * noms propres fictifs d'époque conservés tels quels.
 */
export const DIVERS_EN = {
  camions: { rogers: "Rogers", break: "Estate wagon", utilitaire: "Panel van" },
  stockage: { "1": "Garage", "2": "Cellar", "3": "Warehouse" },
  celebrites: {
    "un grand couturier parisien": "a famous Parisian couturier",
    "une icône du cinéma des années 60": "a 1960s movie icon",
    "un célèbre antiquaire de la rive gauche": "a famous Left Bank antique dealer",
    "une héritière mondaine": "a society heiress",
    "un collectionneur excentrique": "an eccentric collector",
    "Madame de Saint-Marceaux": "Madame de Saint-Marceaux",
    "Le Duc de Brissac": "the Duke of Brissac",
    "Le Comte de Castiglione": "the Count of Castiglione",
    "Le Marquis d'Hautpoul": "the Marquess of Hautpoul",
    "L'Ambassadeur de Belgique": "the Ambassador of Belgium",
    "Le commissaire-priseur de l'Hôtel des Ventes":
      "the auctioneer of the Hôtel des Ventes",
    "L'expert du Petit Palais": "the Petit Palais expert",
    "un magnat de l'industrie du luxe": "a luxury-industry magnate",
    "une actrice de la Nouvelle Vague": "a New Wave actress",
    "une diva de l'opéra à la retraite": "a retired opera diva",
    "un mécène discret": "a discreet patron of the arts",
    "La Baronne de Villemorin": "the Baroness of Villemorin",
    "Lady Westmorland": "Lady Westmorland",
    "Le Baron de R.": "the Baron de R.",
  },
} satisfies {
  camions: Record<string, string>;
  stockage: Record<string, string>;
  celebrites: Record<string, string>;
};
