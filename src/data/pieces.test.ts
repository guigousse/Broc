import { describe, expect, it } from "vitest";
import {
  CARTES, TIMBRES, PIECES, THEMES_TIMBRES, albumDe, estPiece, getPiece,
  piecesDe, templateDePiece,
} from "@/data/pieces";
import { ALL_TEMPLATES, getTemplate, poolPourTier } from "@/data/objetTemplates";
import { initCollection } from "@/lib/collection";
import { poolDeGamme, GAMMES_BAZAR } from "@/lib/bazar/etal";

function compte(l: { rarete: string }[], r: string) {
  return l.filter((p) => p.rarete === r).length;
}

describe("catalogues de pièces", () => {
  it("50 cartes et 50 timbres, ids uniques et préfixés", () => {
    expect(CARTES).toHaveLength(50);
    expect(TIMBRES).toHaveLength(50);
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(100);
    for (const c of CARTES) expect(c.id.startsWith("carte.")).toBe(true);
    for (const t of TIMBRES) expect(t.id.startsWith("timbre.")).toBe(true);
  });

  it("30 communes / 15 rares / 5 légendaires par album", () => {
    for (const l of [CARTES, TIMBRES]) {
      expect(compte(l, "commun")).toBe(30);
      expect(compte(l, "rare")).toBe(15);
      expect(compte(l, "legendaire")).toBe(5);
    }
  });

  it("`ordre` est une permutation de 0..49 dans chaque album", () => {
    for (const l of [CARTES, TIMBRES]) {
      expect([...l.map((p) => p.ordre)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 50 }, (_, i) => i),
      );
    }
  });

  it("chaque carte pointe un objet du catalogue ; chaque timbre un thème connu (10 par thème)", () => {
    for (const c of CARTES) expect(getTemplate(c.source!)).toBeDefined();
    for (const th of THEMES_TIMBRES) {
      expect(TIMBRES.filter((t) => t.serie === th)).toHaveLength(10);
    }
  });

  it("helpers : estPiece / albumDe / getPiece / piecesDe", () => {
    expect(estPiece("carte.marteau_menuisier")).toBe(true);
    expect(estPiece("br.marteau_menuisier")).toBe(false);
    expect(albumDe("timbre.renard_roux")).toBe("timbres");
    expect(albumDe("carte.marteau_menuisier")).toBe("classeur");
    expect(albumDe("mus.33tours_jazz_1")).toBeNull();
    expect(getPiece("timbre.renard_roux")?.serie).toBe("faune");
    expect(piecesDe("classeur").map((p) => p.ordre)).toEqual(
      Array.from({ length: 50 }, (_, i) => i),
    );
  });

  it("getTemplate résout une pièce en vue ObjetTemplate (XS, catégorie de l'album)", () => {
    const t = getTemplate("timbre.renard_roux");
    expect(t).toMatchObject({
      templateId: "timbre.renard_roux",
      categorie: "Livres & Papeterie",
      taille: "XS",
    });
    expect(getTemplate("carte.marteau_menuisier")?.categorie).toBe("Jeux & Loisirs");
    expect(templateDePiece("br.marteau_menuisier")).toBeUndefined();
  });

  it("INVARIANT : aucune pièce dans les pools dérivés d'OBJET_TEMPLATES", () => {
    const ids = new Set(PIECES.map((p) => p.id));
    for (const t of ALL_TEMPLATES) expect(ids.has(t.templateId)).toBe(false);
    for (const t of poolPourTier(4)) expect(ids.has(t.templateId)).toBe(false);
    for (const g of GAMMES_BAZAR) for (const t of poolDeGamme(g)) expect(ids.has(t.templateId)).toBe(false);
    const col = initCollection();
    for (const cat of Object.keys(col) as (keyof typeof col)[])
      for (const s of col[cat]) expect(ids.has(s.templateId)).toBe(false);
  });
});
