import { describe, expect, it } from "vitest";
import { QUETES_PRINCIPALES, chapitreParOrdre } from "./quetesPrincipales";
import { BROCANTES } from "./brocantes";
import { getTemplate, poolPourTier } from "./objetTemplates";

describe("trame principale (squelette SP2)", () => {
  it("12 chapitres, ordres 1..12 uniques, ids trame_chN", () => {
    expect(QUETES_PRINCIPALES).toHaveLength(12);
    const ordres = QUETES_PRINCIPALES.map((c) => c.ordre).sort((a, b) => a - b);
    expect(ordres).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    for (const c of QUETES_PRINCIPALES) expect(c.id).toBe(`trame_ch${c.ordre}`);
  });
  it("les cibles reflètent exactement les objectifs de type objet", () => {
    for (const c of QUETES_PRINCIPALES) {
      const objets = c.payload.objectifs.filter((o) => o.type === "objet");
      expect(c.payload.cibles).toEqual(
        objets.map((o) => ({ templateId: o.templateId, ...(o.etatMin ? { etatMin: o.etatMin } : {}) })),
      );
    }
  });
  it("chaque chapitre a un dialogue non vide et un templateId cible valide", () => {
    for (const c of QUETES_PRINCIPALES) {
      expect(c.dialogue.length).toBeGreaterThan(0);
      for (const cible of c.payload.cibles) expect(getTemplate(cible.templateId)).toBeDefined();
    }
  });
  it("invitations : ch4→tier2, ch8→tier3, ch10→tier4, uniques", () => {
    expect(chapitreParOrdre(4)?.invitationTier).toBe(2);
    expect(chapitreParOrdre(8)?.invitationTier).toBe(3);
    expect(chapitreParOrdre(10)?.invitationTier).toBe(4);
    expect(QUETES_PRINCIPALES.filter((c) => c.invitationTier).map((c) => c.ordre)).toEqual([4, 8, 10]);
  });
  it("chapitres narratifs (10, 12) : aucun objectif ; ch11 conserve ses cibles", () => {
    expect(chapitreParOrdre(10)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(12)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(11)?.payload.conserverCibles).toBe(true);
  });
  it("les objets-cibles de l'acte I existent dans les pools atteignables du tier 1", () => {
    // Garantie de trouvabilité (spec) : lampe (ch1) et pichet (ch4) doivent être
    // obtenables tier 1 : ni exclusifs à une brocante d'un tier supérieur, ni uniques.
    const exclusifsSup = new Set(BROCANTES.filter((b) => b.tier > 1).flatMap((b) => b.poolExclusif));
    for (const t of ["ma.lampe_petrole_ancienne", "ma.pichet_faience_emaillee"]) {
      expect(exclusifsSup.has(t)).toBe(false);
      expect(getTemplate(t)?.unique).toBeFalsy();
    }
  });
  it("chaque cible-objet (hors uniques) est trouvable dans le pool du tier de l'acte de son chapitre", () => {
    // Garantie de la spec trame : les objets-cibles sont garantis trouvables
    // dans le tier de l'acte du chapitre qui les demande (acte 1→tier 1,
    // acte 2→tier 2, acte 3→tier 3), sinon soft-lock (ex. lampe ch1 classée
    // tier 2 par le découpage en terciles de prix avant clamp).
    for (const c of QUETES_PRINCIPALES) {
      for (const objectif of c.payload.objectifs) {
        if (objectif.type !== "objet") continue;
        const tpl = getTemplate(objectif.templateId);
        if (tpl?.unique) continue;
        const pool = poolPourTier(c.acte as 1 | 2 | 3);
        expect(
          pool.some((t) => t.templateId === objectif.templateId),
          `${c.id} : ${objectif.templateId} introuvable dans poolPourTier(${c.acte})`,
        ).toBe(true);
      }
    }
  });
  it("plus aucun texte provisoire dans l'arc", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile("src/data/quetesPrincipales.ts", "utf8");
    expect(src).not.toContain("SP3 : texte provisoire");
  });
  it("chaque chapitre a un dialogue de 2 à 5 lignes et un corps de 2 paragraphes min", () => {
    for (const c of QUETES_PRINCIPALES) {
      expect(c.dialogue.length).toBeGreaterThanOrEqual(2);
      expect(c.dialogue.length).toBeLessThanOrEqual(5);
      expect(c.payload.corps.length).toBeGreaterThanOrEqual(2);
    }
  });
});
