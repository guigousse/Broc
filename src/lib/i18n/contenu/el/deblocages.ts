/**
 * Overlay EL (grec) des déblocages de niveau (spec i18n §2, ajout grec task 4).
 * Clé = titre FR canonique de `src/data/deblocagesNiveau.ts` (pas d'id en data) —
 * ces clés ne se traduisent PAS, seules les valeurs passent en grec. Résolu
 * À L'AFFICHAGE, fallback FR. Les emojis des actives sont conservés à l'identique.
 * « Atout » → « Ατού » (mot grec courant, emprunt du français « atout » au sens
 * d'avantage/carte maîtresse). Traduit depuis le FR canonique, EN en référence
 * croisée.
 */
export const DEBLOCAGES_EL: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)": "Ξεκλείδωμα της οθόνης Δεξιοτήτων (+1 πόντος)",
  "Quêtes quotidiennes et hebdomadaires": "Καθημερινές και εβδομαδιαίες αποστολές",
  "Atout 🔍 Le Flair": "Ατού 🔍 Η Μύτη",
  "Atout 🧺 Le Lot garni": "Ατού 🧺 Η Παρτίδα",
  "Atout 🧹 La Fouille": "Ατού 🧹 Το Ψάξιμο",
  "Paliers 2 des compétences": "Βαθμίδα 2 των Δεξιοτήτων",
  "Paliers 3 des compétences": "Βαθμίδα 3 των Δεξιοτήτων",
  "Atout 🎩 Le Boniment": "Ατού 🎩 Το Παραμύθι",
  "Atout 💬 La Tchatche": "Ατού 💬 Η Φλυαρία",
  "Atout 📣 La Criée": "Ατού 📣 Η Διαλαλιά",
  "Atout 🔍 Le Flair — 2ᵉ usage par jour": "Ατού 🔍 Η Μύτη — 2η χρήση την ημέρα",
  "Atout 🔍 Le Flair — 3ᵉ usage par jour": "Ατού 🔍 Η Μύτη — 3η χρήση την ημέρα",
  "Atout 🧺 Le Lot garni — 2ᵉ usage par jour": "Ατού 🧺 Η Παρτίδα — 2η χρήση την ημέρα",
  "Atout 🧺 Le Lot garni — 3ᵉ usage par jour": "Ατού 🧺 Η Παρτίδα — 3η χρήση την ημέρα",
  "Atout 🧹 La Fouille — 2ᵉ usage par jour": "Ατού 🧹 Το Ψάξιμο — 2η χρήση την ημέρα",
  "Atout 🧹 La Fouille — 3ᵉ usage par jour": "Ατού 🧹 Το Ψάξιμο — 3η χρήση την ημέρα",
  "Atout 🎩 Le Boniment — 2ᵉ usage par jour": "Ατού 🎩 Το Παραμύθι — 2η χρήση την ημέρα",
  "Atout 🎩 Le Boniment — 3ᵉ usage par jour": "Ατού 🎩 Το Παραμύθι — 3η χρήση την ημέρα",
  "Atout 💬 La Tchatche — 2ᵉ usage par jour": "Ατού 💬 Η Φλυαρία — 2η χρήση την ημέρα",
  "Atout 💬 La Tchatche — 3ᵉ usage par jour": "Ατού 💬 Η Φλυαρία — 3η χρήση την ημέρα",
  "Atout 📣 La Criée — 2ᵉ usage par jour": "Ατού 📣 Η Διαλαλιά — 2η χρήση την ημέρα",
  "Atout 📣 La Criée — 3ᵉ usage par jour": "Ατού 📣 Η Διαλαλιά — 3η χρήση την ημέρα",
};

export const DEBLOCAGES_DESC_EL: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)":
    "Η βιβλιοθήκη ανοίγει την οθόνη Δεξιοτήτων: ξόδεψε τους πόντους σου (1 ανά βαθμίδα) για να βελτιώσεις την τέχνη σου.",
  "Quêtes quotidiennes et hebdomadaires":
    "Το ταχυδρομείο φέρνει παραγγελίες: μία καθημερινή και μία πιο φιλόδοξη εβδομαδιαία, με χρηματική αμοιβή.",
  "Paliers 2 des compétences": "Η βαθμίδα 2 όλων των κλάδων δεξιοτήτων γίνεται αγοράσιμη.",
  "Paliers 3 des compétences": "Η βαθμίδα 3 — η κορυφή κάθε κλάδου — γίνεται αγοράσιμη.",
  "Atout 🔍 Le Flair":
    "Στο ψάξιμο: αποκαλύπτει την πραγματική αξία όλων των αντικειμένων στον πάγκο για την υπόλοιπη επίσκεψη. Μία χρήση την ημέρα.",
  "Atout 🧺 Le Lot garni":
    "Στη μέση μιας διαπραγμάτευσης στον πάγκο σου: προσθέτει ένα δεύτερο αντικείμενο στην παρτίδα του πελάτη, η τιμή της παρτίδας επαναδιαπραγματεύεται ενιαία. Μία χρήση την ημέρα.",
  "Atout 🧹 La Fouille":
    "Στο ψάξιμο: ο πωλητής αντικαθιστά το στοχευμένο αντικείμενο με νέο εύρημα. Μία χρήση την ημέρα.",
  "Atout 🎩 Le Boniment":
    "Στην πώληση: επιβάλλει το κλείσιμο — αν η τιμή σου είναι δίκαιη ο πελάτης τη δέχεται αμέσως, αλλιώς αποκαλύπτει τον ακριβή προϋπολογισμό του χωρίς να θυμώσει. Μία χρήση την ημέρα.",
  "Atout 💬 La Tchatche":
    "Στο ψάξιμο: ξανανοίγει μια διαπραγμάτευση που μόλις απέτυχε, ο πωλητής ηρεμεί. Μία χρήση την ημέρα.",
  "Atout 📣 La Criée":
    "Στον πάγκο σου: μαζεύει κόσμο — τρεις πελάτες εμφανίζονται ο ένας μετά τον άλλον. Μία χρήση την ημέρα.",
};
const DESC_USAGE_2_EL = "Το ατού μπορεί πλέον να χρησιμοποιηθεί δύο φορές την ημέρα.";
const DESC_USAGE_3_EL = "Το ατού μπορεί πλέον να χρησιμοποιηθεί τρεις φορές την ημέρα.";
for (const t of ["Atout 🔍 Le Flair", "Atout 🧺 Le Lot garni", "Atout 🧹 La Fouille", "Atout 🎩 Le Boniment", "Atout 💬 La Tchatche", "Atout 📣 La Criée"]) {
  DEBLOCAGES_DESC_EL[`${t} — 2ᵉ usage par jour`] = DESC_USAGE_2_EL;
  DEBLOCAGES_DESC_EL[`${t} — 3ᵉ usage par jour`] = DESC_USAGE_3_EL;
}
