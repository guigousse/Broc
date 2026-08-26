import { describe, expect, it } from "vitest";
import { VOLUME_AMBIANCE_QG } from "@/lib/audio/audioManager";
import { ATTENUATION_AMBIANCE_BORNE, volumeAmbianceBazarForPos } from "./bazarAudioCurves";

describe("volumeAmbianceBazarForPos", () => {
  // La porte est dans la zone des antiquités (`sortie`, left 270 sur 300) :
  // c'est de là que vient la rue, donc c'est là qu'elle s'entend le mieux.
  it("à la porte (zone 2, tout à droite) : le volume du bureau, entier", () => {
    expect(volumeAmbianceBazarForPos(2)).toBeCloseTo(VOLUME_AMBIANCE_QG, 5);
  });

  it("au coin arcade (zone 0, tout à gauche) : 30 % de ce volume", () => {
    expect(volumeAmbianceBazarForPos(0)).toBeCloseTo(0.3 * VOLUME_AMBIANCE_QG, 5);
  });

  it("au comptoir (zone 1) : à mi-chemin des deux bouts", () => {
    expect(volumeAmbianceBazarForPos(1)).toBeCloseTo(0.65 * VOLUME_AMBIANCE_QG, 5);
  });

  // Le panorama n'émet que 0, 1 ou 2, mais une courbe qui déborde donnerait
  // un gain négatif (source muette) ou > 1 (saturation) le jour où une zone
  // s'ajoute au Bazar.
  it("borne les positions hors des trois zones", () => {
    expect(volumeAmbianceBazarForPos(-3)).toBeCloseTo(0.3 * VOLUME_AMBIANCE_QG, 5);
    expect(volumeAmbianceBazarForPos(9)).toBeCloseTo(VOLUME_AMBIANCE_QG, 5);
  });
});

describe("ATTENUATION_AMBIANCE_BORNE", () => {
  it("laisse la rue au tiers, sans jamais la couper", () => {
    expect(ATTENUATION_AMBIANCE_BORNE).toBeCloseTo(0.3, 5);
  });

  // Le choix de l'auteur : la boutique reste là derrière la borne. Une valeur
  // à 0 ferait rentrer tout le Bazar d'un coup à la fermeture ; une valeur au
  // -dessus de 0,5 laisserait les deux sources se disputer le premier plan.
  it("reste dans la fourchette qui garde la rue derrière la musique", () => {
    expect(ATTENUATION_AMBIANCE_BORNE).toBeGreaterThan(0);
    expect(ATTENUATION_AMBIANCE_BORNE).toBeLessThan(0.5);
  });

  it("atténue sans dépendre de la zone où le joueur se tenait", () => {
    // Une seule et même atténuation, quelle que soit la position : c'est ce
    // qui permet à la borne de ne rien savoir du panorama.
    for (const pos of [0, 1, 2]) {
      const attenue = volumeAmbianceBazarForPos(pos) * ATTENUATION_AMBIANCE_BORNE;
      expect(attenue).toBeLessThan(volumeAmbianceBazarForPos(pos));
      expect(attenue).toBeGreaterThan(0);
    }
  });
});
