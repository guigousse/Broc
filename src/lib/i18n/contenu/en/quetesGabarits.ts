/**
 * Overlay EN des gabarits de quêtes périodiques (spec i18n §2, SP4, tâche 5).
 * Clé = `"cle#index"` où `cle` ∈ {generique, jeux-video, set-designer, mode, art}
 * et `index` = variante FR tirée (cf. `GabaritQueteId` dans quetes/textes.ts).
 * Résolu À L'AFFICHAGE (helpers `titreCourrier`/`corpsCourrier`) quand le payload
 * porte un `gabaritId` et que la locale ≠ fr ; fallback payload FR sinon.
 *
 * Reformulation par TON de commanditaire (PAS un calque du FR) :
 *  - jeux-video  : joueur enthousiaste
 *  - set-designer: chef décorateur professionnel
 *  - mode        : modeuse chic
 *  - art         : esthète précieux
 * Placeholders `{objets}` / `{etat}` interpolés par la mise en forme EN
 * (guillemets droits, mention d'état traduite) dans `contenu/index.ts`.
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
};
