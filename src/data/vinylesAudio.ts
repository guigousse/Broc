/**
 * URL audio des vinyles du gramophone.
 *
 * Si un `templateId` est ici, sa valeur est utilisée pour la lecture. Sinon,
 * fallback sur `/sounds/vinyles/{templateId}.mp3`.
 *
 * NOTE (lancement App Store) : les anciennes pistes Suno (pastiches d'artistes
 * réels, hébergées sur un CDN externe) ont été retirées pour des raisons de
 * droits d'auteur et pour supprimer toute dépendance réseau. À remplacer par
 * des musiques 100 % originales ou libres de droits (CC0), hébergées en local
 * dans `public/sounds/vinyles/`. Tant que cette table est vide, le gramophone
 * n'a aucun vinyle jouable (voir `vinylHasAudio`).
 */
export const VINYLE_AUDIO_URLS: Record<string, string> = {};

export function vinylAudioUrl(templateId: string): string {
  return (
    VINYLE_AUDIO_URLS[templateId] ?? `/sounds/vinyles/${templateId}.mp3`
  );
}

/** Vrai si le vinyle a un audio jouable (URL externe mappée). */
export function vinylHasAudio(templateId: string): boolean {
  return templateId in VINYLE_AUDIO_URLS;
}

/**
 * URL de la page Suno (pour ajout en favori, partage, etc.) — dérivée du
 * CDN URL si c'est bien un fichier `cdn1.suno.ai/<uuid>.mp3`. Retourne
 * `null` si pas d'URL externe ou si l'URL n'est pas Suno (fichier local).
 */
export function vinylSunoPageUrl(templateId: string): string | null {
  const url = VINYLE_AUDIO_URLS[templateId];
  if (!url) return null;
  const m = url.match(/cdn1\.suno\.ai\/([0-9a-f-]+)\.mp3/i);
  if (!m) return null;
  return `https://suno.com/song/${m[1]}`;
}
