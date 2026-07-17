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

  it("les 7 séquences du tutoriel existent et l'id interne correspond à la clé", () => {
    const attendues = [
      "tuto_accueil", "tuto_chine_entree", "tuto_achat_fait", "tuto_retour",
      "tuto_vente_entree", "tuto_vente_faite", "tuto_conclusion",
    ];
    for (const id of attendues) {
      expect(SEQUENCES_TUTORIEL[id]?.id).toBe(id);
    }
  });
});
