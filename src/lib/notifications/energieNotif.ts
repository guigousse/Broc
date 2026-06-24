/**
 * Wrapper autour du plugin Tauri `notification`. Tout est no-op hors runtime
 * Tauri (navigateur `npm run dev`) et toute erreur plugin est avalée — une panne
 * de notification ne doit jamais casser le jeu. Le plugin est chargé en import
 * dynamique pour que son code natif ne soit jamais évalué hors Tauri.
 */

/** Identifiant fixe (32-bit) de la notif « énergie pleine » — réutilisé pour replacer/annuler. */
const NOTIF_ENERGIE_PLEINE_ID = 1;

/** Vrai uniquement sous runtime Tauri (présence des internals injectés par Tauri). */
export function notificationsDisponibles(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Demande/contrôle la permission. Idempotent (iOS ne re-prompt pas une fois décidé). */
export async function assurerPermission(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  try {
    const { isPermissionGranted, requestPermission } = await import(
      "@tauri-apps/plugin-notification"
    );
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Programme (ou replace) la notif « énergie pleine » à l'horodatage `atMs` (epoch ms). */
export async function planifierPleinEnergie(atMs: number): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { sendNotification, cancel, Schedule } = await import(
      "@tauri-apps/plugin-notification"
    );
    await cancel([NOTIF_ENERGIE_PLEINE_ID]).catch(() => {});
    sendNotification({
      id: NOTIF_ENERGIE_PLEINE_ID,
      title: "Énergie pleine ⚡",
      body: "Tes 5 énergies sont prêtes — reviens chiner !",
      schedule: Schedule.at(new Date(atMs), false, true),
    });
  } catch {
    // no-op : ne jamais casser le jeu si la notif échoue.
  }
}

/** Annule la notif « énergie pleine » programmée (si présente). */
export async function annulerPleinEnergie(): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { cancel } = await import("@tauri-apps/plugin-notification");
    await cancel([NOTIF_ENERGIE_PLEINE_ID]);
  } catch {
    // no-op.
  }
}
