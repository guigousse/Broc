import type { Action, MotCle, TexteDuel } from "@/data/duel/types";
import type { DictionnaireUI } from "@/lib/i18n/ui";
import { tr } from "@/lib/i18n/ui";
import { libelleCategorie } from "@/lib/i18n/libelles";

function libelleAction(a: Action, d: DictionnaireUI): string {
  // Indexation dynamique par clé composée (`ac_degats_${cible}`, etc.) : tsc
  // refuse ces accès sur le type strict de `d.duel`, d'où ce cast local.
  const D = d.duel as unknown as Record<string, string>;
  switch (a.type) {
    case "degats":
      return a.valeur === 1
        ? D[`ac_degats_${a.cible}_un`]
        : tr(D[`ac_degats_${a.cible}`], { n: a.valeur });
    case "soinVitrine":
      return tr(D.ac_soinVitrine, { n: a.valeur });
    case "pioche":
      return a.valeur === 1 ? D.ac_pioche_un : tr(D.ac_pioche, { n: a.valeur });
    case "energie":
      return tr(D.ac_energie, { n: a.valeur });
    case "gain": {
      const cible = a.cible === "alliesCategorie" ? "categorie" : a.cible;
      return tr(D[`ac_gain_${cible}_${a.stat}`], {
        n: a.valeur,
        categorie: a.categorie ? libelleCategorie(a.categorie, d) : "",
      });
    }
    case "retourEnMain":
      return D.ac_retourEnMain;
    case "volMotCle":
      return D.ac_volMotCle;
  }
}

export function libelleMotCle(type: MotCle["type"], d: DictionnaireUI): string {
  const D = d.duel as unknown as Record<string, string>;
  return D[`mc_${type}`];
}

/** Le texte imprimé d'une carte : "" sans texte, un mot-clé nu, "Cri : action", ou "Déclencheur, action et action." */
export function libelleTexteDuel(texte: TexteDuel | undefined, d: DictionnaireUI): string {
  if (!texte) return "";
  const D = d.duel as unknown as Record<string, string>;
  if (texte.type === "cri") {
    const action: Action =
      texte.variante === "pioche"
        ? { type: "pioche", valeur: 1 }
        : texte.variante === "degat"
          ? { type: "degats", cible: "objetAdverse", valeur: 1 }
          : { type: "soinVitrine", valeur: 2 };
    return tr(D.mc_cri, { action: libelleAction(action, d) });
  }
  if (texte.type !== "effet") return libelleMotCle(texte.type, d);
  return `${D[`dc_${texte.declencheur}`]}, ${texte.actions.map((a) => libelleAction(a, d)).join(D.et)}.`;
}
