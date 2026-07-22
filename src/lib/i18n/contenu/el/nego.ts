import type { CleMessageNego } from "@/types/game";

/**
 * Overlay EL (grec) des répliques de négociation (spec i18n §2, ajout grec
 * task 3). Même forme que `POOLS_NEGO_FR` : une liste de variantes par clé.
 * Reformulation (pas de mot-à-mot) depuis le FR canonique (EN en référence
 * croisée), qui garde l'esprit marchand gouailleur, en grec informel (« εσύ »
 * — cohérent avec le reste du jeu, cf. `el/dialogues.ts`). Placeholders
 * identiques au FR par clé (`{prix}`, `{cibleSecrete}`) — le test
 * `nego.test.ts` l'impose ; le nombre de variantes peut différer (modulo au
 * rendu). Résolu À L'AFFICHAGE via `texteNego()`. Guillemets grecs « ».
 */
export const NEGO_EL: Record<CleMessageNego, string[]> = {
  ouvertureAchat: ["Σύρε τον δείκτη για να προτείνεις μια τιμή."],
  ouvertureVente: ["Ο πελάτης σου έκανε μια προσφορά. Σειρά σου να απαντήσεις."],
  contreVendeur: [
    "« Άντε, σου κάνω μια μικρή χάρη, {prix} €… »",
    "« Χμ. Ας πούμε {prix} €. »",
    "« {prix} € και δεν ξαναμιλάμε. »",
    "« Μπορώ να κατέβω στα {prix} €, αυτό είναι το καλύτερό μου. »",
  ],
  contreClient: [
    "« Μπορώ να ανέβω λίγο: {prix} €. »",
    "« {prix} €, και αυτή είναι μια τίμια πρόταση. »",
    "« Άντε, {prix} € αν μου το τυλίξεις. »",
  ],
  refusPoliVendeur: [
    "« Εντάξει, θα το βάλω στην άκρη. Κρίμα όμως. »",
    "« Δεν πειράζει, την επόμενη φορά. »",
  ],
  refusPoliClient: [
    "« Δεν πειράζει, θα ψάξω αλλού. »",
    "« Θα το αφήσω για άλλη φορά, ευχαριστώ. »",
  ],
  fache: [
    "« Με δουλεύεις; »",
    "« Καταχράσαι την υπομονή μου. »",
  ],
  accord: [
    "Η συμφωνία κλείστηκε στα {prix} €.",
    "Πουλήθηκε στα {prix} €.",
  ],
  relance: ["« Καλά… άντε, σε ακούω μια τελευταία φορά. »"],
  diplomate: [
    "« Το ανώτατο όριό μου είναι {cibleSecrete} €. Μια τελευταία φορά, σε ακούω. »",
  ],
  bonimentConclu: ["« Η συμφωνία έκλεισε! Ξέρεις πώς να το κάνεις… »"],
  bonimentDernierMot: ["« Ορίστε ο τελευταίος μου λόγος: ή αυτό ή τίποτα. »"],
  lotGarni: ["« Χμ, και τα δύο μαζί; Κάνε μου μια τιμή… »"],
};
