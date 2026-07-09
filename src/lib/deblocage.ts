import type {
  Brocante,
  CategorieObjet,
  ConditionDeblocage,
  GameState,
} from "@/types/game";
import { valeurTotale, valeurParCategorie } from "@/lib/collection";
import { brocantesParTier } from "@/data/brocantes";
import { tr, type DictionnaireUI } from "@/lib/i18n/ui";
import { libelleCategorie } from "@/lib/i18n/libelles";

/**
 * Description complète et localisée d'une condition de déblocage (SP4 i18n).
 * Les valeurs de logique/save ne changent jamais ; seul le libellé rendu passe
 * par le dictionnaire. `{etoiles}` est construit côté logique (⭐ répétées).
 */
export function descriptionCondition(
  c: ConditionDeblocage,
  d: DictionnaireUI,
): string {
  const L = d.deblocage.long;
  switch (c.type) {
    case "depart":
      return L.depart;
    case "jour":
      return tr(L.jour, { jour: c.jour });
    case "budget":
      return tr(L.budget, { montant: c.montant });
    case "ventesCategorie":
      return tr(c.nombre > 1 ? L.ventesCategorieN : L.ventesCategorieUn, {
        nombre: c.nombre,
        categorie: libelleCategorie(c.categorie, d),
      });
    case "brocantesDebloquees":
      return tr(
        c.nombre > 1 ? L.brocantesDebloqueesN : L.brocantesDebloqueesUn,
        { nombre: c.nombre, etoiles: "⭐".repeat(c.tier) },
      );
    case "valeurCollection":
      return tr(L.valeurCollection, { montant: c.montant });
    case "valeurCollectionCategorie":
      return tr(L.valeurCollectionCategorie, {
        categorie: libelleCategorie(c.categorie, d),
        montant: c.montant,
      });
    case "niveau":
      return tr(L.niveau, { niveau: c.niveau });
    case "ET":
      return c.conditions.map((cc) => descriptionCondition(cc, d)).join(" + ");
  }
}

/** Compte les ventes d'une catégorie donnée à travers l'historique. */
function compterVentesCategorie(
  historique: GameState["historique"],
  cat: CategorieObjet,
): number {
  let n = 0;
  for (const s of historique) {
    if (s.type !== "vente") continue;
    for (const v of s.ventes) {
      if (v.categorie === cat) n += 1;
    }
  }
  return n;
}

/** Retourne une courte description de la condition de déblocage d'une brocante. */
export function decrireConditions(
  brocante: Brocante,
  _state: GameState,
  d: DictionnaireUI,
): string {
  return descriptionCondition(brocante.conditionDeblocage, d);
}

/**
 * Variante compacte AVEC progression, style :
 *   "Collection : 1280/1600 €"
 *   "Musique : 420/500 €"
 *   "Brocantes ★★ : 3/4"
 *
 * `state` est requis pour calculer la valeur actuelle du joueur. Pour
 * les conditions "brocantesDebloquees", `parTier` (résultat de
 * calculerBrocantesDebloqueesParTier) est nécessaire.
 */
