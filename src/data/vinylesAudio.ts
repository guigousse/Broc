/**
 * URL audio des vinyles du gramophone.
 *
 * Si un `templateId` est ici, sa valeur est utilisée pour la lecture. Sinon,
 * fallback sur `/sounds/vinyles/{templateId}.m4a`.
 *
 * NOTE (lancement App Store) : les anciennes pistes Suno (CDN externe) ont été
 * retirées. Les pistes ci-dessous sont des pastiches originaux fournis par
 * l'auteur, hébergés EN LOCAL dans `public/sounds/vinyles/` → aucune dépendance
 * réseau, lecture hors-ligne.
 */
export const VINYLE_AUDIO_URLS: Record<string, string> = {
  "mus.vinyle_victor_de_la_brasse_bibelot": "/sounds/vinyles/mus.vinyle_victor_de_la_brasse_bibelot.m4a",
  "mus.vinyle_hollyday_caillou_a_woippy": "/sounds/vinyles/mus.vinyle_hollyday_caillou_a_woippy.m4a",
  "mus.vinyle_paul_nazamour_demain_enfin": "/sounds/vinyles/mus.vinyle_paul_nazamour_demain_enfin.m4a",
  "mus.vinyle_francois_cabriol_hors_piste": "/sounds/vinyles/mus.vinyle_francois_cabriol_hors_piste.m4a",
  "mus.vinyle_miguel_pavane_la_zizanie": "/sounds/vinyles/mus.vinyle_miguel_pavane_la_zizanie.m4a",
  "mus.vinyle_renaut_megane_sans_toit": "/sounds/vinyles/mus.vinyle_renaut_megane_sans_toit.m4a",
  "mus.vinyle_silverguy_moi_au_volant": "/sounds/vinyles/mus.vinyle_silverguy_moi_au_volant.m4a",
  "mus.vinyle_judith_loiseau_oui_je_regrette_tout": "/sounds/vinyles/mus.vinyle_judith_loiseau_oui_je_regrette_tout.m4a",
  "mus.vinyle_stevranos_vive_la_fet_a": "/sounds/vinyles/mus.vinyle_stevranos_vive_la_fet_a.m4a",
  "mus.33tours_jazz_1": "/sounds/vinyles/mus.33tours_jazz_1.m4a",
  "mus.33tours_jazz_2": "/sounds/vinyles/mus.33tours_jazz_2.m4a",
  "mus.33tours_jazz_3": "/sounds/vinyles/mus.33tours_jazz_3.m4a",
  "mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a": "/sounds/vinyles/mus.vinyle_concept_laga_jagavaganaigase_du_dandy_a.m4a",
  "mus.vinyle_whale_song_son_terrestre_n1": "/sounds/vinyles/mus.vinyle_whale_song_son_terrestre_n1.m4a",
  "mus.vinyle_des_scarabees_passage_cloute": "/sounds/vinyles/mus.vinyle_des_scarabees_passage_cloute.m4a",
  "mus.vinyle_du_david_bah_oui_comete": "/sounds/vinyles/mus.vinyle_du_david_bah_oui_comete.m4a",
  "mus.vinyle_des_trolling_sons_bet_it_heal": "/sounds/vinyles/mus.vinyle_des_trolling_sons_bet_it_heal.m4a",
  "mus.vinyle_les_pates_carbonnara_michele_sardaigna": "/sounds/vinyles/mus.vinyle_les_pates_carbonnara_michele_sardaigna.m4a",
  "mus.vinyle_grand_max_des_combines": "/sounds/vinyles/mus.vinyle_grand_max_des_combines.m4a",
  "mus.vinyle_classique_incontournable_classique": "/sounds/vinyles/mus.vinyle_classique_incontournable_classique.m4a",
  "mus.vinyle_free_robot_des_punkbot": "/sounds/vinyles/mus.vinyle_free_robot_des_punkbot.m4a",
  "mus.vinyle_des_loups_des_steppes_bark_to_be_free": "/sounds/vinyles/mus.vinyle_des_loups_des_steppes_bark_to_be_free.m4a",
  "mus.vinyle_de_la_rousse_mystique_ainsi_soit_elle": "/sounds/vinyles/mus.vinyle_de_la_rousse_mystique_ainsi_soit_elle.m4a",
  "mus.vinyle_collector_de_vagabond_horizon_celeste": "/sounds/vinyles/mus.vinyle_collector_de_vagabond_horizon_celeste.m4a",
};

export function vinylAudioUrl(templateId: string): string {
  return (
    VINYLE_AUDIO_URLS[templateId] ?? `/sounds/vinyles/${templateId}.m4a`
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
