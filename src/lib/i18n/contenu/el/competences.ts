import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet } from "@/types/game";
import type { OverlayCompetences } from "@/lib/i18n/contenu";

/**
 * Overlay EL (grec) des compétences (spec i18n §2, ajout grec task 4). Le FR de
 * `src/data/competences.ts` reste canonique ; ces Record<Id, …> sont résolus
 * À L'AFFICHAGE (fallback FR sinon). Structure identique à `en/competences.ts`.
 * Clés : `arbres` = treeId, `branches` = `${treeId}/${brancheId}`, `paliers` = CompetenceDef.id.
 * Traduit depuis le FR canonique (EN en référence croisée). Métaphore de
 * « verbe agile/haut/d'or » rendue par « γλώσσα » (ευλύγιστη/ασημένια/χρυσή),
 * comme le fait l'EN avec « tongue ». Guillemets grecs « » autour des catégories
 * insérées, registre chaleureux de brocante (παζάρι/αντικέρης/παλιατζής).
 * ⚠️ Les chiffres d'équilibrage sont conservés à l'identique (décimales EL : `0,75`, `%` collé).
 */

/** Libellé grec de catégorie (miroir de ui/en.ts, local pour éviter un couplage au dictionnaire UI). */
export const CAT_EL: Record<CategorieObjet, string> = {
  Musique: "Μουσική",
  "Jeux & Loisirs": "Παιχνίδια & Χόμπι",
  "Livres & Papeterie": "Βιβλία & Χαρτικά",
  Mode: "Μόδα",
  Maison: "Σπίτι",
  "Objets d'art": "Έργα τέχνης",
  Bricolage: "Μερεμέτια & Εργαλεία",
};

/** Les 4 branches thématiques partagent la même structure — 1 seule table de gabarits. */
function paliersThematiques(cat: CategorieObjet): OverlayCompetences["paliers"] {
  const c = CAT_EL[cat];
  return {
    [`cat.${cat}.reparer.1`]: {
      nom: `Μαθητευόμενος — ${c}`,
      description: `Αποκαθιστάς κομμάτια «${c}» σε κακή κατάσταση (Κακή → Καλή, 1 ώρα).`,
    },
    [`cat.${cat}.reparer.2`]: {
      nom: `Τεχνίτης — ${c}`,
      description: `Τελειοποιείς κομμάτια που είναι ήδη σε αξιοπρεπή κατάσταση (Καλή → Πολύ καλή, 2 ώρες).`,
    },
    [`cat.${cat}.reparer.3`]: {
      nom: `Δάσκαλος — ${c}`,
      description: `Καταφέρνεις να ανεβάσεις τα κομμάτια σε άριστη κατάσταση και μειώνεις όλους τους χρόνους αποκατάστασης «${c}» κατά 30 λεπτά.`,
    },
    [`cat.${cat}.connaisseur.1`]: {
      nom: `Παρατηρητής — ${c}`,
      description: `Η Εφημερίδα των Παλιατζήδων σού αποκαλύπτει το ποσοστό τάσης της κατηγορίας «${c}».`,
    },
    [`cat.${cat}.connaisseur.2`]: {
      nom: `Έμπειρος έμπορος — ${c}`,
      description: `Στον πάγκο σου (προετοιμασία και πώληση), εμφανίζεται η τιμή αναφοράς των κομματιών «${c}».`,
    },
    [`cat.${cat}.connaisseur.3`]: {
      nom: `Εξασκημένο μάτι — ${c}`,
      description: `Όταν ψάχνεις, βλέπεις την πραγματική τιμή αναφοράς των αντικειμένων «${c}».`,
    },
    [`cat.${cat}.passion.1`]: {
      nom: `Λάτρης — ${c}`,
      description: `Οι πελάτες πληρώνουν +10% για αντικείμενα «${c}».`,
    },
    [`cat.${cat}.passion.2`]: {
      nom: `Παθιασμένος — ${c}`,
      description: `Οι πελάτες πληρώνουν +20% για αντικείμενα «${c}» (αντικαθιστά το «Λάτρης»).`,
    },
    [`cat.${cat}.passion.3`]: {
      nom: `Ξετρελαμένος — ${c}`,
      description: `Οι πελάτες πληρώνουν +30% για αντικείμενα «${c}» (αντικαθιστά το «Παθιασμένος»).`,
    },
    [`cat.${cat}.oeil_aiguise.1`]: {
      nom: `Ευλύγιστη γλώσσα — ${c}`,
      description: `Όταν ένας πελάτης παζαρεύει ένα αντικείμενο «${c}», ανέχεται αντιπροσφορές +10% πιο άπληστες.`,
    },
    [`cat.${cat}.oeil_aiguise.2`]: {
      nom: `Ασημένια γλώσσα — ${c}`,
      description: `Όταν ένας πελάτης παζαρεύει ένα αντικείμενο «${c}», ανέχεται αντιπροσφορές +20% πιο άπληστες (αντικαθιστά το «Ευλύγιστη γλώσσα»).`,
    },
    [`cat.${cat}.oeil_aiguise.3`]: {
      nom: `Χρυσή γλώσσα — ${c}`,
      description: `Όταν ένας πελάτης παζαρεύει ένα αντικείμενο «${c}», ανέχεται αντιπροσφορές +30% πιο άπληστες (αντικαθιστά το «Ασημένια γλώσσα»).`,
    },
  };
}

