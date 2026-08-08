import type { ObjetEnVitrine, TutorielEtape } from "@/types/game";
import {
  TOLERANCE_TRACE_POS, TOLERANCE_TRACE_ROT, TRACES_TUTORIEL,
  type TraceScenario,
} from "@/data/tutorielScenario";

/** Trace fantôme à afficher pour l'étape courante du tutoriel du coffre. */
export function traceActive(etape: TutorielEtape): TraceScenario | null {
  if (etape === "coffre-trace-un") return TRACES_TUTORIEL[0];
  if (etape === "coffre-trace-deux") return TRACES_TUTORIEL[1];
  return null;
}

/** L'objet est-il posé sur la trace (distance ET angle dans les tolérances) ? */
export function estSurTrace(
  ov: Pick<ObjetEnVitrine, "posX" | "posY" | "rotation">,
  trace: TraceScenario,
): boolean {
  if (ov.posX === undefined || ov.posY === undefined) return false;
  const dist = Math.hypot(ov.posX - trace.posX, ov.posY - trace.posY);
  if (dist > TOLERANCE_TRACE_POS) return false;
  const rot = (((ov.rotation ?? 0) % 360) + 360) % 360;
  const brut = Math.abs(rot - trace.rotation);
  return Math.min(brut, 360 - brut) <= TOLERANCE_TRACE_ROT;
}

function poseeDans(coffre: readonly ObjetEnVitrine[], trace: TraceScenario): boolean {
  const ov = coffre.find((o) => o.objet.templateId === trace.templateId);
  return !!ov && estSurTrace(ov, trace);
}

/**
 * Le bouton Valider du coffre n'est actif, pendant le tutoriel, que quand
 * les traces exigées par l'étape sont satisfaites. Hors étapes coffre :
 * toujours vrai (fail-open).
 */
export function tracesToutesPosees(
  etape: TutorielEtape,
  coffre: readonly ObjetEnVitrine[],
): boolean {
  if (etape === "coffre-trace-un") return poseeDans(coffre, TRACES_TUTORIEL[0]);
  if (etape === "coffre-trace-deux") {
    return poseeDans(coffre, TRACES_TUTORIEL[0]) && poseeDans(coffre, TRACES_TUTORIEL[1]);
  }
  return true;
}
