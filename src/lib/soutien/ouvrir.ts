import { tauriDisponible } from "@/lib/plateforme";

/**
 * Le SEUL endroit du code qui ouvre une adresse hors du jeu.
 *
 * Broc tourne sous Tauri sur mobile ET dans un navigateur sur Vercel : le
 * plugin n'existe que dans le premier cas. Concentrer les deux chemins ici
 * évite que chaque bouton refasse la détection à sa façon.
 */
export async function ouvrirLien(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (!tauriDisponible()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    // Un lien qui ne s'ouvre pas ne doit jamais casser l'écran d'où on vient.
    // Rien à dire au joueur : il verra que rien ne s'est passé, et un toast
    // d'erreur technique n'y changerait rien.
  }
}