function arbreThematique(cat: CategorieObjet): { nom: string; baseline: string } {
  return { nom: CAT_EL[cat], baseline: `Εξειδικεύσου στα «${CAT_EL[cat]}».` };
}

/** Branches thématiques : mêmes 4 libellés pour chaque catégorie, jamais de description (comme le FR). */
function branchesThematiques(cat: CategorieObjet): OverlayCompetences["branches"] {
  return {
    [`cat.${cat}/reparer`]: { nom: "Επισκευή" },
    [`cat.${cat}/connaisseur`]: { nom: "Γνώστης" },
    [`cat.${cat}/passion`]: { nom: "Πάθος" },
    [`cat.${cat}/oeil_aiguise`]: { nom: "Οξυμένο μάτι" },
  };
}

export const COMPETENCES_EL: OverlayCompetences = {
  arbres: {
    general: { nom: "Γενικά", baseline: "Η τέχνη του εμπόρου, στα θεμέλιά της." },
    ...Object.fromEntries(CATEGORIES.map((cat) => [`cat.${cat}`, arbreThematique(cat)])),
  },
  branches: {
    "general/negociation": {
      nom: "Διαπραγμάτευση",
      description: "Οι αντιπροσφορές σου κρατούν περισσότερο.",
    },
    "general/charisme": { nom: "Χάρισμα", description: "Ο πάγκος σου προσελκύει το πλήθος." },
    "general/presentation": {
      nom: "Οξυδέρκεια",
      description: "Διαβάζεις τους πελάτες σου σαν ανοιχτό βιβλίο.",
    },
    "general/vision": {
      nom: "Όραση αγοράς",
      description: "Διαβάζεις τον καιρό των συναλλαγών και τα κουτσομπολιά της κοινωνίας.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => branchesThematiques(cat))),
  },
  paliers: {
    "general.negociation.1": {
      nom: "Ασημένια γλώσσα",
      description: "Οι πελάτες ανέχονται αντιπροσφορές 20% πιο άπληστες πριν εκνευριστούν.",
    },
    "general.negociation.2": {
      nom: "Χρυσή γλώσσα",
      description: "Οι πελάτες ανέχονται αντιπροσφορές 40% πιο άπληστες πριν εκνευριστούν.",
    },
    "general.negociation.3": {
      nom: "Διπλωμάτης",
      description:
        "Αντί να φύγει θυμωμένος, ο πελάτης σού αποκαλύπτει την ακριβή μέγιστη τιμή του και σου δίνει μια τελευταία αντιπροσφορά (1 φορά την ημέρα).",
    },
    "general.charisme.1": {
      nom: "Περιποιημένος πάγκος",
      description:
        "Το διάστημα ανάμεσα σε δύο περαστικούς μειώνεται κατά 25% (×0,75), δηλαδή περίπου ένα τρίτο περισσότεροι πελάτες μέσα στην ημέρα.",
    },
    "general.charisme.2": {
      nom: "Καλή φήμη",
      description: "Η μέση όρεξη όλων των πελατών σου αυξάνεται κατά +10%.",
    },
    "general.charisme.3": {
      nom: "Φημισμένος πάγκος",
      description:
        "Τουλάχιστον μία φορά την ημέρα, σε επισκέπτεται ένας πελάτης με βαρύ πορτοφόλι (όρεξη ×1,3).",
    },
    "general.presentation.1": {
      nom: "Αναγνώστης ψυχών",
      description:
        "Αναγνωρίζεις τους πελάτες σου: το όνομα και η διάθεσή τους εμφανίζονται στην κάρτα διαπραγμάτευσης.",
    },
    "general.presentation.2": {
      nom: "Εκτιμητής πορτοφολιού",
      description:
        "Το πορτοφόλι του πελάτη — τα χρήματα που έχει πάνω του — εμφανίζεται στην κάρτα διαπραγμάτευσης.",
    },
    "general.presentation.3": {
      nom: "Οξυμένο μάτι",
      description:
        "Η κάρτα διαπραγμάτευσης εμφανίζει ένα εύρος 20% μέσα στο οποίο κρύβεται η μέγιστη τιμή του πελάτη — ποτέ ακριβώς στο κέντρο.",
    },
    "general.vision.1": {
      nom: "Δελτίο καιρού",
      description:
        "Ο καιρός της ημέρας εμφανίζεται στην Εφημερίδα, μαζί με την επίδρασή του στην προσέλευση στον πάγκο.",
    },
    "general.vision.2": {
      nom: "Κοσμική στήλη",
      description:
        "Το όνομα της διασημότητας που ανακοινώνεται σε αυτό το τεύχος και το παζάρι που τη φιλοξενεί σού αποκαλύπτονται: εκείνη τη μέρα, οι πιθανότητές σου να βρεις σπάνιο ή θρυλικό αντικείμενο διπλασιάζονται και ο σωρός για ψάξιμο μεγαλώνει κατά 50%.",
    },
    "general.vision.3": {
      nom: "Επιρροή",
      description:
        "Μία φορά ανά τεύχος της Εφημερίδας, μπορείς να ξαναρίξεις (reroll) τον καιρό της ημέρας ή το κοσμικό παζάρι.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => paliersThematiques(cat))),
  },
};
