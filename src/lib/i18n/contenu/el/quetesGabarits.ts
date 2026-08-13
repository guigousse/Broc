/**
 * Overlay EL (grec) des gabarits de quêtes périodiques (spec i18n §2, ajout
 * grec task 3, familles chiffrées tâche 7). Clé = `"cle#index"` où `cle` ∈
 * {generique, jeux-video, set-designer, mode, art, rares, benefice, chiffre,
 * marge, categorie} et `index` = variante FR tirée (cf. `GabaritQueteId`
 * dans quetes/textes.ts). Résolu À L'AFFICHAGE (helpers
 * `titreCourrier`/`corpsCourrier`) quand le payload porte un `gabaritId` et
 * que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR), depuis le FR
 * canonique (`src/lib/quetes/textes.ts`), EN en référence croisée :
 *  - jeux-video  : joueur enthousiaste
 *  - set-designer: chef décorateur professionnel
 *  - mode        : modeuse chic
 *  - art         : esthète précieux
 *  - familles chiffrées (rares/benefice/chiffre/marge/categorie) : le même
 *    vieux marchand que le FR — direct, familier, sans détour.
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme EL
 * (guillemets grecs « », mention d'état traduite) dans `contenu/index.ts` —
 * conservés tels quels ici ; les familles chiffrées ajoutent `{nombre}`,
 * `{montant}` (déjà formaté « 1.800 € ») et `{categorie}` (libellé traduit,
 * encadré de guillemets grecs pour rester grammaticalement invariant quel
 * que soit le genre/nombre de la catégorie).
 */
export const QUETES_GABARITS_EL: Record<
  string,
  { titre: string; corps: string[] }
> = {
  "generique#0": {
    titre: "Αναζητείται: {objets}",
    corps: [
      "Γεια σου,",
      "Ψάχνω {objets}{etat}. Αν το βρεις, δώσε μου σημάδι — πληρώνω καλά.",
    ],
  },
  "jeux-video#0": {
    titre: "Το κομμάτι που λείπει",
    corps: [
      "Γεια σου!",
      "Μου λείπει ακόμα {objets}{etat} για να ολοκληρώσω τη συλλογή μου. Νομίζεις πως μπορείς να το βρεις;",
    ],
  },
  "jeux-video#1": {
    titre: "Για τη ρετρό βιτρίνα",
    corps: [
      "Γεια σου,",
      "Φτιάχνω μια βιτρίνα και χρειάζομαι {objets}{etat}. Βασίζομαι πάνω σου!",
    ],
  },
  "set-designer#0": {
    titre: "Ανάγκη για σκηνικό",
    corps: [
      "Καλημέρα,",
      "Για ένα σκηνικό χρειάζομαι {objets}{etat}. Η λεπτομέρεια που κάνει την ψευδαίσθηση αληθινή.",
    ],
  },
  "set-designer#1": {
    titre: "Στο πλατό γυρισμάτων",
    corps: [
      "Γεια,",
      "Το πλατό των γυρισμάτων μου απαιτεί {objets}{etat}. Χωρίς αυτό, η εικόνα ακούγεται ψεύτικη.",
    ],
  },
  "mode#0": {
    titre: "Ένα vintage κομμάτι",
    corps: [
      "Αγαπητέ λάτρη του παζαριού,",
      "Η συλλογή μου απαιτεί {objets}{etat}. Το σωστό ρούχο πάντα αφηγείται μια ιστορία.",
    ],
  },
  "mode#1": {
    titre: "Έμπνευση για πασαρέλα",
    corps: [
      "Καλημέρα,",
      "Ετοιμάζω ένα πασαρέλα show και {objets}{etat} θα με ενέπνεε. Μπορείς να το βρεις;",
    ],
  },
  "art#0": {
    titre: "Για τη γκαλερί",
    corps: [
      "Αγαπητέ φίλε,",
      "Θα ήθελα να κρεμάσω {objets}{etat}. Ένα όμορφο κομμάτι, φυσικά.",
    ],
  },
  "art#1": {
    titre: "Απόκτηση",
    corps: [
      "Αγαπητέ συνάδελφε,",
      "Ένας φωτισμένος συλλέκτης αναζητά {objets}{etat} για τη συλλογή του. Δώστε μου σημάδι.",
    ],
  },
  "rares#0": {
    titre: "Μάτι για τα σπάνια",
    corps: [
      "Γεια σου,",
      "Λένε πως έχεις μάτι. Φέρε μου {nombre} σπάνια κομμάτια από τα επόμενα παζάρια σου και θα ξέρω ποιον να φωνάξω.",
    ],
  },
  "rares#1": {
    titre: "Μόνο ό,τι καλύτερο",
    corps: [
      "Αγαπητέ λάτρη του παζαριού,",
      "Τα κοινά αντικείμενα δεν με ενδιαφέρουν πια. {nombre} σπάνια κομμάτια, ούτε ένα λιγότερο — δείξε μου τι ξέρεις να βρίσκεις.",
    ],
  },
  "benefice#0": {
    titre: "Πρόσεξε το κέρδος",
    corps: [
      "Γεια σου,",
      "Το να αγοράζεις το ξέρει ο καθένας. Βγάλε {montant} κέρδος αυτή την εβδομάδα και θα ξανασυζητήσουμε για τη δουλειά σου.",
    ],
  },
  "benefice#1": {
    titre: "Εκεί είναι το κέρδος",
    corps: [
      "Γεια σου,",
      "Ένα στοίχημα: {montant} κέρδος πριν το τέλος της εβδομάδας. Αν τα καταφέρεις, πληρώνω.",
    ],
  },
  "chiffre#0": {
    titre: "Κράτα το μαγαζί σε κίνηση",
    corps: [
      "Γεια σου,",
      "Ξέχνα το περιθώριο — θέλω να δω κίνηση. {montant} σε πωλήσεις αυτή την εβδομάδα.",
    ],
  },
  "chiffre#1": {
    titre: "Κάνε το ταμείο να τραγουδά",
    corps: [
      "Γεια,",
      "Κάνε το ταμείο να τραγουδήσει — {montant} μαζεμένα πριν την Κυριακή.",
    ],
  },
  "marge#0": {
    titre: "Το χτύπημα της χρονιάς",
    corps: [
      "Αγαπητέ συνάδελφε,",
      "Όλοι πουλάνε πολλά. Λίγοι καταφέρνουν ΤΟ χτύπημα. Κάνε {montant} περιθώριο σε μία και μόνο πώληση.",
    ],
  },
  "marge#1": {
    titre: "Μία φτάνει",
    corps: [
      "Γεια σου,",
      "Μία καλή πώληση αξίζει όσο δέκα μέτριες. {montant} περιθώριο, σε ένα μόνο κομμάτι.",
    ],
  },
  "categorie#0": {
    titre: "Ζητείται ειδικός",
    corps: [
      "Γεια σου,",
      "Χρειάζομαι κάποιον που ξέρει καλά το ράφι του. Πούλησε {nombre} αντικείμενα από την κατηγορία «{categorie}» και θα κερδίσεις την εμπιστοσύνη μου.",
    ],
  },
  "categorie#1": {
    titre: "Άδειασε το ράφι",
    corps: [
      "Γεια,",
      "Το απόθεμά μου στην κατηγορία «{categorie}» ξεχειλίζει. Διάθεσέ μου {nombre} από αυτά και θα σ' το χρωστάω.",
    ],
  },
};
