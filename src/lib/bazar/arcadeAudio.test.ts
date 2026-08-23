import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JEUX_ARCADE } from "./arcade";
import { arcadeAudioUrl } from "./arcadeAudio";

describe("arcadeAudio", () => {
  it("dérive l'URL du templateId, sans table intermédiaire", () => {
    expect(arcadeAudioUrl("jx.cartouche_bluebot_8_bit")).toBe(
      "/sounds/arcade/jx.cartouche_bluebot_8_bit.m4a",
    );
  });

  /**
   * LE filet qui compte. Une piste manquante ne casse rien de visible : le
   * `<audio>` échoue en silence, la borne s'allume muette, et personne ne s'en
   * aperçoit avant la recette sur appareil. Ce test attrape le jour où un jeu
   * est ajouté au catalogue sans passer par `build-arcade-audio.mjs`.
   */
  it.each(JEUX_ARCADE)("%s a sa bande-son sur le disque", (templateId) => {
    const s = statSync(`public${arcadeAudioUrl(templateId)}`);
    expect(s.isFile()).toBe(true);
    // Sous 50 Ko, c'est un encodage raté ou un fichier tronqué ; au-dessus de
    // 2 Mo, le master est passé sans traitement (les masters font 1 à 4 Mo).
    expect(s.size).toBeGreaterThan(50_000);
    expect(s.size).toBeLessThan(2_000_000);
  });

  it("les onze pistes tiennent dans l'enveloppe du binaire", () => {
    const total = JEUX_ARCADE.reduce(
      (n, id) => n + statSync(`public${arcadeAudioUrl(id)}`).size,
      0,
    );
    // ~8,4 Mo aujourd'hui. Le plafond dit « quelqu'un a recommité les masters
    // mp3 de 26 Mo », pas « c'est trop lourd de 10 Ko ».
    expect(total).toBeLessThan(12_000_000);
  });
});
