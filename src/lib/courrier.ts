import type { Courrier, HuissierEvent } from "@/types/game";

/** ID stable du déclencheur « lettre starter de Maman ». */
export const ID_LETTRE_MAMAN_DEBUT = "lettre_maman_debut";

/** Lettre offerte au tout début du jeu : 150 € d'argent de poche. */
export function creerLettreMamanDebut(jour: number): Courrier {
  return {
    id: ID_LETTRE_MAMAN_DEBUT,
    type: "lettre",
    jourRecu: jour,
    lu: false,
    payload: {
      type: "lettre",
      expediteurId: "maman",
      titre: "Pour bien démarrer",
      corps: [
        "Mon cher enfant,",
        "Je sais que tu te lances dans cette nouvelle aventure de chineur, et je suis si fière de toi. Le marché aux puces est un monde merveilleux mais exigeant — sois patient, observe, apprends.",
        "Je glisse dans cette enveloppe 150 € pour t'aider à démarrer. Achète-toi un bel objet pour ta première vitrine, ou garde-les pour les jours plus difficiles.",
        "Pense à venir me voir quand tu auras un moment.",
      ],
      recompense: { argent: 150 },
    },
  };
}

export function creerCourrierHuissier(ev: HuissierEvent): Courrier {
  return {
    id: `huissier-${ev.jour}`,
    type: "huissier",
    jourRecu: ev.jour,
    lu: false,
    payload: {
      type: "huissier",
      detteAvantSaisie: ev.detteAvantSaisie,
      saisies: ev.saisies,
      budgetApres: ev.budgetApres,
    },
  };
}

export function migrerCourriers(
  existants: Courrier[] | undefined,
  dernierHuissier: HuissierEvent | null | undefined,
): Courrier[] {
  const base = Array.isArray(existants) ? [...existants] : [];
  if (!dernierHuissier) return base;
  const candidate = creerCourrierHuissier(dernierHuissier);
  if (base.some((c) => c.id === candidate.id)) return base;
  return [...base, candidate];
}
