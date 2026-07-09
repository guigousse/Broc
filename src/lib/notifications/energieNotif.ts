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
  const d = DICTIONNAIRES[locale].notifs.energie;
  await programmer({
    id: NOTIF_IDS.ENERGIE_PLEINE,
    title: d.titre,
    body: d.corps,
    sound: "regen.wav",
    atMs,
  });
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  await annuler([NOTIF_IDS.ENERGIE_PLEINE]);
}
