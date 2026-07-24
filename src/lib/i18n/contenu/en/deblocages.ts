/**
 * Overlay EN des déblocages de niveau (spec i18n §2, SP3). Clé = titre FR canonique
 * de `src/data/deblocagesNiveau.ts` (pas d'id en data). Résolu À L'AFFICHAGE, fallback FR.
 * Les emojis des actives sont conservés à l'identique.
 */
export const DEBLOCAGES_EN: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)": "Skills screen unlocked (+1 point)",
  "Quêtes quotidiennes et hebdomadaires": "Daily and weekly quests",
  "Atout 🔍 Le Flair": "Asset 🔍 The Nose",
  "Atout 🧺 Le Lot garni": "Asset 🧺 The Bundle",
  "Atout 🧹 La Fouille": "Asset 🧹 The Rummage",
  "Paliers 2 des compétences": "Tier 2 of skills",
  "Paliers 3 des compétences": "Tier 3 of skills",
  "Atout 🎩 Le Boniment": "Asset 🎩 The Pitch",
  "Atout 💬 La Tchatche": "Asset 💬 The Gab",
  "Atout 📣 La Criée": "Asset 📣 The Cry",
  "Atout 🔍 Le Flair — 2ᵉ usage par jour": "Asset 🔍 The Nose — 2nd use per day",
  "Atout 🔍 Le Flair — 3ᵉ usage par jour": "Asset 🔍 The Nose — 3rd use per day",
  "Atout 🧺 Le Lot garni — 2ᵉ usage par jour": "Asset 🧺 The Bundle — 2nd use per day",
  "Atout 🧺 Le Lot garni — 3ᵉ usage par jour": "Asset 🧺 The Bundle — 3rd use per day",
  "Atout 🧹 La Fouille — 2ᵉ usage par jour": "Asset 🧹 The Rummage — 2nd use per day",
  "Atout 🧹 La Fouille — 3ᵉ usage par jour": "Asset 🧹 The Rummage — 3rd use per day",
  "Atout 🎩 Le Boniment — 2ᵉ usage par jour": "Asset 🎩 The Pitch — 2nd use per day",
  "Atout 🎩 Le Boniment — 3ᵉ usage par jour": "Asset 🎩 The Pitch — 3rd use per day",
  "Atout 💬 La Tchatche — 2ᵉ usage par jour": "Asset 💬 The Gab — 2nd use per day",
  "Atout 💬 La Tchatche — 3ᵉ usage par jour": "Asset 💬 The Gab — 3rd use per day",
  "Atout 📣 La Criée — 2ᵉ usage par jour": "Asset 📣 The Cry — 2nd use per day",
  "Atout 📣 La Criée — 3ᵉ usage par jour": "Asset 📣 The Cry — 3rd use per day",
};

export const DEBLOCAGES_DESC_EN: Record<string, string> = {
  "Ouverture de l'écran Compétences (+1 point)":
    "The library opens the Skills screen: spend your points (1 per tier) to sharpen your trade.",
  "Quêtes quotidiennes et hebdomadaires":
    "The mail brings commissions: a daily one, plus a more ambitious weekly one, rewarded in cash.",
  "Paliers 2 des compétences": "Tier 2 of every skill branch becomes purchasable.",
  "Paliers 3 des compétences": "Tier 3 — the top of every branch — becomes purchasable.",
  "Atout 🔍 Le Flair":
    "While hunting: reveals the true value of the item on display. One use per day.",
  "Atout 🧺 Le Lot garni":
    "Mid-negotiation at your stand: adds a second item to the customer's bundle, the lot's price is renegotiated as one. One use per day.",
  "Atout 🧹 La Fouille":
    "While hunting: the seller replaces the targeted item with a fresh find. One use per day.",
  "Atout 🎩 Le Boniment":
    "When selling: forces the close — if your price is fair the customer takes it on the spot, otherwise they reveal their exact budget without getting upset. One use per day.",
  "Atout 💬 La Tchatche":
    "While hunting: reopens a negotiation that just failed, the seller calms down. One use per day.",
  "Atout 📣 La Criée":
    "At your stand: draws the crowd — three customers show up back to back. One use per day.",
};
const DESC_USAGE_2_EN = "The asset can now be used twice a day.";
const DESC_USAGE_3_EN = "The asset can now be used three times a day.";
for (const t of ["Atout 🔍 Le Flair", "Atout 🧺 Le Lot garni", "Atout 🧹 La Fouille", "Atout 🎩 Le Boniment", "Atout 💬 La Tchatche", "Atout 📣 La Criée"]) {
  DEBLOCAGES_DESC_EN[`${t} — 2ᵉ usage par jour`] = DESC_USAGE_2_EN;
  DEBLOCAGES_DESC_EN[`${t} — 3ᵉ usage par jour`] = DESC_USAGE_3_EN;
}
