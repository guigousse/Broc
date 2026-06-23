/**
 * URL audio des vinyles du gramophone.
 *
 * Si un `templateId` est ici, sa valeur est utilisée pour la lecture. Sinon,
 * fallback sur `/sounds/vinyles/{templateId}.mp3`.
 *
 * NOTE (lancement App Store) : les anciennes pistes Suno (CDN externe) ont été
 * retirées. Les pistes ci-dessous sont des pastiches originaux fournis par
 * l'auteur, hébergés EN LOCAL dans `public/sounds/vinyles/` → aucune dépendance
 * réseau, lecture hors-ligne.
 */
export const VINYLE_AUDIO_URLS: Record<string, string> = {
  "mus.vinyle_victor_de_la_brasse_bibelot": "/sounds/vinyles/mus.vinyle_victor_de_la_brasse_bibelot.mp3",
  "mus.vinyle_hollyday_caillou_a_woippy": "/sounds/vinyles/mus.vinyle_hollyday_caillou_a_woippy.mp3",
  "mus.vinyle_paul_nazamour_demain_enfin": "/sounds/vinyles/mus.vinyle_paul_nazamour_demain_enfin.mp3",
  "mus.vinyle_francois_cabriol_hors_piste": "/sounds/vinyles/mus.vinyle_francois_cabriol_hors_piste.mp3",
  "mus.vinyle_miguel_pavane_la_zizanie": "/sounds/vinyles/mus.vinyle_miguel_pavane_la_zizanie.mp3",
  "mus.vinyle_renaut_megane_sans_toit": "/sounds/vinyles/mus.vinyle_renaut_megane_sans_toit.mp3",
  "mus.vinyle_silverguy_moi_au_volant": "/sounds/vinyles/mus.vinyle_silverguy_moi_au_volant.mp3",
  "mus.vinyle_judith_loiseau_oui_je_regrette_tout": "/sounds/vinyles/mus.vinyle_judith_loiseau_oui_je_regrette_tout.mp3",
  "mus.vinyle_stevranos_vive_la_fet_a": "/sounds/vinyles/mus.vinyle_stevranos_vive_la_fet_a.mp3",
  "mus.33tours_jazz_2": "/sounds/vinyles/mus.33tours_jazz_2.mp3",
  "mus.33tours_jazz_3": "/sounds/vinyles/mus.33tours_jazz_3.mp3",
  "mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a": "/sounds/vinyles/mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a.mp3",
};

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
