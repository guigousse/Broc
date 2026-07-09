import type { CleMessageNego } from "@/types/game";

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
  ouvertureAchat: ["Slide the cursor to name your price."],
  ouvertureVente: ["The customer's made you an offer. Your move."],
  contreVendeur: [
    "“Go on then, I'll do you a little favour, {prix} €…”",
    "“Hmm. Let's say {prix} €.”",
    "“{prix} € and not another word.”",
    "“I can come down to {prix} €, that's my best.”",
  ],
  contreClient: [
    "“I can go a touch higher: {prix} €.”",
    "“{prix} €, and that's an honest offer.”",
    "“Fine, {prix} € if you wrap it up for me.”",
  ],
  refusPoliVendeur: [
    "“Right, I'll pack it away. Shame, though.”",
    "“Never mind, another time then.”",
  ],
  refusPoliClient: [
    "“Never mind, I'll look elsewhere.”",
    "“I'll pass, thanks.”",
  ],
  fache: [
    "“Are you having a laugh?!”",
    "“You're trying my patience.”",
  ],
  accord: [
    "Deal at {prix} €.",
    "Sold for {prix} €.",
  ],
  relance: ["“Alright… go on, I'll hear you out one last time.”"],
  diplomate: [
    "“My ceiling is {cibleSecrete} €. One last time — I'm listening.”",
  ],
  bonimentConclu: ["“Deal! You've got the knack…”"],
  bonimentDernierMot: ["“That's my final word: take it or leave it.”"],
  lotGarni: ["“Hmm, both together? Make me a price…”"],
};
