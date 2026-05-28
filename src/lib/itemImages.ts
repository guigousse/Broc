/**
 * Pipeline image des items.
 *
 * Convention : un item dont le `templateId` figure dans `ITEMS_WITH_IMAGE`
 * dispose d'un fichier à `public/items/{templateId}.png`.
 *
 * Pour ajouter une image :
 *   1. Générer le PNG (voir prompts dans docs ou /agent)
 *   2. Le placer dans `public/items/{templateId}.png`
 *   3. Ajouter le `templateId` dans le Set ci-dessous
 *
 * Le composant `<ItemImage />` se charge ensuite du fallback (icône catégorie)
 * si le `templateId` n'est pas dans le Set.
 */

export const ITEMS_WITH_IMAGE: ReadonlySet<string> = new Set<string>([
  // Hors-musique (premiers tests)
  "jx.monopoly_80s",
  "ma.tabouret_bois_patine",

  // Musique — communs
  "mus.vinyle_pink_floyd_wall",
  "mus.vinyle_telephone_dure_limite",
  "mus.33tours_jazz_inconnu",
  "mus.cd_nirvana_in_utero",
  "mus.harmonica_hohner",
  "mus.vinyle_brel_amsterdam",
  "mus.vinyle_brassens_jeanne",
  "mus.vinyle_aznavour_emmenez",
  "mus.vinyle_piaf_non",
  "mus.vinyle_beatles_abbey_road",
  "mus.vinyle_stones_let_bleed",
  "mus.vinyle_bowie_ziggy",
  "mus.vinyle_zeppelin_iv",
  "mus.vinyle_dylan_blonde",
  "mus.vinyle_indochine_aventurier",
  "mus.vinyle_mylene_farmer_ainsi",
  "mus.vinyle_renaud_morgane",
  "mus.vinyle_hallyday_rock_memphis",
  "mus.vinyle_sardou_lacs",
  "mus.vinyle_goldman_envole",
  "mus.vinyle_cabrel_hors_saison",
  "mus.vinyle_gainsbourg_melody",
  "mus.vinyle_higelin_alertez",
  "mus.vinyle_balavoine_aziza",
  "mus.vinyle_souchon_foule",
  "mus.cd_daft_punk_homework",
  "mus.cd_radiohead_ok",
  "mus.cd_noir_desir_666",
  "mus.cd_iam_ecole",
  "mus.k7_audio_mixtape_90s",
  "mus.walkman_sony_wm",
  "mus.radio_cassette_sanyo",
  "mus.tourne_disque_thorens",
  "mus.partition_chopin",
  "mus.partition_satie",
  "mus.metronome_wittner",
  "mus.diapason_acier",
  "mus.flute_traversiere_yamaha",
  "mus.clarinette_buffet",
  "mus.ukulele_soprano",

  // Musique — rares
  "mus.guitare_classique_ancienne",
  "mus.vinyle_beatles_dedicace",
  "mus.vinyle_stones_test_pressing",
  "mus.guitare_gibson_les_paul",
  "mus.guitare_fender_strato_70s",
  "mus.accordeon_paolo_soprani",
  "mus.banjo_gibson_5cordes",
  "mus.violon_atelier_mirecourt",
  "mus.theremine_moog",
  "mus.synthe_moog_minimoog",
  "mus.boite_musique_mecanique",
  "mus.saxophone_selmer_mark_vi",

  // Musique — légendaires & unique
  "leg.mus.stradivarius",
  "leg.mus.piano_pleyel_concert",
  "leg.mus.guitare_hendrix_provenance",
  "uniq.mus.violon_paganini",
]);

export function getItemImageUrl(templateId: string): string | null {
  return ITEMS_WITH_IMAGE.has(templateId)
    ? `/items/${templateId}.png`
    : null;
}
