import { ID_LETTRE_MAMAN_DEBUT } from "@/lib/courrier";

/**
 * Overlay EN du courrier scénarisé (spec i18n §2, SP4) : lettre starter de Maman
 * + trame principale (`trame_ch1..12`) + invitations des organisateurs
 * (`invitation_tier2/3/4`) + cartes postales d'épilogue (`carte_postale_1..5`).
 * Clé = id stable du courrier ; résolu À L'AFFICHAGE, fallback payload FR
 * (helpers `titreCourrier`/`corpsCourrier`).
 *
 * Traduction littéraire, pas fonctionnelle : la voix du grand-père (nostalgie,
 * tendresse, mystère qui affleure) est la matière du jeu. Les `**gras**` sont
 * conservés (rendu par les sheets) ; les objets cités restent COHÉRENTS avec
 * `en/objets.ts` (lampe = « Antique oil lamp », faïence = « Enamelled
 * earthenware pitcher », gravure = « 'View of Paris' Jouy print », bijoux =
 * « The Queen's jewels »). Le grand-père se prénomme « Marcel » (gardé tel
 * quel, cf. lettre de Maman) ; sa signature reprend le nom déjà établi dans
 * `en/personnages.ts` (« Grandpa »). « Grand Salon des Antiquaires » →
 * « Grand Antique Dealers' Salon » comme dans `en/brocantes.ts` (id
 * `salon-antiquaires-drouot`, tier 4 — à ne pas confondre avec « Grand
 * Antiques Fair » qui traduit `foire-chatou`, tier 3). Le NOMBRE de
 * paragraphes suit le FR (mise en page).
 */
export const COURRIER_EN: Record<string, { titre: string; corps: string[] }> = {
  [ID_LETTRE_MAMAN_DEBUT]: {
    titre: "A little something to start",
    corps: [
      "My dear child,",
      "So it's really happened: your grandfather has handed you the shop! Marcel only told me afterwards, of course — you know him. I don't think he's ever been so proud, even if he'll grumble if you tell him I said so.",
      "I've slipped **150 €** into the envelope to help you get started. Treat yourself to a lovely piece for your shop window, or keep it for the leaner days.",
      "Keep an eye on him a little, will you? And come see me when you have a minute.",
    ],
  },
  trame_ch1: {
    titre: "My workshop lamp",
    corps: [
      "Track down an **antique oil lamp** in good condition.",
      "“Forty years it lit up my finds. A shop without its lamp is a story without light.”",
    ],
  },
  trame_ch2: {
    titre: "Selling is living",
    corps: [
      "Rack up **300 €** in sales since accepting.",
      "“Hunting is the pleasure. Selling is the trade. And the trade is learned by selling.”",
    ],
  },
  trame_ch3: {
    titre: "Golden hands",
    corps: [
      "Restore an object to **Good** condition.",
      "“A damaged object is a story that stutters. Fix it.”",
    ],
  },
  trame_ch4: {
    titre: "Your grandmother's pitcher",
    corps: [
      "Track down an **enamelled earthenware pitcher**.",
      "“I sold it one hard winter. Some regrets take the shape of a blue pitcher.”",
    ],
  },
  trame_ch5: {
    titre: "A name that travels",
    corps: [
      "Reach **level 8** as a flea-market dealer.",
      "“Your name is worth more than your till. Make it travel.”",
    ],
  },
  trame_ch6: {
    titre: "The nose for it",
    corps: [
      "Make a profit of at least **100 €** on a single sale.",
      "“Buy right, sell right. Between the two, there's the eye.”",
    ],
  },
  trame_ch7: {
    titre: "A shop window worthy of the name",
    corps: [
      "Reach **1,500 €** in collection value.",
      "“A collection is a face. Make yours unforgettable.”",
    ],
  },
  trame_ch8: {
    titre: "High society",
    corps: [
      "Track down a **'View of Paris' Jouy print** in very good condition.",
      "“Up there, they don't forgive the almost-right. Flawless, do you hear me.”",
    ],
  },
  trame_ch9: {
    titre: "A master's piece",
    corps: [
      "Restore an object to **Pristine** condition.",
      "“An object made new again is a life prolonged.”",
    ],
  },
  trame_ch10: {
    titre: "The invitation",
    corps: [
      "Grandpa has told you everything: fifty years of searching, and the Grand Salon as the last lead.",
      "“That's where it all stops, or where it all comes together.”",
    ],
  },
  trame_ch11: {
    titre: "The Queen's jewels",
    corps: [
      "Acquire **The Queen's jewels** at the Grand Salon. They'll stay in your collection.",
      "“Fifty years I've searched for them. Now it's your turn to reach out.”",
    ],
  },
  trame_ch12: {
    titre: "Handing over the keys",
    corps: [
      "The shop is yours now. Grandpa is off travelling — he'll write.",
      "“A story never belongs to the one who begins it.”",
    ],
  },
  invitation_tier2: {
    titre: "Invitation to the city markets",
    corps: [
      "Your stall no longer goes unnoticed: several of our exhibitors have spoken to us about you.",
      "The **★★ city markets** are now open to you. Present yourself at the entrance — your name will be enough.",
    ],
  },
  invitation_tier3: {
    titre: "Invitation to the salons",
    corps: [
      "Your reputation precedes you — a rare thing, and one we know how to recognise.",
      "The **★★★ salons** would be honoured by your visit. Smart attire appreciated, a sharp eye required.",
    ],
  },
  invitation_tier4: {
    titre: "The Grand Antique Dealers' Salon",
    corps: [
      "Few names are admitted to **the Grand Salon**. Yours has just been entered.",
      "We await you. Some come seeking treasures; the wiser ones find stories.",
    ],
  },
  carte_postale_1: {
    titre: "Postcard from Venice",
    corps: [
      "It's raining over the lagoon and everyone finds that sad, except me. The reflections double the city — two Venices for the price of one, quite the bargain.",
      "I haggled over a piece of Murano glass, on principle. I lost. The seller was about your age — a good sign for the trade.",
      "Take care of the shop. — Grandpa",
    ],
  },
  carte_postale_2: {
    titre: "Postcard from Lisbon",
    corps: [
      "The trams here creak exactly like the shop's staircase. I felt at home right away.",
      "A lady sold me some azulejos “from the 18th century.” They're from 1974. I bought them anyway: it's the story you buy, not the date.",
      "— Grandpa",
    ],
  },
  carte_postale_3: {
    titre: "Postcard from Marrakesh",
    corps: [
      "The souk, little one. THE SOUK. I haggled three hours over a teapot; we ended up drinking tea out of it, at his grandmother's house.",
      "I'll teach you the gesture of the hands, one day. It can't be written down.",
      "— Grandpa",
    ],
  },
  carte_postale_4: {
    titre: "Postcard from Kyoto",
    corps: [
      "Here, they mend broken bowls with gold powder. They call it kintsugi: the scar is part of the beauty.",
      "I thought of my hands, and of you, at the workbench. We were right to glue things back together, you know.",
      "— Grandpa",
    ],
  },
  carte_postale_5: {
    titre: "Postcard from Athens",
    corps: [
      "From the terrace where I'm writing you, you can see the Acropolis and the neighbor's laundry, on equal footing. I've crossed half the world chasing a queen's jewels — and it's here, in front of an over-sweet coffee, that I stopped running.",
      "I'm staying. There's a little shop for rent at the foot of the hill, just enough room for a workbench and two chairs. We already had everything, you know — all I was missing was a place to know it.",
      "Come see me when the shop lets you breathe. — Grandpa",
    ],
  },
};
