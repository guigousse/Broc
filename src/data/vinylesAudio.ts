/**
 * URL audio externe (Suno CDN, etc.) pour les vinyles du gramophone.
 *
 * Si un `templateId` est ici, sa valeur (URL absolue) est utilisée pour la
 * lecture. Sinon, fallback sur `/sounds/vinyles/{templateId}.mp3`.
 *
 * Pour Suno : récupérer l'URL longue après redirect du lien de partage
 * (`curl -sIL https://suno.com/s/<id>` → location `/song/<uuid>?sh=…`),
 * puis `https://cdn1.suno.ai/<uuid>.mp3`. CORS `*` côté CDN.
 */
export const VINYLE_AUDIO_URLS: Record<string, string> = {
  "mus.vinyle_renaud_morgane":
    "https://cdn1.suno.ai/4f496b5c-71a3-4cd3-af3a-d0bd0fdfe3c4.mp3",
  "mus.vinyle_cabrel_hors_saison":
    "https://cdn1.suno.ai/fac1f750-85ff-45b8-ac68-eef17885a25a.mp3",
  "mus.vinyle_piaf_non":
    "https://cdn1.suno.ai/1a9029dd-7432-4d9f-a151-6bd47735c1ab.mp3",
};

export function vinylAudioUrl(templateId: string): string {
  return (
    VINYLE_AUDIO_URLS[templateId] ?? `/sounds/vinyles/${templateId}.mp3`
  );
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
