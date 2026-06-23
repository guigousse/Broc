import { BROCANTES } from "@/data/brocantes";
import { calculerBrocantesDebloqueesParTier } from "@/lib/deblocage";
import {
  getTemplate,
  poolPourTier,
  type ObjetTemplate,
} from "@/data/objetTemplates";
import type { GameState } from "@/types/game";

/**
 * Ensemble des ObjetTemplate que le joueur peut effectivement trouver, à partir
 * des brocantes débloquées : pool générique du tier + poolExclusif résolu.
 * Exclut les uniques et légendaires (réservés au chinage / arc principal).
 */
export function objetsAtteignables(state: GameState): ObjetTemplate[] {
  const parTier = calculerBrocantesDebloqueesParTier(state);
  const idsDebloquees = new Set<string>();
  for (const set of parTier.values()) for (const id of set) idsDebloquees.add(id);

  const parTemplateId = new Map<string, ObjetTemplate>();
  for (const b of BROCANTES) {
    if (!idsDebloquees.has(b.id)) continue;
    for (const t of poolPourTier(b.tier)) parTemplateId.set(t.templateId, t);
    for (const exclId of b.poolExclusif) {
      const t = getTemplate(exclId);
      if (t) parTemplateId.set(t.templateId, t);
    }
  }
  return [...parTemplateId.values()].filter(
    (t) => !t.unique && t.rarete !== "legendaire",
  );
}
