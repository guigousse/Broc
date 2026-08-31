/**
 * Overlay EN des gabarits de quêtes périodiques (spec i18n §2, SP4, tâches 5 et 7).
 * Clé = `"cle#index"` où `cle` ∈ {generique, jeux-video, set-designer, mode, art,
 * rares, benefice, chiffre, marge, categorie} et `index` = variante FR tirée
 * (cf. `GabaritQueteId` dans quetes/textes.ts). Résolu À L'AFFICHAGE (helpers
 * `titreCourrier`/`corpsCourrier`) quand le payload porte un `gabaritId` et
 * que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR) :
 *  - jeux-video  : joueur enthousiaste
 *  - set-designer: chef décorateur professionnel
 *  - mode        : modeuse chic
 *  - art         : esthète précieux
 *  - familles chiffrées (rares/benefice/chiffre/marge/categorie) : le même
 *    vieux marchand que le FR, en plus sec — direct, sans fioritures.
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme EN
 * (guillemets droits, mention d'état traduite) dans `contenu/index.ts` ; les
 * familles chiffrées ajoutent `{nombre}`, `{montant}` (déjà formaté « €1,800 »)
 * et `{categorie}` (libellé traduit).
 */
export const QUETES_GABARITS_EN: Record<
  string,
  { titre: string; corps: string[] }
> = {
  "generique#0": {
    titre: "Wanted: {objets}",
    corps: [
      "Hello,",
      "I'm after {objets}{etat}. If you get your hands on it, give me a shout — I pay well.",
    ],
  },
  "jeux-video#0": {
    titre: "The missing piece",
    corps: [
      "Hey there!",
      "I'm still missing {objets}{etat} to round out my collection. Think you can dig that up?",
    ],
  },
  "jeux-video#1": {
    titre: "For the retro shelf",
    corps: [
      "Hello!",
      "I'm building a retro display and I need {objets}{etat}. Counting on you!",
    ],
  },
  "set-designer#0": {
    titre: "Prop needed",
    corps: [
      "Hello,",
      "For a set I need {objets}{etat}. It's the little detail that sells the illusion.",
    ],
  },
  "set-designer#1": {
    titre: "On the shooting stage",
    corps: [
      "Hi,",
      "My shooting stage calls for {objets}{etat}. Without it, the frame rings false.",
    ],
  },
  "mode#0": {
    titre: "A vintage piece",
    corps: [
      "Dear picker,",
      "My wardrobe is crying out for {objets}{etat}. The right garment always tells a story.",
    ],
  },
  "mode#1": {
    titre: "Runway inspiration",
    corps: [
      "Hello,",
      "I'm putting together a show, and {objets}{etat} would be just the muse I need. Could you track it down?",
    ],
  },
  "art#0": {
    titre: "For the gallery",
    corps: [
      "Dear friend,",
      "I should so love to hang {objets}{etat}. A fine piece, naturally.",
    ],
  },
  "art#1": {
    titre: "An acquisition",
    corps: [
      "Dear confrère,",
      "A discerning connoisseur seeks {objets}{etat} for his collection. Do let me know.",
    ],
  },
  "rares#0": {
    titre: "An eye for the good stuff",
    corps: [
      "Hello,",
      "Word is you've got an eye. Bring back {nombre} rare pieces from your next rounds and I'll know who to call.",
    ],
  },
  "rares#1": {
    titre: "Nothing but the best",
    corps: [
      "Dear picker,",
      "Everyday clutter bores me. {nombre} rare pieces, not one less — show me what you can dig up.",
    ],
  },
  "benefice#0": {
    titre: "Mind the margin",
    corps: [
      "Hi,",
      "Anyone can buy. Clear {montant} in profit this week and we'll talk about your trade.",
    ],
  },
  "benefice#1": {
    titre: "Where the money is",
    corps: [
      "Hello,",
      "A wager: {montant} in profit before the week is out. You deliver, I pay.",
    ],
  },
  "chiffre#0": {
    titre: "Keep the shop moving",
    corps: [
      "Hello,",
      "Never mind the margin — I want to see movement. {montant} in sales this week.",
    ],
  },
  "chiffre#1": {
    titre: "Make the till sing",
    corps: [
      "Hi,",
      "Let that till sing — {montant} taken before Sunday.",
    ],
  },
  "marge#0": {
    titre: "The big one",
    corps: [
      "Dear colleague,",
      "Everyone sells plenty. Few land THE one. Make {montant} of margin on a single sale.",
    ],
  },
  "marge#1": {
    titre: "One will do",
    corps: [
      "Hello,",
      "One fine sale beats ten middling ones. {montant} of margin, on a single piece.",
    ],
  },
  "categorie#0": {
    titre: "Specialist wanted",
    corps: [
      "Hello,",
      "I need someone who knows their aisle. Sell {nombre} items from {categorie} and you'll have my trust.",
    ],
  },
  "categorie#1": {
    titre: "Clear the shelf",
    corps: [
      "Hi,",
      "My {categorie} stock is overflowing. Move {nombre} of them for me and I'll owe you one.",
    ],
  },
  "beneficeJour#0": {
    titre: "Today's tally",
    corps: [
      "Hi,",
      "No speeches: {montant} in profit before tonight. Then we'll see what you're worth.",
    ],
  },
  "beneficeJour#1": {
    titre: "We settle up tonight",
    corps: [
      "Hello,",
      "Clear {montant} in profit by the end of the day and I'll put you in my book.",
    ],
  },
  "chiffreJour#0": {
    titre: "Keep it moving, today",
    corps: [
      "Hello,",
      "Margin doesn't interest me — movement does. {montant} taken before closing.",
    ],
  },
  "chiffreJour#1": {
    titre: "One day's takings",
    corps: [
      "Hi,",
      "Make that till sing before tonight — {montant} taken, not a penny less.",
    ],
  },
  "margeJour#0": {
    titre: "Today's coup",
    corps: [
      "Dear colleague,",
      "One fine sale beats ten middling ones. {montant} of margin on a single object, and before tonight.",
    ],
  },
  "margeJour#1": {
    titre: "One sale, that's all",
    corps: [
      "Hello,",
      "I don't care how much you sell today. I want {montant} of margin on ONE sale.",
    ],
  },
  "categorieJour#0": {
    titre: "Today's shelf",
    corps: [
      "Hello,",
      "Today you mind the {categorie} shelf. Sell me {nombre} of them and we'll talk.",
    ],
  },
  "categorieJour#1": {
    titre: "Before closing",
    corps: [
      "Hi,",
      "{nombre} pieces from the {categorie} shelf, sold before tonight. Simple enough?",
    ],
  },
  "restauration#0": {
    titre: "Bring back the shine",
    corps: [
      "Hello,",
      "I can't stand a wreck. Take a piece, put it on the bench and bring it back to condition{etat}.",
    ],
  },
  "restauration#1": {
    titre: "A turn at the bench",
    corps: [
      "Hi,",
      "One piece, one bench, a little patience. I'll take it back once it's been done up{etat}.",
    ],
  },
  "legendaire#0": {
    titre: "The piece of a lifetime",
    corps: [
      "Dear colleague,",
      "You meet one of those once or twice in a career. If a legendary piece crosses your path today, don't let it go — I'll know how to show my gratitude.",
    ],
  },
  "legendaire#1": {
    titre: "If it surfaces, it's yours",
    corps: [
      "Hello,",
      "Word is an exceptional piece is surfacing somewhere today. Get your hands on it. I'll pay the price of luck.",
    ],
  },
};
