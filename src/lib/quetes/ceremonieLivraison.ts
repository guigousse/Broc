import type { RecompenseEffective } from "@/lib/recompenses";

/** Écart entre deux départs de jetons. */
export const DECALAGE_VOL_MS = 260;
/** Durée d'un vol — alignée sur la durée par défaut de flyToTab. */
export const VOL_MS = 620;
/** Respiration après le dernier atterrissage avant le retrait de la carte. */
export const SORTIE_APRES_DERNIER_MS = 450;

export type JetonVol = "xp" | "energie" | "argent";

/** Sélecteurs des cibles du header, par jeton. */
export const CIBLES_VOL: Record<JetonVol, string> = {
  xp: '[data-fly-target="xp-header"]',
  energie: '[data-fly-target="energie-header"]',
  argent: '[data-fly-target="caisse-header"]',
};

export type EtapeLivraison =
  /** Le jeton quitte le bandeau de la carte. */
  | { type: "envol"; jeton: JetonVol }
  /** Le jeton atteint sa cible : dégel du compteur correspondant. */
  | { type: "atterrissage"; jeton: JetonVol }
  /** Fin : la carte livrée quitte la liste des actives. */
  | { type: "sortie" };

export interface EtapeLivraisonDatee {
  at: number;
  etape: EtapeLivraison;
}

/**
 * Frise de la cérémonie de livraison. Ordre FIXE : XP puis énergie puis
 * argent (décision 2026-07-29), chaque jeton n'apparaissant que si son gain
 * est non nul. Les vols se chevauchent (départs espacés de DECALAGE_VOL_MS).
 */
export function phasesLivraison(r: RecompenseEffective): EtapeLivraisonDatee[] {
  const jetons: JetonVol[] = [];
  if (r.xp > 0) jetons.push("xp");
  if (r.energie > 0) jetons.push("energie");
  if (r.argent > 0) jetons.push("argent");

  const plan: EtapeLivraisonDatee[] = [];
  jetons.forEach((jeton, i) => {
    const depart = i * DECALAGE_VOL_MS;
    plan.push({ at: depart, etape: { type: "envol", jeton } });
    plan.push({ at: depart + VOL_MS, etape: { type: "atterrissage", jeton } });
  });
  const dernier = plan.length > 0 ? plan[plan.length - 1].at : -SORTIE_APRES_DERNIER_MS;
  plan.sort((a, b) => a.at - b.at);
  plan.push({ at: dernier + SORTIE_APRES_DERNIER_MS, etape: { type: "sortie" } });
  return plan;
}
