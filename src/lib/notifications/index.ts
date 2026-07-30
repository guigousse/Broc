/**
 * Cœur générique des notifications locales. Seul module qui importe le plugin
 * Tauri (`@tauri-apps/plugin-notification`), en import DYNAMIQUE pour que son
 * code natif ne soit jamais évalué hors Tauri. Tout est no-op hors runtime
 * Tauri et toute erreur plugin est avalée — une panne de notif ne doit jamais
 * casser le jeu.
 */

/** Spécification d'une notification locale à programmer. */
export interface NotifSpec {
  /** Identifiant 32-bit stable (cf. ids.ts) — réutilisé pour replacer/annuler. */
  id: number;
  title: string;
  body: string;
  /** Horodatage de déclenchement (epoch ms). */
  atMs: number;
  /**
   * Son joué à l'affichage. `"default"` = son système (iOS retombe sur le son
   * par défaut quand le fichier nommé est introuvable ; Android utilise le son
   * du canal par défaut). Un nom de fichier embarqué = son personnalisé.
   * Omis = silencieux sur iOS.
   */
  sound?: string;
  /**
   * Verrou d'ordre, relu JUSTE avant l'envoi. `programmer()` traverse plusieurs
   * `await` (imports dynamiques, IPC d'annulation) : sans ce verrou, une
   * exécution partie d'un état PÉRIMÉ peut commiter son échéance après une
   * exécution plus récente et faire partir la notif au mauvais moment.
   */
  estObsolete?: () => boolean;
}

/** Vrai uniquement sous runtime Tauri (internals injectés par Tauri). */
export function notificationsDisponibles(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Lit la permission SANS la demander (pas de prompt). */
export async function permissionAccordee(): Promise<boolean> {
  if (!notificationsDisponibles()) return false;
  try {
    const { isPermissionGranted } = await import(
      "@tauri-apps/plugin-notification"
    );
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

/** Demande la permission. Idempotent (iOS ne re-prompt pas une fois décidé). */
export async function demanderPermission(): Promise<boolean> {
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

/** Programme (ou replace) une notif locale à `spec.atMs`. */
export async function programmer(spec: NotifSpec): Promise<void> {
  if (!notificationsDisponibles()) return;
  // Gate central : préférence joueur (Réglages → Notifications). Import
  // dynamique local pour éviter le cycle prefs → annuler → index.
  const { notifsActives } = await import("./prefs");
  if (!notifsActives()) return;
  try {
    const { sendNotification, cancel, Schedule } = await import(
      "@tauri-apps/plugin-notification"
    );
    await cancel([spec.id]).catch(() => {});
    // Dernier point de contrôle : si une échéance plus récente est passée
    // pendant les await ci-dessus, on s'arrête ici (elle a déjà posé la sienne,
    // ou va le faire — l'ancienne ne doit surtout pas la recouvrir).
    if (spec.estObsolete?.()) return;
    sendNotification({
      id: spec.id,
      title: spec.title,
      body: spec.body,
      sound: spec.sound,
      schedule: Schedule.at(new Date(spec.atMs), false, true),
    });
  } catch {
    // no-op : ne jamais casser le jeu si la notif échoue.
  }
}

/** Annule les notifs programmées portant ces IDs (si présentes). */
export async function annuler(ids: number[]): Promise<void> {
  if (!notificationsDisponibles()) return;
  try {
    const { cancel } = await import("@tauri-apps/plugin-notification");
    await cancel(ids);
  } catch {
    // no-op.
  }
}
