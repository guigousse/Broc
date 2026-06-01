import type { Courrier, HuissierEvent } from "@/types/game";

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
