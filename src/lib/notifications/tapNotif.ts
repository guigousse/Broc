/**
 * Tap sur une notification → destination dans le jeu.
 *
 * Deux voies remontent un tap depuis le natif :
 *
 * 1. `actionPerformed`, l'événement du plugin — suffit quand l'app tourne
 *    déjà (le JS écoute).
 * 2. `last_action`, commande ajoutée au plugin vendoré : au LANCEMENT À FROID
 *    depuis une notif, iOS livre le tap au natif avant que la WebView n'ait
 *    chargé le moindre script. `Plugin.trigger` ne garde rien sans écouteur —
 *    l'événement partait dans le vide, et le joueur arrivait au menu comme si
 *    de rien n'était (quand il n'arrivait pas sur un écran noir, cf. patch 3
 *    dans src-tauri/Cargo.toml). Le natif garde donc le dernier tap en
 *    attente et le JS vient le chercher juste après s'être abonné.
 */
import { NOTIF_IDS } from "./ids";
import { notificationsDisponibles } from "./index";

/** Forme de la réponse de `last_action` (miroir de `ReceivedNotification`). */
interface ActionEnAttente {
  actionId: string;
  notification: { id?: number };
}

/** Route à ouvrir pour un ID de notif, ou null si la notif n'en a pas. */
export function destinationNotif(id: number): string | null {
  const dans = (ids: readonly number[]) => ids.includes(id);
  if (dans(NOTIF_IDS.RESTAURATION)) return "/atelier";
  if (dans(NOTIF_IDS.QUETES) || dans(NOTIF_IDS.RAPPEL_QUETES)) return "/quetes";
  if (id === NOTIF_IDS.ENERGIE_PLEINE || dans(NOTIF_IDS.RAPPEL_RETOUR)) {
    return "/bureau";
  }
  return null;
}

/**
 * Fenêtre pendant laquelle un même ID n'est relayé qu'une fois : un tap qui
 * tombe entre l'abonnement et la relecture de `last_action` arrive par les
 * deux voies.
 */
const FENETRE_DOUBLON_MS = 2_000;

/**
 * Abonne `surTap` aux taps de notification (ID de la notif), y compris celui
 * qui a lancé l'app. Rend la fonction d'arrêt (inoffensive hors Tauri ou si le
 * pont a échoué).
 */
export async function installerTapNotif(
  surTap: (id: number) => void,
): Promise<() => void> {
  const inerte = () => {};
  if (!notificationsDisponibles()) return inerte;
  try {
    const { onAction } = await import("@tauri-apps/plugin-notification");
    const { invoke } = await import("@tauri-apps/api/core");

    let dernier: { id: number; a: number } | null = null;
    const recevoir = (id: number | undefined) => {
      if (typeof id !== "number") return;
      const a = Date.now();
      if (dernier && dernier.id === id && a - dernier.a < FENETRE_DOUBLON_MS) {
        return;
      }
      dernier = { id, a };
      surTap(id);
    };

    const abonnement = await onAction((n) => recevoir(n.id));
    // Après l'abonnement, jamais avant : un tap qui tomberait entre les deux
    // serait perdu dans l'autre ordre.
    const enAttente = await invoke<ActionEnAttente | null>(
      "plugin:notification|last_action",
    ).catch(() => null);
    if (enAttente && enAttente.actionId === "tap") {
      recevoir(enAttente.notification?.id);
    }
    return () => {
      void abonnement.unregister();
    };
  } catch {
    // Une panne du pont de notifs ne doit jamais casser le jeu.
    return inerte;
  }
}
