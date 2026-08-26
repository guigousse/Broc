import { tauriDisponible } from "@/lib/plateforme";

/**
 * La feuille de notation native — le SEUL endroit du code qui l'appelle.
 *
 * ⚠ TROIS RÈGLES QUI NE SE NÉGOCIENT PAS :
 *
 * 1. Cet appel ne part JAMAIS d'un bouton. Google l'interdit nommément
 *    (« you should not have a call-to-action option (such as a button) to
 *    trigger the API »), et le quota d'Apple — trois affichages par an, par
 *    appareil — rendrait ce bouton mort une fois sur deux.
 *
 * 2. Aucune question ne doit être posée juste avant. « Tu aimes Broc ? » est
 *    le cas explicitement interdit côté Google.
 *
 * 3. RIEN ne se branche derrière. L'appel ne dit pas si la boîte s'est
 *    affichée, ni si le joueur a noté, ni quelle note. Toute logique qui le
 *    supposerait serait un bug invisible — et récompenser un avis est de
 *    toute façon interdit des deux côtés.
 *
 * Recette : la boîte n'apparaît NI en build debug installé via ADB, NI sur
 * TestFlight. La vérifier demande une piste de test interne ou une release.
 */
export async function demanderNotation(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!tauriDisponible()) return;

  try {
    const { requestReview } = await import("@gbyte/tauri-plugin-in-app-review");
    await requestReview();
  } catch {
    // Le plugin absent ou muet est un non-événement : le joueur vient de
    // fermer une fanfare de niveau, il ne doit rien voir d'autre.
  }
}
