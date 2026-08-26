import { VOLUME_AMBIANCE_QG } from "@/lib/audio/audioManager";

/**
 * Volume de l'ambiance de rue au Bazar, piloté par l'index de zone du
 * panorama (0 = coin arcade · 1 = comptoir · 2 = antiquités).
 *
 * MÊME PRINCIPE QUE LA CHEMINÉE DU BUREAU (`panorama/audioCurves.ts`), avec
 * une source différente : ici le bruit vient de la PORTE, et la porte est
 * dans la zone des antiquités (`sortie`, posée à 270 sur un repère de 300).
 * Le joueur qui remonte vers le coin arcade s'enfonce dans la boutique, et la
 * rue s'éloigne derrière lui.
 *
 * Les deux bouts sont des consignes de l'auteur : plein volume à la porte,
 * 30 % tout à gauche. « Plein » se lit relativement au bureau — c'est la
 * même boucle et elle ne doit pas y sonner plus fort qu'ici.
 */
export function volumeAmbianceBazarForPos(pos: number): number {
  const p = Math.max(0, Math.min(2, pos));
  // 0.30 → 0.65 → 1.00 sur les trois zones.
  return VOLUME_AMBIANCE_QG * (0.3 + 0.35 * p);
}

/**
 * Ce qui reste de l'ambiance de rue quand la borne d'arcade joue.
 *
 * UN FACTEUR, ET PAS UN VOLUME. La borne s'ouvre depuis n'importe laquelle des
 * trois zones, et le joueur y revient à la même place : elle n'a donc pas à
 * savoir où il se tenait, ni à retenir le volume qu'elle a remplacé. Elle
 * multiplie ce qui est déjà réglé, `audioManager` se charge du reste (cf.
 * `setAmbienceDuck`).
 *
 * 0,3 et non 0 : la boutique reste là derrière la borne. À zéro, refermer
 * l'écran ferait rentrer toute la rue d'un coup, comme une porte qui claque.
 */
export const ATTENUATION_AMBIANCE_BORNE = 0.3;
