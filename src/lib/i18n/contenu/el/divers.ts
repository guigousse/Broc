/**
 * Overlay EL (grec) des petits domaines (spec i18n §2, ajout grec task 4) :
 * camions (clé `visuelId`), paliers de stockage (clé = niveau en chaîne) et
 * célébrités (clé = chaîne FR canonique de `CELEBRITES`, car
 * `CelebriteEvenement.nom` persiste la chaîne). Résolu À L'AFFICHAGE, fallback
 * FR. « Rogers » = nom de modèle → conservé ; les autres camions sont
 * descriptifs → traduits. Titres nobiliaires traduits (comme le fait l'EN),
 * noms propres fictifs d'époque conservés tels quels. Traduit depuis le FR
 * canonique, EN en référence croisée.
 */
export const DIVERS_EL = {
  camions: { rogers: "Rogers", break: "Στέισον βάγκον", utilitaire: "Φορτηγάκι" },
  stockage: { "1": "Γκαράζ", "2": "Υπόγειο", "3": "Αποθήκη" },
  celebrites: {
    "un grand couturier parisien": "ένας μεγάλος σχεδιαστής μόδας του Παρισιού",
    "une icône du cinéma des années 60": "ένα είδωλο του κινηματογράφου της δεκαετίας του '60",
    "un célèbre antiquaire de la rive gauche": "ένας διάσημος αντικέρης της Αριστερής Όχθης",
    "une héritière mondaine": "μια κληρονόμος της υψηλής κοινωνίας",
    "un collectionneur excentrique": "ένας εκκεντρικός συλλέκτης",
    "Madame de Saint-Marceaux": "Madame de Saint-Marceaux",
    "Le Duc de Brissac": "ο Δούκας του Brissac",
    "Le Comte de Castiglione": "ο Κόμης του Castiglione",
    "Le Marquis d'Hautpoul": "ο Μαρκήσιος του Hautpoul",
    "L'Ambassadeur de Belgique": "ο Πρέσβης του Βελγίου",
    "Le commissaire-priseur de l'Hôtel des Ventes":
      "ο δημοπράτης του Hôtel des Ventes",
    "L'expert du Petit Palais": "ο ειδικός του Petit Palais",
    "un magnat de l'industrie du luxe": "ένας μεγιστάνας της βιομηχανίας πολυτελείας",
    "une actrice de la Nouvelle Vague": "μια ηθοποιός της Nouvelle Vague",
    "une diva de l'opéra à la retraite": "μια συνταξιούχος ντίβα της όπερας",
    "un mécène discret": "ένας διακριτικός μαικήνας",
    "La Baronne de Villemorin": "η Βαρόνη του Villemorin",
    "Lady Westmorland": "Lady Westmorland",
    "Le Baron de R.": "ο Βαρόνος de R.",
  },
} satisfies {
  camions: Record<string, string>;
  stockage: Record<string, string>;
  celebrites: Record<string, string>;
};
