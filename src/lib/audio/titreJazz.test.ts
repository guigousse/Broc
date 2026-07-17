import { describe, expect, it } from "vitest";
import {
  PLAYLIST_TITRE_IDS,
  demarrerMusiqueTitre,
  type LecteurTitre,
} from "./titreJazz";

function fauxLecteur() {
  const appels: string[] = [];
  const finsDeMorceau: Array<() => void> = [];
  const lecteur: LecteurTitre = {
    stopGramophone: () => {
      appels.push("stopGramophone");
    },
    setVinylTargetVolume: (v) => {
      appels.push(`targetVolume:${v}`);
    },
    setVinylAmbianceVolume: (v) => {
      appels.push(`ambianceVolume:${v}`);
    },
    setVinylAmbianceLowpass: (hz) => {
      appels.push(`lowpass:${hz}`);
    },
    startNeedle: () => {
      appels.push("startNeedle");
    },
    playVinyl: (url, onEnded) => {
      appels.push(`play:${url}`);
      if (onEnded) finsDeMorceau.push(onEnded);
    },
  };
  return { lecteur, appels, finsDeMorceau };
}

describe("demarrerMusiqueTitre", () => {
  it("prépare le bus (stop, volumes pleins, crépitement) puis joue jazz_1", () => {
    const { lecteur, appels } = fauxLecteur();
    demarrerMusiqueTitre(lecteur);
    expect(appels).toEqual([
      "stopGramophone",
      "targetVolume:1",
      "ambianceVolume:1",
      "lowpass:20000",
      "startNeedle",
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
    ]);
  });

  it("enchaîne jazz_1 → jazz_2 → jazz_3 → boucle sur jazz_1", () => {
    const { lecteur, appels, finsDeMorceau } = fauxLecteur();
    demarrerMusiqueTitre(lecteur);
    finsDeMorceau[0]();
    finsDeMorceau[1]();
    finsDeMorceau[2]();
    expect(appels.filter((a) => a.startsWith("play:"))).toEqual([
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_2.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_3.mp3",
      "play:/sounds/vinyles/mus.33tours_jazz_1.mp3",
    ]);
  });

  it("l'arrêt retourné stoppe l'enchaînement (pas de morceau suivant)", () => {
    const { lecteur, appels, finsDeMorceau } = fauxLecteur();
    const arreter = demarrerMusiqueTitre(lecteur);
    arreter();
    finsDeMorceau[0]();
    expect(appels.filter((a) => a.startsWith("play:"))).toHaveLength(1);
  });

  it("la playlist est fixe et dans l'ordre voulu", () => {
    expect(PLAYLIST_TITRE_IDS).toEqual([
      "mus.33tours_jazz_1",
      "mus.33tours_jazz_2",
      "mus.33tours_jazz_3",
    ]);
  });
});
