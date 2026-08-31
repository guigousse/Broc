/**
 * Carillon des notifications reçues pendant qu'on joue.
 *
 * iOS ne joue plus le son SYSTÈME d'une notification présentée au premier plan
 * (patch du plugin vendoré, `ios/Sources/NotificationHandler.swift`) : ce son
 * prenait la session audio du système et interrompait l'AudioContext de la
 * WebView, ce qui coupait TOUT le son du jeu jusqu'au redémarrage de l'app.
 *
 * Le ping revient ici, joué par le jeu lui-même sur son propre bus — la
 * pratique courante des jeux mobiles. Il suit donc le volume et la préférence
 * « effets », ce que le son système ignorait, et ne peut plus rien interrompre.
 *
 * L'événement n'existe que sur iOS : le pont Android ne remonte que le tap sur
 * une notif (`actionPerformed`), jamais sa réception.
 */
import { notificationsDisponibles } from "./index";

/**
 * Abonne `jouer` aux notifications reçues au premier plan.
 * Rend la fonction d'arrêt (inoffensive hors Tauri ou si le pont a échoué).
 */
export async function installerSonNotif(
  jouer: () => void,
): Promise<() => void> {
  const inerte = () => {};
  if (!notificationsDisponibles()) return inerte;
  try {
    const { onNotificationReceived } = await import(
      "@tauri-apps/plugin-notification"
    );
    const abonnement = await onNotificationReceived(() => jouer());
    return () => {
      void abonnement.unregister();
    };
  } catch {
    // Une panne du pont de notifs ne doit jamais casser le jeu.
    return inerte;
  }
}
