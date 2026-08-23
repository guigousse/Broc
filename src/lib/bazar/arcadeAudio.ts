/**
 * Les bandes-son de la borne d'arcade.
 *
 * UNE DÉRIVATION, PAS UNE TABLE — contrairement aux vinyles du gramophone
 * (`src/data/vinylesAudio.ts`), qui ont besoin d'une table parce que certains
 * n'ont pas d'audio du tout. Ici les onze jeux en ont un, chacun le sien, et
 * `build-arcade-audio.mjs` les écrit sous le nom du template : une table
 * n'ajouterait qu'un deuxième endroit à tenir à jour.
 *
 * La coloration « haut-parleur de borne » est CUITE dans ces fichiers (caisse,
 * petit ampli, crush gradué par génération de console) ; le glitch, lui, est
 * posé à la lecture par `audioManager` — voir l'en-tête du script de build
 * pour le partage des rôles.
 */
export function arcadeAudioUrl(templateId: string): string {
  return `/sounds/arcade/${templateId}.m4a`;
}
