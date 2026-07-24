import type { CleMessageNego, Temperament } from "@/types/game";

/**
 * Overlay EN des répliques de négociation (spec i18n §2, SP4). Même forme que
 * `POOLS_NEGO_FR` : une liste de variantes par clé. Reformulation (pas de
 * mot-à-mot) qui garde l'esprit marchand gouailleur, en anglais international.
 * Placeholders identiques au FR par clé (`{prix}`, `{cibleSecrete}`) — le test
 * `nego.test.ts` l'impose ; le nombre de variantes peut différer (modulo au
 * rendu). Résolu À L'AFFICHAGE via `texteNego()`. Guillemets anglais “ ” (le FR
 * garde « » ; l'ES ses comillas latinas).
 */
export const NEGO_EN: Record<CleMessageNego, string[]> = {
  ouvertureAchat: [
    "“Hello there! Come closer, have a look.”",
    "“Welcome! Everything's for sale — well, almost.”",
    "“Morning… caught your eye, has it?”",
  ],
  ouvertureVente: ["The customer's made you an offer. Your move."],
  contreVendeur: [
    "“Go on then, I'll do you a little favour, {prix} €…”",
    "“Hmm. Let's say {prix} €.”",
    "“{prix} € and not another word.”",
    "“I can come down to {prix} €, that's my best.”",
    "“You drive a hard bargain… {prix} €.”",
    "“Come on, {prix} €, let's split the difference.”",
  ],
  contreClient: [
    "“I can go a touch higher: {prix} €.”",
    "“{prix} €, and that's an honest offer.”",
    "“Fine, {prix} € if you wrap it up for me.”",
    "“Shall we say {prix} € and shake on it?”",
    "“{prix} €, final stretch.”",
  ],
  refusPoliVendeur: [
    "“Right, I'll pack it away. Shame, though.”",
    "“Never mind, another time then.”",
    "“No, I'm packing up. It's been a long day.”",
  ],
  refusPoliClient: [
    "“Never mind, I'll look elsewhere.”",
    "“I'll pass, thanks.”",
    "“Another time, perhaps.”",
  ],
  fache: [
    "“Are you having a laugh?!”",
    "“You're trying my patience.”",
    "“At that price, it's an insult!”",
    "“I wasn't born yesterday. Good day!”",
  ],
  accord: [
    "Deal at {prix} €.",
    "Sold for {prix} €.",
    "Done deal: {prix} €.",
    "Shake on it — {prix} €.",
  ],
  relance: [
    "“Alright… go on, I'll hear you out one last time.”",
    "“One last offer. Make it count.”",
  ],
  diplomate: [
    "“My ceiling is {cibleSecrete} €. One last time — I'm listening.”",
  ],
  bonimentConclu: ["“Deal! You've got the knack…”"],
  bonimentDernierMot: ["“That's my final word: take it or leave it.”"],
  lotGarni: ["“Hmm, both together? Make me a price…”"],
};

/**
 * Overlay EN des pools colorés par tempérament (même forme que
 * `POOLS_NEGO_TEMPERAMENT_FR`). Une clé/un tempérament absent retombe sur
 * `NEGO_EN` au rendu.
 */
export const NEGO_TEMPERAMENT_EN: Partial<
  Record<Temperament, Partial<Record<CleMessageNego, string[]>>>
