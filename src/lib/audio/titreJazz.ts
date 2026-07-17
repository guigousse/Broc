/**
 * Musique jazz de l'écran titre — spec
 * docs/superpowers/specs/2026-07-17-jazz-titre-fondu-design.md.
 *
 * Les 3 vinyles jazz sont enchaînés en boucle via le callback `onEnded` de
 * `playVinyl` (même mécanique que `handleNext` du gramophone au bureau,
 * mais sans rejouer les bruitages vinyl-1/vinyl-2 à chaque morceau). Le
 * fondu de sortie appartient aux départs en partie (fadeOutVinylBus).
 */
import { vinylAudioUrl } from "@/data/vinylesAudio";

export const PLAYLIST_TITRE_IDS = [
  "mus.33tours_jazz_1",
  "mus.33tours_jazz_2",
  "mus.33tours_jazz_3",
] as const;

/** Sous-ensemble de l'audioManager utilisé par la musique du titre. */
export interface LecteurTitre {
  stopGramophone: () => void;
  setVinylTargetVolume: (v: number) => void;
  setVinylAmbianceVolume: (v: number) => void;
  setVinylAmbianceLowpass: (hz: number) => void;
  startNeedle: () => void | Promise<void>;
  playVinyl: (url: string, onEnded?: () => void) => void | Promise<void>;
}

/**
 * Démarre crépitement + playlist jazz en boucle. Retourne une fonction qui
 * arrête l'ENCHAÎNEMENT (le morceau en cours n'est pas coupé : les départs
 * en partie passent par fadeOutVinylBus, qui coupe tout proprement).
 */
export function demarrerMusiqueTitre(lecteur: LecteurTitre): () => void {
  let arrete = false;
  // État propre si on arrive du jeu en navigation soft (gramophone encore
  // vivant), puis bus remis à plein : GlobalVinylAmbiance étouffait le
  // titre avant que la route "/" ne passe en pilotage local.
  lecteur.stopGramophone();
  lecteur.setVinylTargetVolume(1);
  lecteur.setVinylAmbianceVolume(1);
  lecteur.setVinylAmbianceLowpass(20000);
  void lecteur.startNeedle();
  const jouer = (idx: number) => {
    if (arrete) return;
    const id = PLAYLIST_TITRE_IDS[idx % PLAYLIST_TITRE_IDS.length];
    void lecteur.playVinyl(vinylAudioUrl(id), () => jouer(idx + 1));
  };
  jouer(0);
  return () => {
    arrete = true;
  };
}
