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

export { notificationsDisponibles };

/** Demande/contrôle la permission (idempotent). Alias métier du cœur. */
export async function assurerPermission(): Promise<boolean> {
  return demanderPermission();
}

/** Programme (ou replace) la notif « énergie pleine » à `atMs` (epoch ms). */
export async function planifierPleinEnergie(atMs: number): Promise<void> {
  await programmer({
    id: NOTIF_IDS.ENERGIE_PLEINE,
    title: "Énergie pleine ⚡",
    body: "Tes 5 énergies sont prêtes — reviens chiner !",
    sound: "default",
    atMs,
  });
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  await annuler([NOTIF_IDS.ENERGIE_PLEINE]);
}
