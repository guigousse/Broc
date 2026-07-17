/**
 * Overlay EN des dialogues (clé = id de séquence, valeur = lignes, même
 * nombre que le FR). SP3 Task 7 : en plus des séquences du tutoriel
 * (`tuto_*`, cataloguées dans `TOUTES_SEQUENCES`), on traduit ici les 12
 * dialogues de délivrance des chapitres de la trame. Ces séquences sont
 * construites ad hoc par le layout QG (`{ id: `dlg_${ch.id}`, lignes:
 * ch.dialogue }`, cf. `src/app/(qg)/layout.tsx`) et résolues par
 * `lignesDialogue()` — clé `dlg_trame_chN`, PAS enregistrées dans
 * `TOUTES_SEQUENCES` (registre propre au tutoriel). Cf.
 * `src/lib/i18n/contenu/dialogues.test.ts` pour la vérification de parité.
 */
export const DIALOGUES_EN: Record<string, string[]> = {
  tuto_accueil: [
    "There you are at last! Come in, come in… Mind the pile of newspapers — it's been there since 1987.",
    "Fifty years I've kept this shop. Every object here has a story… and so do my knees, alas.",
    "It's time I passed it on. And I chose you. Don't make that face — you're going to love it.",
    "Let's start at the beginning: the flea market. The door's right there — follow me.",
  ],
  tuto_chine_entree: [
    "Ah, the smell of old things in the early morning… Look at the stalls: swipe from one item to the next, take your time.",
    "When an object speaks to you, haggle — or buy it at the asking price if your heart says so. Go on, pick one.",
  ],
  tuto_achat_fait: [
    "Well done! Your grandmother would have haggled two pennies more, but it's a start.",
    "Come on, let's head home. Out through the exit, treasure under your arm.",
  ],
  tuto_retour: [
    "Hunting is the pleasure. Selling is the trade. But you can't run a stall on a single find…",
    "So I've packed you a parcel: a few pieces from the shop to fill your first window. It's waiting by the door — open it!",
  ],
  tuto_vente_entree: [
    "The customers will come. Listen to them, let them talk… and never drop your price too fast.",
  ],
  tuto_vente_faite: [
    "And there's your first sale! The song of the till — you never forget it.",
    "Close the stall whenever you like, and let's go home. I have something for you at the house.",
  ],
  tuto_conclusion: [
    "You have the eye, and the hands… all you're missing is the years. The shop is in good hands.",
    "Here: my order book. People write down what they're looking for — check it often.",
    "And the postman came by: a letter from your mother, I believe. Off to work now… I'll be in my armchair if you need me.",
  ],
  dlg_trame_ch1: [
    "Forty years my old oil lamp lit up the workbench. I broke it one clumsy evening — my hands, already.",
    "Every find passed under its light before joining the window display. Silly, isn't it, an old man growing fond of a lamp?",
    "You still come across them at flea markets, in decent shape if you look hard enough. Bring me one back, would you?",
    "And haggle! If you pay full price, I'll know. I always know.",
  ],
  dlg_trame_ch2: [
    "My first sale, I fumbled it. A foxed mirror, a customer in a hurry… I stammered, he left. I cried behind the curtain, you know.",
    "The next day, your grandmother told me: “Try again.” I sold a frame for two francs. The finest day of my life as a dealer.",
    "Your turn now. Make the till sing: 300 € in sales, and I'll tell you what came next.",
  ],
  dlg_trame_ch3: [
    "Look at them. They tremble now. These hands have glued, sanded, varnished for fifty years.",
    "Take my tools. They're yours now — the mallet has its own story, I'll tell you one day.",
    "Find a damaged piece and bring it back to life. The first time an object comes alive again in your hands… you'll see.",
  ],
  dlg_trame_ch4: [
    "Your grandmother had a pitcher, blue earthenware, chipped at the spout. It sat on the sideboard, always full of wildflowers.",
    "One hard winter, I sold it. She said nothing. That's the silence I never managed to mend.",
    "She dreamed I'd give her a queen's jewels one day. Me, I couldn't even keep her a pitcher.",
    "You still find ones like it at flea markets. Bring it back for me. Well… bring it back for her.",
  ],
  dlg_trame_ch5: [
    "They talked about you at the café this morning! “The kid from the shop,” they say. They said the same about me, back in 1975.",
    "In this trade, your name is worth more than your till. It's earned slowly, at the stalls, one handshake at a time.",
    "Keep hunting, selling, learning. By the time the markets whisper your name, I'll know it before you do.",
  ],
  dlg_trame_ch6: [
    "One day, I let a silver snuffbox slip away for next to nothing. Resold ten times its price the following week, right in front of me.",
    "I didn't sleep that night. Not over the money — over not knowing how to see.",
    "A nose for it is forged, not born. Pull off a nice deal for me: a hundred euros' profit on a single sale, and I'll believe you have the eye.",
  ],
  dlg_trame_ch7: [
    "I had a look round your collection this morning, while you slept. Forgive me — old habit.",
    "There's taste in there. Real taste. Your grandmother would have moved two or three things, but she'd have smiled.",
    "Build it up further. A collection is a face: people should recognise you at first glance.",
  ],
  dlg_trame_ch8: [
    "Among collectors, they're whispering again about the queen's jewels. Rumours always come back through the salons.",
    "To get in, you need to show your credentials. A fine print, flawless — that's what opens those hushed doors.",
    "I spent thirty years watching for those whispers. You're the one who's going to sit at their table.",
  ],
  dlg_trame_ch9: [
    "There's clean work, and there's a master's work. Fifty years at the bench, and I can count on one hand those who've crossed that line.",
    "An object made new again is a life prolonged. Mine wore itself out doing just that — and I regret nothing.",
    "Take your time, choose your piece, and make it perfect. The Grand Salon deserves nothing less. Neither do you.",
  ],
  dlg_trame_ch10: [
    "Sit down. It's time I told you the end — or the beginning, depending how you look at it.",
    "The Queen's jewels. Fifty years I've searched for them. I've seen their trail cross three sales, two inventories, one lie. Every time, too late.",
    "It's for them that I missed Sundays, birthdays… your grandmother's pitcher. A dream, it lights the way — but it burns too, when you hold it too close.",
    "The Grand Antique Dealers' Salon is opening its doors to you — the organisers will write to you. That's where it all stops, or where it all comes together. Go for me.",
  ],
  dlg_trame_ch11: [
    "They're there, somewhere, among the display cases of the Grand Salon. I can feel it the way you feel a storm coming.",
    "I'm not coming. It's your eye that's needed now, not mine. Find them — and keep them. They're yours. The dream, though… that still belongs a little to me.",
  ],
  dlg_trame_ch12: [
    "So it's true. They exist. Right there, in your window… Let me look at them a little longer.",
    "Your grandmother would say the blue of the pitcher suited them better. She'd be right, as always.",
    "My dream is fulfilled — not the way I imagined it: better. You're the one who finished it. A story never belongs to the one who begins it, you know.",
    "Here: the keys. All of them. I've got a train tomorrow — Venice first, then we'll see. I'll write to you. Take care of the shop… it's always taken care of us.",
  ],
};
