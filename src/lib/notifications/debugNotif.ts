/**
 * TEMPORAIRE — instrumentation pour diagnostiquer les notifications sur device.
 *
 * Contrairement au flux normal (qui avale toutes les erreurs : le shim
 * `window.Notification` est fire-and-forget, et notre wrapper try/catch ne
 * remonte rien), ce module appelle DIRECTEMENT la commande native `notify` en
 * `await` → l'erreur native éventuelle (ex. `invalidDate`, `pastScheduledTime`)
 * remonte et peut être affichée à l'écran. Lit aussi `get_pending` pour savoir
 * si la planification a réellement abouti.
 *
 * À SUPPRIMER une fois le problème résolu.
 */

type Invoke = (cmd: string, args?: unknown) => Promise<unknown>;

function internals(): { invoke: Invoke } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { __TAURI_INTERNALS__?: { invoke: Invoke } };
  return w.__TAURI_INTERNALS__ ?? null;
}

function msg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** État courant : runtime Tauri, permission, nombre de notifs en attente. */
export async function debugEtat(): Promise<string> {
  const i = internals();
  if (!i) return "Hors Tauri (web) — test impossible ici";
  try {
    const granted = await i.invoke("plugin:notification|is_permission_granted");
    const pending = (await i.invoke("plugin:notification|get_pending")) as unknown[];
    return `Tauri OK · permission=${String(granted)} · pending=${pending.length}`;
  } catch (e) {
    return "ERREUR état: " + msg(e);
  }
}

/**
 * Programme une notif via la commande native, en awaitant pour faire remonter
 * l'erreur. `seconds === 0` → notif immédiate (sans schedule). Affiche ensuite
 * la liste des notifs en attente (ids) pour confirmer la planification.
 */
export async function debugProgrammer(seconds: number): Promise<string> {
  const i = internals();
  if (!i) return "Hors Tauri (web) — test impossible ici";
  try {
    const { Schedule } = await import("@tauri-apps/plugin-notification");
    const options: Record<string, unknown> = {
      id: 999,
      title: `Test +${seconds}s`,
      body: "Notif de debug",
      sound: "default",
    };
    if (seconds > 0) {
      options.schedule = Schedule.at(
        new Date(Date.now() + seconds * 1000),
        false,
        true,
      );
    }
    await i.invoke("plugin:notification|notify", { options });
    const pending = (await i.invoke(
      "plugin:notification|get_pending",
    )) as { id: number }[];
    const ids = pending.map((p) => p.id).join(",");
    return `notify OK · pending(${pending.length})=[${ids}]`;
  } catch (e) {
    return "ERREUR notify: " + msg(e);
  }
}
