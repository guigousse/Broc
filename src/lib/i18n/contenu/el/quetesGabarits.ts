/**
 * Overlay EL (grec) des gabarits de quêtes périodiques (spec i18n §2, ajout
 * grec task 3). Clé = `"cle#index"` où `cle` ∈ {generique, jeux-video,
 * set-designer, mode, art} et `index` = variante FR tirée (cf.
 * `GabaritQueteId` dans quetes/textes.ts). Résolu À L'AFFICHAGE (helpers
 * `titreCourrier`/`corpsCourrier`) quand le payload porte un `gabaritId` et
 * que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR), depuis le FR
 * canonique (`src/lib/quetes/textes.ts`), EN en référence croisée :
 *  - jeux-video  : joueur enthousiaste
 *  - set-designer: chef décorateur professionnel
 *  - mode        : modeuse chic
 *  - art         : esthète précieux
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme EL
 * (guillemets grecs « », mention d'état traduite) dans `contenu/index.ts` —
 * conservés tels quels ici.
 */
export const QUETES_GABARITS_EL: Record<
  string,
  { titre: string; corps: string[] }
> = {
  "generique#0": {
    titre: "Αναζητείται: {objets}",
    corps: [
      "Γεια σας,",
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
      "Χαίρετε,",
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
};
