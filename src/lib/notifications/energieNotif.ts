/**
 * Notif « énergie pleine ». Mince couche métier au-dessus du cœur générique
 * (`./index`) : un titre/corps + l'ID dédié. API publique INCHANGÉE pour
 * GameContext (`planifierPleinEnergie`, `annulerPleinEnergie`,
 * `assurerPermission`, `notificationsDisponibles`).
 */
import { NOTIF_IDS } from "./ids";
import {
  notificationsDisponibles,
  demanderPermission,
  programmer,
  annuler,
} from "./index";
import type { Locale } from "@/lib/i18n/locales";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

export { notificationsDisponibles };

/**
 * Numéro de la dernière demande émise (planification OU annulation). Chaque
 * demande capture le sien : si le compteur a bougé pendant ses `await`, c'est
 * qu'une demande plus récente l'a supplantée et elle ne doit plus rien poser.
 * Sans ce garde-fou, une échéance calculée sur un état déjà périmé pouvait
 * gagner la course et faire sonner « énergie pleine » avant l'heure.
 */
let sequence = 0;

/** Demande/contrôle la permission (idempotent). Alias métier du cœur. */
export async function assurerPermission(): Promise<boolean> {
  return demanderPermission();
}

/**
 * Programme (ou replace) la notif « énergie pleine » à `atMs` (epoch ms).
 * `locale` est capturée par l'appelant AU MOMENT DE LA PROGRAMMATION
 * (`localeCourante()`) — jamais relue plus tard, jamais écrite en save.
 */
export async function planifierPleinEnergie(
  atMs: number,
  locale: Locale,
): Promise<void> {
  const mien = ++sequence;
  const d = DICTIONNAIRES[locale].notifs.energie;
  await programmer({
    id: NOTIF_IDS.ENERGIE_PLEINE,
    title: d.titre,
    body: d.corps,
    sound: "regen.wav",
    atMs,
    estObsolete: () => sequence !== mien,
  });
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  // Périme toute planification encore en vol : l'énergie est pleine (ou la
  // partie n'est plus la même), aucune échéance calculée avant ne vaut plus.
  sequence++;
  await annuler([NOTIF_IDS.ENERGIE_PLEINE]);
}
