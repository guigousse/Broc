/** Textes affichés sur les visuels App Store. Module pur. */

export const TITRES = {
  chiner: {
    fr: "Dénichez des trésors oubliés",
    en: "Uncover forgotten treasures",
    es: "Descubre tesoros olvidados",
    el: "Ανακαλύψτε ξεχασμένους θησαυρούς",
  },
  negocier: {
    fr: "Négociez chaque euro",
    en: "Haggle for every euro",
    es: "Regatea hasta el último euro",
    el: "Παζαρέψτε για κάθε ευρώ",
  },
  vendre: {
    fr: "Tenez votre propre stand",
    en: "Run your own stall",
    es: "Monta tu propio puesto",
    el: "Στήστε τον δικό σας πάγκο",
  },
  collection: {
    fr: "Complétez votre collection",
    en: "Complete your collection",
    es: "Completa tu colección",
    el: "Ολοκληρώστε τη συλλογή σας",
  },
  musiques: {
    fr: "24 musiques à découvrir",
    en: "24 tracks to discover",
    es: "24 músicas por descubrir",
    el: "24 κομμάτια για ανακάλυψη",
  },
  personnages: {
    fr: "72 personnages à rencontrer",
    en: "72 characters to meet",
    es: "72 personajes por conocer",
    el: "72 χαρακτήρες να γνωρίσετε",
  },
};

/** Réplique du grand-père, visuel 5 uniquement. */
export const BULLE = {
  fr: "Méfie-toi de celui qui sourit le plus",
  en: "Beware the one who smiles the most",
  es: "Desconfía del que más sonríe",
  el: "Να φυλάγεσαι απ' αυτόν που χαμογελάει πιο πολύ",
};

/** Seizième (ou vingtième) médaillon de la galerie. */
export const MEDAILLON_PLUS = { fr: "et +", en: "and +", es: "y +", el: "και +" };

/**
 * Libellé du bouton qui ouvre le tiroir de négociation. Recopié depuis
 * src/lib/i18n/ui/<langue>.ts — un test compare les deux, pour qu'un renommage
 * dans le jeu casse la suite de tests plutôt que la capture.
 */
export const LIBELLE_NEGOCIER = {
  fr: "Négocier",
  en: "Haggle",
  es: "Regatear",
  el: "Παζάρεμα",
};

/**
 * Libellé accessible du gramophone du bureau (`d.qg.gramophone`), cliqué pour
 * ouvrir la discothèque. Même garde i18n que LIBELLE_NEGOCIER.
 */
export const LIBELLE_GRAMOPHONE = {
  fr: "Gramophone — choisir un vinyle",
  en: "Gramophone — choose a record",
  es: "Gramófono — elegir un vinilo",
  el: "Γραμμόφωνο — επίλεξε δίσκο",
};

/**
 * Libellé accessible de la flèche « suivant » du carrousel de chinage
 * (`d.sheets.suivant`), utilisée par `--carte=N` pour avancer dans le paquet.
 * Même garde que LIBELLE_NEGOCIER : un test le compare aux fichiers i18n.
 */
export const LIBELLE_SUIVANT = {
  fr: "Suivant",
  en: "Next",
  es: "Siguiente",
  el: "Επόμενο",
};

/**
 * Portraits de la galerie du visuel 5, dans l'ordre de lecture.
 * Les 15 premiers alimentent la grille 4×4 de l'iPhone ; les 19 alimentent la
 * grille 5×4 de l'iPad. La dernière case est toujours le médaillon « et + ».
 */
export const PORTRAITS_GALERIE = [
  "vendeur-antiquaire.webp",
  "vendeur-bonimenteur.webp",
  "vendeur-disquaire.webp",
  "vendeur-grincheux.webp",
  "vendeur-malin.webp",
  "vendeur-naif.webp",
  "vendeur-pipelette.webp",
  "vendeur-videcave.webp",
  "vendeur-bonhomme.webp",
  "clients/client-galeriste-1.webp",
  "clients/client-bibliophile-0.webp",
  "clients/client-snob_bourgeois-0.webp",
  "clients/client-gamer_nostalgique-0.webp",
  "clients/client-passionnee_artdeco-0.webp",
  "commanditaires/mode.webp",
  "clients/client-retraite_chineur-0.webp",
  "clients/client-touriste_perdu-0.webp",
  "vendeur-mamie.webp",
  "commanditaires/art.webp",
];
