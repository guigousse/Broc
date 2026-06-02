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
};

export function vinylAudioUrl(templateId: string): string {
  return (
    VINYLE_AUDIO_URLS[templateId] ?? `/sounds/vinyles/${templateId}.mp3`
  );
}
