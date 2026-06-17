import { ETATS_ORDRE } from "@/lib/etat";
import type { CourrierPayloadMission, Objet } from "@/types/game";

/**
 * Une mission est *livrable* si le joueur a dans son inventaire au moins un
 * objet matchant la cible (`templateId`) hors restauration, dans un état
 * supérieur ou égal à `etatMin` (ou n'importe quel état si `etatMin` est
 * absent).
 */
export function estMissionLivrable(
  payload: CourrierPayloadMission,
  inventaire: Objet[],
): boolean {
  const minIdx = payload.cible.etatMin
    ? ETATS_ORDRE.indexOf(payload.cible.etatMin)
    : 0;
  return inventaire.some(
    (o) =>
      o.templateId === payload.cible.templateId &&
      !o.enRestauration &&
      ETATS_ORDRE.indexOf(o.etat) >= minIdx,
  );
}
