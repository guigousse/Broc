/**
 * Rappel de retour par inactivité : série progressive J+1 / J+3 / J+7.
 * Programmée quand l'app passe en arrière-plan, annulée à la réouverture.
 * Ne prompt JAMAIS la permission (no-op silencieux si non accordée) — le
 * prompt reste l'affaire du flux énergie.
 */
import { NOTIF_IDS } from "./ids";
import {
  type NotifSpec,
  programmer,
  annuler,
  permissionAccordee,
} from "./index";

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Définition de la série (offset depuis la sortie + textes, ton du jeu). */
const RAPPELS: { offsetMs: number; title: string; body: string }[] = [
  {
    offsetMs: 1 * JOUR_MS,
    title: "Ta brocante prend la poussière…",
    body: "Reviens chiner, le camion t'attend !",
  },
  {
    offsetMs: 3 * JOUR_MS,
    title: "Des affaires t'attendent !",
    body: "De nouvelles trouvailles sont à dénicher.",
  },
  {
    offsetMs: 7 * JOUR_MS,
    title: "On range le camion ?",
    body: "Reviens vite récupérer ton énergie ⚡",
  },
];

/** Construit les 3 specs à partir de l'instant de sortie `now` (epoch ms). Pur. */
export function construireRappels(now: number): NotifSpec[] {
  return RAPPELS.map((r, i) => ({
    id: NOTIF_IDS.RAPPEL_RETOUR[i],
    title: r.title,
    body: r.body,
    sound: "default",
    atMs: now + r.offsetMs,
  }));
}

/** (Re)programme la série depuis `now`. No-op si permission non déjà accordée. */
export async function programmerRappelRetour(now: number): Promise<void> {
  if (!(await permissionAccordee())) return;
  for (const spec of construireRappels(now)) {
    await programmer(spec);
  }
}

/** Annule toute la série (à la réouverture de l'app). */
export async function annulerRappelRetour(): Promise<void> {
  await annuler([...NOTIF_IDS.RAPPEL_RETOUR]);
}
