import { CATEGORIES } from "@/data/categories";
import type { CategorieObjet } from "@/types/game";
import type { OverlayCompetences } from "@/lib/i18n/contenu";

/**
 * Overlay EN des compétences (spec i18n §2, SP3). Le FR de `src/data/competences.ts`
 * reste canonique ; ces Record<Id, …> sont résolus À L'AFFICHAGE (fallback FR sinon).
 * Clés : `arbres` = treeId, `branches` = `${treeId}/${brancheId}`, `paliers` = CompetenceDef.id.
 * ⚠️ Les chiffres d'équilibrage sont conservés à l'identique (décimales EN : `0.75`, `%` collé).
 */

/** Libellé anglais de catégorie (miroir de ui/en.ts, local pour éviter un couplage au dictionnaire UI). */
const CAT_EN: Record<CategorieObjet, string> = {
  Musique: "Music",
  "Jeux & Loisirs": "Games & Hobbies",
  "Livres & Papeterie": "Books & Stationery",
  Mode: "Fashion",
  Maison: "Home",
  "Objets d'art": "Fine art",
  Bricolage: "DIY & Tools",
};

/** Les 4 branches thématiques partagent la même structure — 1 seule table de gabarits. */
function paliersThematiques(cat: CategorieObjet): OverlayCompetences["paliers"] {
  const c = CAT_EN[cat];
  return {
    [`cat.${cat}.reparer.1`]: {
      nom: `Apprentice — ${c}`,
      description: `You restore ${c} pieces in poor condition (Poor → Good, a few hours).`,
    },
    [`cat.${cat}.reparer.2`]: {
      nom: `Craftsman — ${c}`,
      description: `You perfect already-decent pieces (Good → Very good, a few hours).`,
    },
    [`cat.${cat}.reparer.3`]: {
      nom: `Master — ${c}`,
      description: `You can raise pieces to pristine and cut all ${c} restoration times by 40%.`,
    },
    [`cat.${cat}.connaisseur.1`]: {
      nom: `Watcher — ${c}`,
      description: `The Pickers' Gazette reveals the trend rate for the ${c} category.`,
    },
    [`cat.${cat}.connaisseur.2`]: {
      nom: `Savvy dealer — ${c}`,
      description: `On your stall (setup and selling), the market value of ${c} pieces is shown.`,
    },
    [`cat.${cat}.connaisseur.3`]: {
      nom: `Trained eye — ${c}`,
      description: `While picking, you read the true market value of ${c} items.`,
    },
    [`cat.${cat}.passion.1`]: {
      nom: `Enthusiast — ${c}`,
      description: `Customers pay +10% for ${c} items.`,
    },
    [`cat.${cat}.passion.2`]: {
      nom: `Devotee — ${c}`,
      description: `Customers pay +20% for ${c} items (replaces Enthusiast).`,
    },
    [`cat.${cat}.passion.3`]: {
      nom: `Fanatic — ${c}`,
      description: `Customers pay +30% for ${c} items (replaces Devotee).`,
    },
    [`cat.${cat}.oeil_aiguise.1`]: {
      nom: `Nimble tongue — ${c}`,
      description: `When a customer haggles over a ${c} item, they tolerate counteroffers +10% greedier.`,
    },
    [`cat.${cat}.oeil_aiguise.2`]: {
      nom: `Silver tongue — ${c}`,
      description: `When a customer haggles over a ${c} item, they tolerate counteroffers +20% greedier (replaces Nimble tongue).`,
    },
    [`cat.${cat}.oeil_aiguise.3`]: {
      nom: `Golden tongue — ${c}`,
      description: `When a customer haggles over a ${c} item, they tolerate counteroffers +30% greedier (replaces Silver tongue).`,
    },
  };
}

function arbreThematique(cat: CategorieObjet): { nom: string; baseline: string } {
  return { nom: CAT_EN[cat], baseline: `Specialize in ${CAT_EN[cat]}.` };
}

/** Branches thématiques : mêmes 4 libellés pour chaque catégorie, jamais de description (comme le FR). */
function branchesThematiques(cat: CategorieObjet): OverlayCompetences["branches"] {
  return {
    [`cat.${cat}/reparer`]: { nom: "Repair" },
    [`cat.${cat}/connaisseur`]: { nom: "Connoisseur" },
    [`cat.${cat}/passion`]: { nom: "Passion" },
    [`cat.${cat}/oeil_aiguise`]: { nom: "Keen eye" },
  };
}

export const COMPETENCES_EN: OverlayCompetences = {
  arbres: {
    general: { nom: "General", baseline: "The trade's core skills." },
    ...Object.fromEntries(CATEGORIES.map((cat) => [`cat.${cat}`, arbreThematique(cat)])),
  },
  branches: {
    "general/negociation": { nom: "Haggling", description: "Your counteroffers hold longer." },
    "general/charisme": { nom: "Charisma", description: "Your stall draws a crowd." },
    "general/presentation": {
      nom: "Insight",
      description: "You read your customers like an open book.",
    },
    "general/vision": {
      nom: "Market vision",
      description: "You read the business weather and the salon gossip.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => branchesThematiques(cat))),
  },
  paliers: {
    "general.negociation.1": {
      nom: "Silver tongue",
      description: "Customers tolerate counteroffers 20% greedier before getting annoyed.",
    },
    "general.negociation.2": {
      nom: "Golden tongue",
      description: "Customers tolerate counteroffers 40% greedier before getting annoyed.",
    },
    "general.negociation.3": {
      nom: "Diplomat",
      description:
        "Instead of storming off, the customer reveals their exact max price and grants you one last counteroffer (once per day).",
    },
    "general.charisme.1": {
      nom: "Neat display",
      description: "Passersby visit 25% more often (interval ×0.75).",
    },
    "general.charisme.2": {
      nom: "Good name",
      description: "The average appetite of all your customers is raised by +10%.",
    },
    "general.charisme.3": {
      nom: "Famed stand",
      description:
        "At least once a day, a deep-pocketed customer (appetite ×1.3) comes to see you.",
    },
    "general.presentation.1": {
      nom: "Soul reader",
      description:
        "You recognize your customers: their name and mood show in the haggling panel.",
    },
    "general.presentation.2": {
      nom: "Purse appraiser",
      description: "The customer's wealth class (small, medium or large purse) is shown.",
    },
    "general.presentation.3": {
      nom: "Keen eye",
      description: "The haggling panel shows the customer's exact max price.",
    },
    "general.vision.1": {
      nom: "Weather report",
      description: "The day's weather shows in the Gazette, with its effect on stand traffic.",
    },
    "general.vision.2": {
      nom: "Society column",
      description:
        "The celebrity announced this issue and the flea market hosting them are revealed to you (big boost to rares & legendaries while picking).",
    },
    "general.vision.3": {
      nom: "Influence",
      description:
        "Once per Gazette issue, you can reroll the day's weather or the society flea market.",
    },
    ...Object.assign({}, ...CATEGORIES.map((cat) => paliersThematiques(cat))),
  },
};
