import { describe, expect, it } from "vitest";
import { QUETES_PRINCIPALES, chapitreParOrdre } from "./quetesPrincipales";
import { BROCANTES } from "./brocantes";
import { getTemplate, poolPourTier } from "./objetTemplates";

describe("trame principale (squelette SP2)", () => {
  it("16 chapitres, ordres 1..16 uniques, ids stables", () => {
    expect(QUETES_PRINCIPALES).toHaveLength(16);
    const ordres = QUETES_PRINCIPALES.map((c) => c.ordre).sort((a, b) => a - b);
    expect(ordres).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    // Les 12 ids historiques `trame_chN` restent présents (saves + i18n),
    // même si leur `ordre` a bougé (extension 4 actes 2026-08-07).
    const ids = new Set(QUETES_PRINCIPALES.map((c) => c.id));
    expect(ids.size).toBe(16);
    for (let n = 1; n <= 12; n++) expect(ids.has(`trame_ch${n}`)).toBe(true);
  });
  it("4 actes de 4 chapitres, actes croissants le long de l'ordre", () => {
    const parOrdre = [...QUETES_PRINCIPALES].sort((a, b) => a.ordre - b.ordre);
    expect(parOrdre.map((c) => c.acte)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]);
  });
  it("« Les bijoux de la reine » est la 2ᵉ mission de l'acte 4", () => {
    const acte4 = [...QUETES_PRINCIPALES].filter((c) => c.acte === 4).sort((a, b) => a.ordre - b.ordre);
    expect(acte4[1]?.id).toBe("trame_ch11");
    expect(acte4[1]?.payload.titre).toBe("Les bijoux de la reine");
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
  it("invitations : ordre 4→tier2, 8→tier3, 13→tier4, uniques", () => {
    expect(chapitreParOrdre(4)?.invitationTier).toBe(2);
    expect(chapitreParOrdre(8)?.invitationTier).toBe(3);
    expect(chapitreParOrdre(13)?.invitationTier).toBe(4);
    expect(QUETES_PRINCIPALES.filter((c) => c.invitationTier).map((c) => c.ordre)).toEqual([4, 8, 13]);
  });
  it("chapitres narratifs (13, 16) : aucun objectif ; les bijoux (14) conservent leurs cibles", () => {
    expect(chapitreParOrdre(13)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(16)?.payload.objectifs).toEqual([]);
    expect(chapitreParOrdre(14)?.payload.conserverCibles).toBe(true);
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
