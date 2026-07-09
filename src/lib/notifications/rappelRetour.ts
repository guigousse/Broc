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
import type { Locale } from "@/lib/i18n/locales";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Construit les 3 specs à partir de l'instant de sortie `now` (epoch ms).
 * Pur. `locale` capturée par l'appelant au moment de la programmation.
 */
export function construireRappels(now: number, locale: Locale): NotifSpec[] {
  const d = DICTIONNAIRES[locale].notifs.rappelRetour;
  const rappels = [
    { offsetMs: 1 * JOUR_MS, title: d.j1Titre, body: d.j1Corps },
    { offsetMs: 3 * JOUR_MS, title: d.j3Titre, body: d.j3Corps },
    { offsetMs: 7 * JOUR_MS, title: d.j7Titre, body: d.j7Corps },
  ];
  return rappels.map((r, i) => ({
    id: NOTIF_IDS.RAPPEL_RETOUR[i],
    title: r.title,
    body: r.body,
    sound: "default",
    atMs: now + r.offsetMs,
  }));
}

/** (Re)programme la série depuis `now`. No-op si permission non déjà accordée. */
export async function programmerRappelRetour(
  now: number,
  locale: Locale,
): Promise<void> {
  if (!(await permissionAccordee())) return;
  for (const spec of construireRappels(now, locale)) {
    await programmer(spec);
  }
}

/** Annule toute la série (à la réouverture de l'app). */
export async function annulerRappelRetour(): Promise<void> {
  await annuler([...NOTIF_IDS.RAPPEL_RETOUR]);
}
