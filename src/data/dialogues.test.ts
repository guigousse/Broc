import { describe, expect, it } from "vitest";
import {
  GRAND_PERE_PORTRAITS,
  SEQUENCES_TUTORIEL,
  TOUTES_SEQUENCES,
} from "./dialogues";

describe("dialogues (données FR)", () => {
  it("les ids de séquences sont uniques", () => {
    const ids = TOUTES_SEQUENCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque séquence a au moins une ligne, sans texte vide", () => {
    for (const s of TOUTES_SEQUENCES) {
      expect(s.lignes.length).toBeGreaterThan(0);
      for (const l of s.lignes) expect(l.texte.trim().length).toBeGreaterThan(0);
    }
  });

  it("chaque humeur utilisée a un portrait", () => {
    for (const s of TOUTES_SEQUENCES) {
      for (const l of s.lignes) {
        expect(GRAND_PERE_PORTRAITS[l.humeur]).toMatch(/^\/personas\//);
      }
    }
  });

  it("les séquences du tutoriel existent et l'id interne correspond à la clé", () => {
    const attendues = [
      "tuto_accueil", "tuto_chine_entree",
      "tuto_nego_echec_avant", "tuto_nego_echec_apres",
      "tuto_achat_direct_avant", "tuto_achat_direct_apres",
      "tuto_nego_un_avant", "tuto_nego_un_apres",
      "tuto_nego_deux_avant", "tuto_nego_deux_apres",
      "tuto_chine_sortir", "tuto_retour",
      "tuto_peluche_collection", "tuto_collection_lecon", "tuto_colis_cadeau",
      "tuto_vente_entree", "tuto_vente_faite", "tuto_conclusion",
    ];
    for (const id of attendues) {
      expect(SEQUENCES_TUTORIEL[id]?.id).toBe(id);
    }
    // Pas de séquence en trop ni en moins par rapport à la liste attendue.
    expect(new Set(Object.keys(SEQUENCES_TUTORIEL))).toEqual(new Set(attendues));
  });
});
