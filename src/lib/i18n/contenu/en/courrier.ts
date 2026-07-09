import { ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";

/**
 * Overlay EN du courrier scénarisé (spec i18n §2, SP4) : lettre starter de Maman
 * + arc principal du grand-père antiquaire. Clé = id stable du courrier ; résolu
 * À L'AFFICHAGE, fallback payload FR (helpers `titreCourrier`/`corpsCourrier`).
 *
 * Traduction littéraire, pas fonctionnelle : la voix du grand-père (nostalgie,
 * comédie sarcastique sèche, mystère qui affleure) est la matière du jeu. Les
 * `**gras**` sont conservés (rendu par les sheets) ; les objets cités restent
 * COHÉRENTS avec `en/objets.ts` (lampe = « Antique oil lamp », faïence =
 * « Enamelled earthenware pitcher », gravure = « 'View of Paris' Jouy print »,
 * bijoux = « The Queen's jewels »). « Gran Salón » → « Grand Antiques Fair »
 * comme dans `en/brocantes.ts`. Le NOMBRE de paragraphes suit le FR (mise en page).
 */
export const COURRIER_EN: Record<string, { titre: string; corps: string[] }> = {
  [ID_LETTRE_MAMAN_DEBUT]: {
    titre: "A little something to start",
    corps: [
      "My dear child,",
      "I know you're setting out on this new adventure as a flea-market hunter, and I'm so proud of you. The flea market is a wonderful world, but a demanding one — be patient, keep your eyes open, learn as you go.",
      "I've slipped **150 €** into this envelope to help you get started. Treat yourself to a lovely piece for your first shop window, or set it aside for the leaner days.",
      "Do come and see me when you have a moment.",
    ],
  },
  principale_ch1: {
    titre: "The last page of the notebook",
    corps: [
      "Little one,",
      "If you're reading these lines, the shop is yours — and I'm somewhere else. Don't pull that face: an antique dealer never dies, he simply moves on, that's all.",
      "Before I went, I had one last whim: track down my old **workshop lamp**. It lit forty years of finds. Bring it back to me — figure of speech, of course.",
    ],
  },
  principale_ch2: {
    titre: "Making a name for yourself",
    corps: [
      "Received among the great and good already? Not bad, for a beginner.",
      "This trade respects only those with an eye. Dig me up a **fine piece of earthenware** — let them see you know quality when you find it.",
      "(And no, I still won't tell you where I am. Patience.)",
    ],
  },
  principale_ch3: {
    titre: "The doors of high society",
    corps: [
      "Well, well. The hushed drawing rooms are opening their doors to you.",
      "Up there, they don't forgive the almost-right. Find me a **print in truly fine condition** — flawless, do you hear me.",
      "What I was after is hiding right at the top of that ladder. What a coincidence.",
    ],
  },
  principale_ch4: {
    titre: "The invitation",
    corps: [
      "The Grand Antiques Fair has invited you. Of course it has — I planned it that way, little one.",
      "All of it — this notebook, these commissions… none of it was for the lamp or the earthenware. It was to bring you here. Where it all began. Where it all came to a stop.",
      "One last thing is waiting for you in that hall. You know which one.",
    ],
  },
  principale_ch5: {
    titre: "The Queen's jewels",
    corps: [
      "There they are. **The Queen's jewels.** The very thing I walked away from everything for, one evening, without a word.",
      "Get your hands on them, and you'll understand why I left — and perhaps where to find me.",
      "The rest is yours now. As is all the rest.",
    ],
  },
};
