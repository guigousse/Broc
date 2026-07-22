import type { OverlayPersonnages } from "../en/personnages";

/**
 * Overlay EL (grec) des personnages (spec i18n §2, SP3 tâche 7 ; ajout grec
 * task 2). Structure identique à `en/personnages.ts` — clients de vente,
 * vendeurs de chine, expéditeurs de courrier. Le FR de `src/data/` et
 * `src/lib/personas.ts` reste canonique ; ici on résout par id à l'affichage.
 * Noms propres français conservés, surnoms/ambiances/personnalités/signatures
 * traduits (registre chaleureux de brocante). Guillemets grecs « ».
 */
export const PERSONNAGES_EL: OverlayPersonnages = {
  archetypesClient: {
    retraite_chineur: { nom: "Συνταξιούχος λάτρης των παζαριών" },
    passionnee_artdeco: { nom: "Θαυμάστρια του Αρ Ντεκό" },
    brocanteur_concurrent: { nom: "Ανταγωνιστής παλαιοπώλης" },
    collectionneur_musique: { nom: "Συλλέκτης μουσικής" },
    gamer_nostalgique: { nom: "Νοσταλγικός gamer" },
    bibliophile: { nom: "Βιβλιόφιλος" },
    bricoleur_dimanche: { nom: "Κυριακάτικος μερακλής" },
    etudiant_fauche: { nom: "Απένταρος φοιτητής" },
    snob_bourgeois: { nom: "Αστός σνομπ" },
    touriste_perdu: { nom: "Χαμένος τουρίστας" },
    famille_dimanche: { nom: "Κυριακάτικη οικογένεια" },
    decorateur: { nom: "Διακοσμητής εσωτερικών χώρων" },
    amateur_vintage: { nom: "Λάτρης του vintage" },
    notable_curieux: { nom: "Περίεργος προύχοντας" },
    opportuniste: { nom: "Οπορτουνιστής με μύτη" },
    galeriste: { nom: "Γκαλερίστας" },
  },
  personnages: {
    "retraite_chineur.0": {
      nom: "Κύριος Durand",
      ambiance: "Μετράει κάθε δεκάρα κοιτώντας πάνω από τα γυαλιά του.",
    },
    "retraite_chineur.1": {
      nom: "Κυρία Rivoire",
      ambiance: "Ρωτάει πάντα: «Αυτή είναι η τελευταία σας τιμή;»",
    },
    "retraite_chineur.2": {
      nom: "Ο Pierre της γειτονιάς",
      ambiance: "Έρχεται κυρίως για να κουβεντιάσει, αγοράζει λίγα.",
    },
    "passionnee_artdeco.0": {
      nom: "Η Léonie από το Tourcoing",
      ambiance: "Αναστενάζει σιγανά μπροστά σε κάθε όμορφη πατίνα.",
    },
    "passionnee_artdeco.1": {
      nom: "Camille Mercier",
      ambiance: "Φωτογραφίζει διακριτικά τα κομμάτια που της αρέσουν.",
    },
    "passionnee_artdeco.2": {
      nom: "Κυρία Renaud",
      ambiance: "Χαϊδεύει το σκαλισμένο ξύλο με δάχτυλο γνώστη.",
    },
    "brocanteur_concurrent.0": {
      nom: "Ο Maxime της παλιατζούρας",
      ambiance: "Δεν χαμογελάει ποτέ, προσφέρει πάντα 30% λιγότερα.",
    },
    "brocanteur_concurrent.1": {
      nom: "Ο Hugo ο μεταπωλητής",
      ambiance: "Ξέρει τον πάγκο σας και τις τιμές σας απ' έξω.",
    },
    "brocanteur_concurrent.2": {
      nom: "Jean-Claude «η αγοραία τιμή»",
      ambiance: "Επικαλείται δημοπρασίες για να δικαιολογήσει τις πενιχρές προσφορές του.",
    },
    "collectionneur_musique.0": {
      nom: "Ο Bertrand ο μελόμανος",
      ambiance: "Μυρίζει κάθε εξώφυλλο βινυλίου με σεβασμό.",
    },
    "collectionneur_musique.1": {
      nom: "Sophie 33-Στροφών",
      ambiance: "Φεύγει πάντα με δύο τρεις δίσκους στη μασχάλη.",
    },
    "collectionneur_musique.2": {
      nom: "Βινύλιο Vincent",
      ambiance: "Ξέρει όλες τις εκδόσεις, όλες τις δισκογραφικές.",
    },
    "gamer_nostalgique.0": {
      nom: "Ο Léo ο retro",
      ambiance: "Συγκινείται μπροστά σε κάθε κασέτα παιχνιδιού της παιδικής του ηλικίας.",
    },
    "gamer_nostalgique.1": {
      nom: "Ο Thomas το pixel",
      ambiance: "Ελέγχει την κατάσταση των χειριστηρίων, αναστενάζει από ευτυχία.",
    },
    "gamer_nostalgique.2": {
      nom: "Η Marina η geek",
      ambiance: "Ψάχνει δώρο για τον συλλέκτη αδερφό της.",
    },
    "bibliophile.0": {
      nom: "Η Hélène η βιβλιοθηκάριος",
      ambiance: "Ελέγχει αν λείπουν σελίδες, με ύφος δασκάλας.",
    },
    "bibliophile.1": {
      nom: "Καθηγητής Lambert",
      ambiance: "Ψαχουλεύει ανάμεσα στις πρώτες εκδόσεις.",
    },
    "bibliophile.2": {
      nom: "Η Émilie με την πένα",
      ambiance: "Ψάχνει παλιό χαρτί και πένες Sergent-Major.",
    },
    "bricoleur_dimanche.0": {
      nom: "Ο Marcel ο μερακλής",
      ambiance: "Μυρίζει το πριονίδι από τρία μέτρα μακριά.",
    },
    "bricoleur_dimanche.1": {
      nom: "Ο Patrice με το τρυπάνι",
      ambiance: "Ρωτάει πάντα αν ακόμα λειτουργεί.",
    },
    "bricoleur_dimanche.2": {
      nom: "Ο Jacques με την πένσα",
      ambiance: "Εξετάζει κάθε εργαλείο σαν χειρουργός.",
    },
    "etudiant_fauche.0": {
      nom: "Ο Théo, ασκούμενος",
      ambiance: "Κοιτάζει επί ώρα, ψάχνει τις τσέπες του, το αφήνει πίσω.",
    },
    "etudiant_fauche.1": {
      nom: "Η Anaïs η απένταρη",
      ambiance: "Παζαρεύει λες και παίζεται η ζωή της.",
    },
    "etudiant_fauche.2": {
      nom: "Ο Yanis ο μποέμ",
      ambiance: "Θέλει τα πάντα, μπορεί να πάρει μόνο το ένα δέκατο.",
    },
    "snob_bourgeois.0": {
      nom: "Charles-Henri de B.",
      ambiance: "Δεν χαιρετάει τον έμπορο, εξετάζει με την άκρη των δαχτύλων.",
    },
    "snob_bourgeois.1": {
      nom: "Κυρία de Lacombe",
      ambiance: "Λοξοκοιτάζει τα κομμάτια χωρίς να καταδέχεται να τα αγγίξει.",
    },
    "snob_bourgeois.2": {
      nom: "Ο γηραιός Aristide",
      ambiance: "Αρνείται ευγενικά ό,τι μοιάζει χυδαίο.",
    },
    "touriste_perdu.0": {
      nom: "Ο Karl ο Βερολινέζος",
      ambiance: "Ενθουσιάζεται σε διστακτικά γαλλικά.",
    },
    "touriste_perdu.1": {
      nom: "Η Maria από το Μιλάνο",
      ambiance: "Συγκρίνει τις τιμές με την τρέχουσα ισοτιμία, έκπληκτη και κατακτημένη.",
    },
    "touriste_perdu.2": {
      nom: "Hiroshi & Yuka",
      ambiance: "Απλώνουν το χέρι σε ό,τι λαμπυρίζει λίγο.",
    },
    "famille_dimanche.0": {
      nom: "Η οικογένεια Martinez",
      ambiance: "Τα παιδιά αρπάζονται από ό,τι κάνει θόρυβο.",
    },
    "famille_dimanche.1": {
      nom: "Η κυρία Petit με τον γιο της",
      ambiance: "Ψάχνουν ένα μικρό δώρο για τη γιαγιά.",
    },
    "famille_dimanche.2": {
      nom: "Οι Garnier",
      ambiance: "Σπάνια φεύγουν με άδεια χέρια όταν υπάρχουν παιχνίδια.",
    },
    "decorateur.0": {
      nom: "Ο Sylvain ο σχεδιαστής",
      ambiance: "Ήδη φαντάζεται το κομμάτι σε ένα loft στη Λυών.",
    },
    "decorateur.1": {
      nom: "Η Bérénice η ντεκορατέρ",
      ambiance: "Βγάζει φωτογραφία, παίρνει μέτρα, το παίρνει μαζί της.",
    },
    "decorateur.2": {
      nom: "Ο Olivier ο ανακαινιστής",
      ambiance: "Ψάχνει χαρακτήρα για τα έργα του.",
    },
    "amateur_vintage.0": {
      nom: "Η Inès η rockabilly",
      ambiance: "Ψάχνει ένα δερμάτινο μπουφάν και έναν δίσκο 45 στροφών.",
    },
    "amateur_vintage.1": {
      nom: "Ο Théo ο mod",
      ambiance: "Χτυπάει το πόδι του σε έναν σκοπό που παίζει στο μυαλό του.",
    },
    "amateur_vintage.2": {
      nom: "Η Clara με τα τζιν",
      ambiance: "Δοκιμάζει τα πάντα, φεύγει με δύο κομμάτια.",
    },
    "notable_curieux.0": {
      nom: "Ο Δικηγόρος Lefèvre",
      ambiance: "Εξαιρετική ευγένεια, πορτοφόλι διακριτικό μα βαθύ.",
    },
    "notable_curieux.1": {
      nom: "Ο Γιατρός Roux",
      ambiance: "Περίεργος για τα πάντα, μιλάει λατινικά με τα βιβλία.",
    },
    "notable_curieux.2": {
      nom: "Η Κυρία Κόμισσα",
      ambiance: "Έρχεται για να περάσει την ώρα της, φεύγει για την ευχαρίστηση.",
    },
    "opportuniste.0": {
      nom: "Ο Sébastien ο πονηρός",
      ambiance: "Δείχνει με το δάχτυλο τις πιο χαμηλές σας τιμές.",
    },
    "opportuniste.1": {
      nom: "Η Rachida το μάτι",
      ambiance: "Εντοπίζει το λάθος στην ετικέτα από δέκα βήματα.",
    },
    "opportuniste.2": {
      nom: "Ο Vincent της Αγοράς",
      ambiance: "Σε εκπλήσσει πάντα με μια πολύ χαμηλή τιμή… που περνάει.",
    },
    "galeriste.0": {
      nom: "Ο Aurélien από το Saint-Germain",
      ambiance: "Γυρίζει γύρω από το κομμάτι, μουρμουρίζει στα ιταλικά.",
    },
    "galeriste.1": {
      nom: "Κυρία Vermeer",
      ambiance: "Βγάζει έναν φακό τσέπης και εξετάζει την υπογραφή.",
    },
    "galeriste.2": {
      nom: "Ο Pascal ο γκαλερίστας",
      ambiance: "Μιλάει για καταγωγή, προέλευση, πιστοποιητικά.",
    },
  },
  archetypesVendeur: {
    naif: "Ο Απλοϊκός",
    bonhomme: "Ο Καλός Άνθρωπος",
    mamie: "Η Βιαστική Γιαγιά",
    malin: "Ο Πονηρός",
    grincheux: "Ο Γκρινιάρης",
    antiquaire: "Ο Αντικέρης",
    pipelette: "Η Πολυλογού",
    videcave: "Ο Αδειαστής Υπογείων",
    bonimenteur: "Ο Λογάς",
    disquaire: "Ο Δισκοπώλης",
    joueur: "Ο Παίκτης",
    setdesigner: "Η Σκηνογράφος",
    modeuse: "Η Σχεδιάστρια Μόδας",
    esthete: "Ο Αισθητής",
  },
  vendeurs: {
    naif: "Ο Μικρός Lucien",
    bonhomme: "Dédé οι Τιράντες",
    mamie: "Γιαγιά Odette",
    malin: "Anatole η Κομπίνα",
    grincheux: "Ο Γέρος Anselme",
    antiquaire: "Κυρία Vasseur",
    pipelette: "Θεία Monique",
    videcave: "Jeannot ο Αδειαστής Υπογείων",
    bonimenteur: "Oscar ο Λογάς",
    disquaire: "Barnabé 33-Στροφών",
  },
  vendeurInconnu: "Ένας πωλητής",
  expediteurs: {
    maman: {
      nom: "Μαμά",
      personnalite: "Η μητέρα σου",
      relation: "Μητέρα",
      signature: "Με όλη μου την αγάπη,\nΜαμά",
    },
    "grand-pere": {
      nom: "Παππούς",
      personnalite: "Συνταξιούχος αντικέρης",
      relation: "Παππούς",
      signature: "Σειρά σου τώρα, μικρέ.\nΠαππούς",
    },
    "jeux-video": {
      nom: "Ο Παίκτης του Παζαριού",
      personnalite: "Λάτρης των βιντεοπαιχνιδιών",
      signature: "Τα λέμε στα pixel,\nΟ Παίκτης του Παζαριού",
    },
    "set-designer": {
      nom: "Clara",
      personnalite: "Σκηνογράφος",
      signature: "Ευχαριστώ εκ των προτέρων,\nClara",
    },
    mode: {
      nom: "Arianne",
      personnalite: "Σχεδιάστρια μόδας",
      signature: "Με στιλ,\nArianne",
    },
    art: {
      nom: "Paul-Henry",
      personnalite: "Συλλέκτης τέχνης",
      signature: "Με εκτίμηση,\nPaul-Henry",
    },
    organisateurs: {
      nom: "Οι Διοργανωτές",
      personnalite: "Επιτροπή παζαριών",
      relation: "Διοργανωτές",
      signature: "Με χαρά θα σας δούμε εκεί,\nΟι Διοργανωτές",
    },
  },
};
