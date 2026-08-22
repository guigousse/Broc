import type { CategorieObjet, CollectionSlot } from "@/types/game";
import { templateDonne } from "@/lib/collection";

/**
 * Les onze jeux vidéo du catalogue, dans l'ordre où la borne les présente.
 *
 * UNE CONSTANTE ÉCRITE À LA MAIN, ET PAS UN FILTRE. Un filtre du genre
 * « tous les `jx.*` dont le nom contient bit » se réécrirait tout seul le jour
 * où le catalogue bouge : ajouter un jeu renumérote la série, le n° 3 du
 * joueur devient le n° 4, et « 03 / 11 » cesse de vouloir dire quelque chose.
 * Le prix à payer est un test de cohérence (`arcade.test.ts`), qui vérifie que
 * chaque identifiant existe encore.
 *
 * L'ordre suit les générations de console, 8-bit d'abord. Le parcours de
 * gauche à droite raconte ainsi une petite chronologie, et les trois 8-bit —
 * les moins chers, donc les premiers trouvés — ouvrent la série : elle se
 * remplit par le début, ce qui se voit.
 *
 * ⚠ Un jeu qu'on AJOUTE va en FIN de liste, jamais au milieu : renuméroter
 * ce que les joueurs connaissent déjà n'apporte rien à personne.
 */
export const JEUX_ARCADE = [
  "jx.cartouche_bluebot_8_bit",
  "jx.cartouche_la_legende_de_solda_8_bit",
  "jx.cartouche_le_plombier_sauteur_8_bit",
  "jx.cartouche_turbo_herisson_16_bit",
  "jx.cartouche_street_castagne_ii_16_bit",
  "jx.cartouche_gachette_du_temps_rpg_16_bit",
  "jx.jeu_le_manoir_du_mal_32_bit",
  "jx.jeu_foxy_crush_32_bit",
  "jx.jeu_engrenage_de_metal_infiltration_32_bit",
  "jx.jeu_solda_flute_temporelle_aventure_3d_64_bit",
  "jx.jeu_d_aventure_japonais_128_bit",
] as const;

export interface JeuArcade {
  templateId: string;
  /** Vrai si l'exemplaire est DANS la collection (donation posée). */
  trouve: boolean;
}

/**
 * L'état des onze jeux, dans l'ordre d'affichage. Fonction pure : la scène la
 * reçoit déjà calculée, elle ne touche jamais à la collection elle-même.
 */
export function jeuxArcade(
  collection: Record<CategorieObjet, CollectionSlot[]>,
): JeuArcade[] {
  return JEUX_ARCADE.map((templateId) => ({
    templateId,
    trouve: templateDonne(collection, templateId),
  }));
}