> = {
  bourru: {
    ouvertureAchat: [
      "“What? Ah, hello. Look with your eyes, not your hands.”",
      "“Mornin'. This isn't a museum — it's for sale.”",
    ],
    contreVendeur: [
      "“{prix} €. And count yourself lucky.”",
      "“Pfft… {prix} €, and that's final.”",
      "“I haven't got all day. {prix} €, take it or leave it.”",
    ],
    contreClient: [
      "“{prix} €. That's already overpaying.”",
      "“I'll go to {prix} €, and only because it's about to rain.”",
      "“{prix} €. Keep haggling and I'm gone.”",
    ],
    refusPoliVendeur: [
      "“We're done here. Move along.”",
      "“No. Put your coins away, I'm packing up.”",
    ],
    refusPoliClient: [
      "“Bah. Keep your knick-knack.”",
      "“Didn't want it that much anyway.”",
    ],
    fache: [
      "“Who do you take me for?!”",
      "“Clear off! I don't deal with jokers.”",
    ],
    accord: [
      "“{prix} €, done. And no complaints after.”",
      "“Fine. {prix} €, shake, and let's be done with it.”",
    ],
    relance: ["“Hmph… Fine. One last offer, and make it good.”"],
  },
  chaleureux: {
    ouvertureAchat: [
      "“Hello, hello! Come in close, make yourself at home.”",
      "“Ah, a friendly face! Welcome — browse all you like.”",
    ],
    contreVendeur: [
      "“Go on, just for you: {prix} €, because I like your face.”",
      "“We'll work something out… say {prix} €, how's that?”",
      "“{prix} €, and I'll throw in its story for free.”",
    ],
    contreClient: [
      "“I can stretch to {prix} € without upsetting my piggy bank.”",
      "“{prix} €, and you'd make my day.”",
      "“Go on, {prix} € — it brings back so many memories…”",
    ],
    refusPoliVendeur: [
      "“It'll be no for today — but do come back, won't you?”",
      "“Another time perhaps, no hard feelings.”",
    ],
    refusPoliClient: [
      "“More's the pity… it was lovely, though.”",
      "“I'll sleep on it — thank you kindly all the same.”",
    ],
    fache: [
      "“Oh… now you've gone and hurt my feelings.”",
      "“Really! I thought you kinder than that.”",
    ],
    accord: [
      "“{prix} €, there we are! Take good care of it, promise?”",
      "“Sold for {prix} € — a bargain for you, a joy for me.”",
    ],
    relance: ["“Oh, I never could say no… go on, one last time.”"],
  },
  radin: {
    ouvertureAchat: [
      "“Hello. Fair warning: nothing here comes free.”",
      "“Morning… good timing, everything must go. At the right price, mind.”",
    ],
    contreVendeur: [
      "“{prix} €… and I'm already losing money, I swear.”",
      "“Fine, {prix} €, but only because business is dead today.”",
      "“{prix} €. Any lower and I'm keeping it for my sister-in-law.”",
    ],
    contreClient: [
      "“{prix} €, and I'm skipping lunch this week.”",
      "“Scraping the bottom of my pockets: {prix} €.”",
      "“{prix} €, that's everything I've got — I counted twice.”",
    ],
    refusPoliVendeur: [
      "“At that price I'd rather keep it — it hardly takes up room.”",
      "“No no, it'll be worth more next year.”",
    ],
    refusPoliClient: [
      "“Too rich for me, never mind.”",
      "“My bank manager would kill me. I'll pass.”",
    ],
    fache: [
      "“Are you after ruining me?!”",
      "“What next, my life savings too?”",
    ],
    accord: [
      "“{prix} €… fine. But you're twisting my arm.”",
      "“{prix} € it is — and we tell no one I caved.”",
    ],
    relance: ["“Wait… I've done my sums again. I'm listening.”"],
  },
  raffine: {
    ouvertureAchat: [
      "“Welcome. You have the eye, I can already tell.”",
      "“Good day. Take your time — beautiful things deserve it.”",
    ],
    contreVendeur: [
      "“This piece has provenance, and that has its price: {prix} €.”",
      "“{prix} €. Good taste costs, dear friend.”",
      "“Say {prix} €, and you walk away with a fragment of history.”",
    ],
    contreClient: [
      "“{prix} €, not a cent more — I have an eye for fair value.”",
      "“I shall concede {prix} €, for the love of the piece.”",
      "“{prix} €. Beyond that, it's mere speculation.”",
    ],
    refusPoliVendeur: [
      "“It shall wait for a discerning buyer. Good day.”",
      "“We are clearly not speaking the same language. No offence taken.”",
    ],
    refusPoliClient: [
      "“The piece doesn't merit that price, alas.”",
      "“I yield — my budget has its principles.”",
    ],
    fache: [
      "“An insult to good taste!”",
      "“One does not haggle so over such a piece. Farewell.”",
    ],
    accord: [
      "“{prix} €. An excellent choice — you have the eye.”",
      "“Done at {prix} € — it will look splendid at your home.”",
    ],
    relance: ["“Very well. Elegance commands I hear one final proposal.”"],
  },
  bavard: {
    ouvertureAchat: [
      "“Ah, hello! I was just telling my neighbour — anyway, come closer!”",
      "“Welcome, welcome! Every piece here has a story — just ask!”",
    ],
    contreVendeur: [
      "“{prix} €! And I swear my cousin offered me double — anyway, {prix} €.”",
      "“Listen, between us: {prix} €, and that's a secret.”",
      "“{prix} €, and I'll tell you where I found it — incredible story!”",
    ],
    contreClient: [
      "“{prix} €, though everyone says I always overpay — anyway, {prix} €!”",
      "“Right, between people who know how to talk: {prix} €.”",
      "“{prix} €, and believe me, I've seen a few stalls in my time!”",
    ],
    refusPoliVendeur: [
      "“Ah well! But stay a moment, let me tell you how I got it…”",
      "“No deal, but what a pleasure to chat!”",
    ],
    refusPoliClient: [
      "“Never mind! My car's full anyway, if you only knew…”",
      "“I'll pass — but truly, lovely talking to you!”",
    ],
    fache: [
      "“Well, I'm speechless. And believe me, that's rare!”",
      "“You'd anger a chatterbox — and that's saying something!”",
    ],
    accord: [
      "“{prix} €, done! This story will be told, believe me.”",
      "“Shake on it, {prix} €! The whole market will hear about this.”",
    ],
    relance: ["“Well, well… I never could hold my tongue. I'm listening.”"],
  },
  passionne: {
    ouvertureAchat: [
      "“Hello! Everything here was chosen with love, believe me.”",
      "“Welcome… ah, I see you're eyeing the finest piece.”",
    ],
    contreVendeur: [
      "“{prix} €… I know this piece by heart, it's worth every cent.”",
      "“For someone who'll truly appreciate it: {prix} €.”",
      "“{prix} €. Look at that condition — you won't find another.”",
    ],
    contreClient: [
      "“{prix} €! I've been hunting that one for years.”",
      "“I'll go to {prix} € — the heart has its reasons.”",
      "“{prix} €… my collection is calling for it, be a sport.”",
    ],
    refusPoliVendeur: [
      "“Then it stays with me. You don't give away what you love.”",
      "“Never mind. It will find its connoisseur.”",
    ],
    refusPoliClient: [
      "“The heart was willing, the wallet wasn't. A shame.”",
      "“It would have made my year… but not at that price.”",
    ],
    fache: [
      "“You don't speak of a piece like that in those terms!”",
      "“Have you no respect for fine craft?!”",
    ],
    accord: [
      "“{prix} € — it's going to good hands, that's some comfort.”",
      "“Deal at {prix} €. You're holding a little treasure, you know.”",
    ],
    relance: ["“For this one, I'll lend an ear one last time.”"],
  },
};
