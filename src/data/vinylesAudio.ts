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
    "https://cdn1.suno.ai/250d5356-3526-47d5-82ab-ec2b659380a0.mp3",
  "mus.vinyle_cabrel_hors_saison":
    "https://cdn1.suno.ai/8f44edf8-5b5b-48f4-8dc4-e5b448549237.mp3",
  "mus.vinyle_piaf_non":
    "https://cdn1.suno.ai/00a75e41-1427-412d-8978-02b8148fa832.mp3",
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
