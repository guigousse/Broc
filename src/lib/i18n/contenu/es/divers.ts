/**
 * Overlay ES des petits domaines (spec i18n §2, SP3) : camions (clé `visuelId`),
 * paliers de stockage (clé = niveau en chaîne) et célébrités (clé = chaîne FR
 * canonique de `CELEBRITES`, car `CelebriteEvenement.nom` persiste la chaîne).
 * Résolu À L'AFFICHAGE, fallback FR. « Rogers » = nom de modèle → conservé ;
 * « Break »/« Utilitaire » sont descriptifs → traduits. Titres mondains traduits,
 * noms propres fictifs d'époque conservés tels quels.
 */
export const DIVERS_ES = {
  camions: { rogers: "Rogers", break: "Ranchera", utilitaire: "Furgoneta" },
  stockage: { "1": "Garaje", "2": "Sótano", "3": "Almacén" },
  celebrites: {
    "un grand couturier parisien": "un gran modisto parisino",
    "une icône du cinéma des années 60": "un icono del cine de los años 60",
    "un célèbre antiquaire de la rive gauche":
      "un célebre anticuario de la orilla izquierda",
    "une héritière mondaine": "una heredera de la alta sociedad",
    "un collectionneur excentrique": "un coleccionista excéntrico",
    "Madame de Saint-Marceaux": "Madame de Saint-Marceaux",
    "Le Duc de Brissac": "el Duque de Brissac",
    "Le Comte de Castiglione": "el Conde de Castiglione",
    "Le Marquis d'Hautpoul": "el Marqués de Hautpoul",
    "L'Ambassadeur de Belgique": "el Embajador de Bélgica",
    "Le commissaire-priseur de l'Hôtel des Ventes":
      "el subastador del Hôtel des Ventes",
    "L'expert du Petit Palais": "el experto del Petit Palais",
    "un magnat de l'industrie du luxe": "un magnate de la industria del lujo",
    "une actrice de la Nouvelle Vague": "una actriz de la Nouvelle Vague",
    "une diva de l'opéra à la retraite": "una diva de la ópera jubilada",
    "un mécène discret": "un mecenas discreto",
    "La Baronne de Villemorin": "la Baronesa de Villemorin",
    "Lady Westmorland": "Lady Westmorland",
    "Le Baron de R.": "el Barón de R.",
  },
} satisfies {
  camions: Record<string, string>;
  stockage: Record<string, string>;
  celebrites: Record<string, string>;
};
