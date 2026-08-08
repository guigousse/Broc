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

/**
 * Trace à afficher/aimanter pour l'étape courante : la PREMIÈRE trace exigée
 * par l'étape qui n'est PAS encore posée dans le coffre actuel — contrairement
 * à `traceActive`, qui n'est fonction que de l'étape et reste bloquée sur la
 * trace 2 (carafe) une fois `coffre-trace-deux` atteinte, MÊME si la trace 1
 * (manette) a depuis été délogée (drag qui continue après l'avancement
 * d'étape, sortie/rentrée dans la prep, etc.).
 *
 * `tracesToutesPosees` est cumulative (les deux traces comptent dès l'étape
 * deux) alors que `traceActive` est une fonction pure de l'étape seule : le
 * couple pouvait diverger — Valider se débloque, ou se rebloque, sans que le
 * fantôme/la main affichée pointe vers l'objet réellement manquant.
 * `traceAPoser` aligne l'affichage sur le même critère que le gate.
 */
export function traceAPoser(
  etape: TutorielEtape,
  coffre: readonly ObjetEnVitrine[],
): TraceScenario | null {
  if (etape === "coffre-trace-un") {
    return poseeDans(coffre, TRACES_TUTORIEL[0]) ? null : TRACES_TUTORIEL[0];
  }
  if (etape === "coffre-trace-deux") {
    if (!poseeDans(coffre, TRACES_TUTORIEL[0])) return TRACES_TUTORIEL[0];
    if (!poseeDans(coffre, TRACES_TUTORIEL[1])) return TRACES_TUTORIEL[1];
    return null;
  }
  return null;
}
