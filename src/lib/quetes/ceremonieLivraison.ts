import type { RecompenseEffective } from "@/lib/recompenses";

/** Écart entre deux départs de jetons. */
export const DECALAGE_VOL_MS = 260;
/** Durée d'un vol — alignée sur la durée par défaut de flyToTab. */
export const VOL_MS = 620;
/** Respiration après le dernier atterrissage avant le retrait de la carte. */
export const SORTIE_APRES_DERNIER_MS = 450;

export type JetonVol = "xp" | "energie" | "argent" | "bazar";

/** Sélecteurs des cibles du header, par jeton. */
export const CIBLES_VOL: Record<JetonVol, string> = {
  xp: '[data-fly-target="xp-header"]',
  energie: '[data-fly-target="energie-header"]',
  argent: '[data-fly-target="caisse-header"]',
  // Le compteur de Bazarcoins, voisin de celui des euros dans la caisse. La
  // cible est posée sur le NOMBRE et non sur le bloc : les deux monnaies
  // partagent un libellé, et le centre du bloc tombe entre elles.
  bazar: '[data-fly-target="jetons-header"]',
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
 * Frise de la cérémonie de livraison. Ordre FIXE : XP, énergie, argent
 * (décision 2026-07-29), puis les BAZARCOINS (2026-08-26), chaque jeton
 * n'apparaissant que si son gain est non nul. Les vols se chevauchent
 * (départs espacés de DECALAGE_VOL_MS).
 *
 * Les Bazarcoins ferment la marche, et pas par hasard : ils atterrissent dans
 * la même caisse que les euros, à quelques pixels de là. Lancés ensemble, les
 * deux vols se disputeraient le même coin de l'écran et l'on ne saurait plus
 * laquelle des deux monnaies vient de grossir.
 */
export function phasesLivraison(r: RecompenseEffective): EtapeLivraisonDatee[] {
  const jetons: JetonVol[] = [];
  if (r.xp > 0) jetons.push("xp");
  if (r.energie > 0) jetons.push("energie");
  if (r.argent > 0) jetons.push("argent");
  if (r.jetons > 0) jetons.push("bazar");

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
