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
    "Ah, the smell of old things in the early morning… Today I'm the guide: four objects, four lessons.",
    "Look at that turntable. Pretty, eh? Open “Haggle” and offer him next to nothing — let's see what happens.",
  ],
  tuto_nego_echec_avant: [
    "Go on, dare: slide the cursor right down and make the offer. Worst case, he growls.",
  ],
  tuto_nego_echec_apres: [
    "There — he's miffed! An offer that low is like trampling his flowerbeds: every seller has a threshold… and a temper.",
    "With experience — levels, skills, a sharper eye — you'll know how low you can go without ruffling anyone.",
    "It happens to the best of us. Next stall: let me show you the opposite.",
  ],
  tuto_achat_direct_avant: [
    "That crystal carafe… at this price, it's a steal. Sometimes you don't haggle: you hand over the notes before someone else does.",
  ],
  tuto_achat_direct_apres: [
    "Good. Spotting a bargain at first glance — that's the trade already.",
  ],
  tuto_nego_un_avant: [
    "A Vibraduo controller! Collectors adore these. This time, haggle for real: stay inside the slider's zone — not too low, not too high.",
  ],
  tuto_nego_un_apres: [
    "Your first successful haggle! Did you see the back-and-forth? You climb, he comes down… and you meet in the middle.",
  ],
  tuto_nego_deux_avant: [
    "Oh… a mohair teddy bear. Your grandmother had the very same on her armchair. Haggle it for me nicely, will you?",
  ],
  tuto_nego_deux_apres: [
    "Haggled like a pro! Take good care of that one… I have a little idea about its future.",
  ],
  tuto_chine_sortir: [
    "We've spent enough for today — keep some coins for what's next. Browse the last stalls if you like, then take the exit.",
  ],
  tuto_retour: [
    "Three finds in one trip! But a dealer who piles things up is a dealer who loses them. A place for everything.",
    "Open the Storage, down there — let me show you around the back room.",
  ],
  tuto_peluche_collection: [
    "The teddy bear… Don't sell that one. Some objects are for keeping — that's what a collection is.",
    "Send it to your collection: tap its little button, right there.",
  ],
  tuto_collection_lecon: [
    "See that number? The value of your collection. That's what builds your reputation as a dealer.",
    "And look: the Sunday flea market is already opening its doors to you. People are starting to talk, kid!",
    "Now, selling. Back to the office — the door awaits.",
  ],
  tuto_colis_avant: [
    "Before we go selling — here: a parcel from me. A few pieces from the shop to fill your first stall.",
    "Open it — it's waiting by the door.",
  ],
  tuto_prix_avant: [
    "Pricing is half the trade. Too high, nobody stops; too low, you work for nothing.",
    "I've already tagged my pieces. For the controller and the carafe, slide the cursor to the price I show you — a small margin, under market: it sells fast.",
  ],
  tuto_prix_apres: [
    "Honest tags, those. Off we go — customers don't wait.",
  ],
  tuto_vente_entree: [
    "Fine stall! I'll stay with you for this first one — and lucky you: around here, I know everybody.",
    "Three faces will come by. Listen to them, and remember: YOU hold the price.",
  ],
  tuto_vente_refus_avant: [
    "Well, well — Maxime from the flea pit… He always offers next to nothing. Hear him out — and don't be afraid to let him walk.",
  ],
  tuto_vente_refus_apres: [
    "There you go. Turning down a bad sale is already a win. The carafe will find its buyer — at the right price.",
  ],
  tuto_vente_directe_avant: [
    "Ah, Léo! A friend — and mad about old controllers. At a fair price, he won't even argue.",
  ],
  tuto_vente_directe_apres: [
    "See? An honest price sells itself. The till is singing already.",
  ],
  tuto_vente_nego_avant: [
    "Bérénice, the decorator. She'll haggle — she can't help it… Hold your price: she'll come up.",
  ],
  tuto_vente_nego_apres: [
    "Your first real sales negotiation. You held firm — there's not much left for me to teach you.",
    "Close the stall whenever you like, and let's head home. I've a couple more words for you at the house.",
  ],
  tuto_conclusion: [
    "You have the eye, and the hands… all you're missing is the years. The shop is in good hands.",
    "Here: my order book. People write down what they're looking for. Go on, open it — I've something to put in it, as it happens.",
    "And the postman came by: a letter from your mother, I believe. Off to work now… I'll be in my armchair if you need me.",
  ],
  dlg_trame_ch1: [
    "Ah, you're opening it… Then write, lad. The very first line shall be mine.",
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
    "Let me look at them a little longer, before I go. You never tire of a dream — even a fulfilled one.",
    "Your grandmother would say the blue of the pitcher suited them better. She'd be right, as always.",
    "My dream is fulfilled — not the way I imagined it: better. You're the one who finished it. A story never belongs to the one who begins it, you know.",
    "Here: the keys. All of them. I've got a train tomorrow — Venice first, then we'll see. I'll write to you. Take care of the shop… it's always taken care of us.",
  ],
  dlg_trame_salons: [
    "The salons, kid — they're another country. People speak lower there, and count faster. My first time, I kept my hands in my pockets all day — for fear they'd be seen trembling.",
    "Anyone can pull off one fine coup. What makes a dealer is the till that sings every night. Regularity — that's true elegance.",
    "Three thousand euros in sales. Make them sing — and up there, they'll remember your name without you ever giving it.",
  ],
  dlg_trame_grand_coup: [
    "Do you remember my silver snuffbox? The one I let slip for pennies. I still think about it, some winter nights.",
    "In the salons, revenge has another flavour. The pieces are finer, the eyes sharper — and other people's mistakes are worth gold there.",
    "Do it for me: three hundred euros clear on a single sale. The snuffbox will be avenged, and I'll finally sleep easy.",
  ],
  dlg_trame_antichambre: [
    "The whispers are back, kid. The Queen's jewels — they're talking about them again in the salons, under their breath, as always.",
    "Fifty years I've been listening for that rumour. Every time, it dies out. This time… this time I believe it's still burning.",
    "The Grand Salon only opens to showcases that speak for themselves. Five thousand euros of collection — and doors will open for you that I only ever glimpsed.",
  ],
  dlg_trame_heritage: [
    "So it's true. They exist. I walked past your showcase ten times this morning — and ten times I forgot what I'd come for.",
    "But a fulfilled dream doesn't pay the rent, and a showcase is not a mausoleum. The shop must live on — after me, after the jewels, after all of it.",
    "Show me the trade goes on: two thousand euros in sales. After which… I have a suitcase to pack, I believe.",
  ],
  anniv_cadeau: [
    "Happy birthday, little one! Your mother never forgets the date — and she knows how to choose.",
    "A jazz record! Head to Storage and add it to your collection — a shelved vinyl is a song earned.",
    "Then come back to the office: the gramophone will make it sing.",
  ],
  anniv_fin: [
    "Ah, that swing! It makes me forty years younger.",
    "Other records are sleeping out there in the flea markets. Never hesitate to add them to your collection — every disc is a song waiting to be discovered.",
  ],
  anniv_cadeau_recurrent: [
    "Happy birthday, kid! Your mother never forgets the date — this year again, the postman arrived whistling.",
    "Another record for your collection! Go add it in Storage — the gramophone is waiting for it.",
  ],
  gazette_tuto: [
    "Ah, you found it! The Pickers' Gazette — fifty years I've read it every Monday. This one's on me.",
    "Look at the trends column: it tells you which categories are hot this week. The more of a connoisseur you become, the more it reveals.",
    "The weather report announces the weather at the flea markets — and the crowds that come with it. You'll read it with the “Weather report” skill.",
    "The society column whispers which celebrity will visit which market… Golden deals — for those with the “Society column” skill.",
    "And with some “Influence”, you can even have an article you don't like rewritten. Ah, the press…",
    "From next Monday, the kiosk will drop it at your door. A few coins well spent, believe me. I'll leave this one on the corner of the desk.",
  ],
};