export function descriptionConditionCourte(
  c: ConditionDeblocage,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
  d: DictionnaireUI,
  parTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): string {
  const C = d.deblocage.court;
  switch (c.type) {
    case "depart":
      return C.disponible;
    case "jour":
      return tr(C.jour, { actuel: state.jourActuel, jour: c.jour });
    case "budget":
      return tr(C.budget, { actuel: state.budget, montant: c.montant });
    case "ventesCategorie": {
      const n = compterVentesCategorie(state.historique, c.categorie);
      return tr(C.ventesCategorie, {
        categorie: libelleCategorie(c.categorie, d),
        n,
        nombre: c.nombre,
      });
    }
    case "brocantesDebloquees": {
      const n = parTier?.get(c.tier)?.size ?? 0;
      return tr(C.brocantesDebloquees, {
        etoiles: "★".repeat(c.tier),
        n,
        nombre: c.nombre,
      });
    }
    case "valeurCollection":
      return tr(C.valeurCollection, {
        actuel: Math.floor(valeurTotale(state.collection)),
        montant: c.montant,
      });
    case "valeurCollectionCategorie":
      return tr(C.valeurCollectionCategorie, {
        categorie: libelleCategorie(c.categorie, d),
        actuel: Math.floor(valeurParCategorie(state.collection, c.categorie)),
        montant: c.montant,
      });
    case "niveau":
      // Défensif : cf. commentaire dans evaluerCondition.
      return tr(C.niveau, {
        niveau: c.niveau,
        actuel: state.brocanteur?.niveau ?? 0,
      });
    case "ET":
      return c.conditions
        .map((cc) => descriptionConditionCourte(cc, state, d, parTier))
        .join(" + ");
  }
}

/** Liste les conditions de déblocage atomiques (déplie le ET). */
export function decrireConditionsCourtes(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
  d: DictionnaireUI,
  parTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): string[] {
  const c = brocante.conditionDeblocage;
  if (c.type === "ET") {
    return c.conditions.map((cc) =>
      descriptionConditionCourte(cc, state, d, parTier),
    );
  }
  return [descriptionConditionCourte(c, state, d, parTier)];
}

/** Décrit chaque condition atomique avec un drapeau "satisfaite ?". */
export interface ConditionInfo {
  text: string;
  met: boolean;
}

export function listerConditionsAvecEtat(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
  d: DictionnaireUI,
  parTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): ConditionInfo[] {
  const c = brocante.conditionDeblocage;
  const atomic = c.type === "ET" ? c.conditions : [c];
  return atomic.map((cc) => ({
    text: descriptionConditionCourte(cc, state, d, parTier),
    met: evaluerCondition(cc, state, parTier),
  }));
}

/**
 * Calcule, tier par tier (en cascade : les conditions `brocantesDebloquees`
 * d'un tier supérieur voient les tiers inférieurs déjà résolus), l'ensemble
 * des brocantes débloquées. À passer à `estDebloquee` pour toute brocante
 * dont la condition référence d'autres brocantes.
 */
export function calculerBrocantesDebloqueesParTier(
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
): Map<1 | 2 | 3 | 4, Set<string>> {
  const m = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set()],
    [2, new Set()],
    [3, new Set()],
    [4, new Set()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, m)) m.get(tier)!.add(b.id);
    }
  }
  return m;
}

export function estDebloquee(
  brocante: Brocante,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  return evaluerCondition(
    brocante.conditionDeblocage,
    state,
    brocantesDebloqueesParTier,
  );
}

export function evaluerCondition(
  c: ConditionDeblocage,
  state: Pick<GameState, "jourActuel" | "budget" | "historique" | "collection" | "brocanteur">,
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
): boolean {
  switch (c.type) {
    case "depart":
      return true;
    case "jour":
      return state.jourActuel >= c.jour;
    case "budget":
      return state.budget >= c.montant;
    case "ventesCategorie":
      return compterVentesCategorie(state.historique, c.categorie) >= c.nombre;
    case "brocantesDebloquees": {
      const set = brocantesDebloqueesParTier?.get(c.tier);
      return (set?.size ?? 0) >= c.nombre;
    }
    case "valeurCollection":
      return valeurTotale(state.collection) >= c.montant;
    case "valeurCollectionCategorie":
      return valeurParCategorie(state.collection, c.categorie) >= c.montant;
    case "niveau":
      // Défensif : un save passé par le filet de sécurité de migration peut
      // manquer `brocanteur` (cf. migrations.ts → assurerFiletSecuriteMinimal).
      return (state.brocanteur?.niveau ?? 0) >= c.niveau;
    case "ET":
      return c.conditions.every((cc) =>
        evaluerCondition(cc, state, brocantesDebloqueesParTier),
      );
  }
}
