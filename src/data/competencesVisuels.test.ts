import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  COMPETENCES,
  TREE_GENERAL,
  catTreeId,
  visuelCompetence,
} from "@/data/competences";
import { CATEGORIES } from "@/data/categories";

const BRANCHES_GENERAL = ["negociation", "charisme", "presentation", "vision"];
const BRANCHES_THEME = ["reparer", "connaisseur", "passion", "oeil_aiguise"];
const PALIERS = [1, 2, 3];

export const IDS_ATTENDUS = [
  ...BRANCHES_GENERAL.flatMap((b) => PALIERS.map((p) => `general.${b}.${p}`)),
  ...BRANCHES_THEME.flatMap((b) => PALIERS.map((p) => `theme.${b}.${p}`)),
];

describe("competences-prompts.json", () => {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "scripts", "competences-prompts.json"),
    "utf8",
  );
  const entries: Array<{ id: string; description: string }> = JSON.parse(raw);

  it("contient exactement les 24 ids attendus", () => {
    expect(entries.map((e) => e.id).sort()).toEqual([...IDS_ATTENDUS].sort());
  });

  it("chaque description est substantielle et sans consigne de cadre", () => {
    for (const e of entries) {
      expect(e.description.length, e.id).toBeGreaterThan(80);
      // le cadre est composité en post-traitement : aucune entrée ne doit en demander un
      expect(e.description.toLowerCase(), e.id).not.toContain("border frame");
    }
  });
});

describe("assets public/competences", () => {
  it("les 24 visuels existent en webp", () => {
    const manquants = IDS_ATTENDUS.filter(
      (id) =>
        !fs.existsSync(
          path.join(process.cwd(), "public", "competences", `${id}.webp`),
        ),
    );
    expect(manquants).toEqual([]);
  });

  it("le cadre overlay frame.svg existe", () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), "public", "competences", "frame.svg"),
      ),
    ).toBe(true);
  });
});

describe("visuelCompetence", () => {
  it("arbre général → general.*, arbre de catégorie → theme.* (partagé)", () => {
    const compGeneral = COMPETENCES.find(
      (c) =>
        c.treeId === TREE_GENERAL &&
        c.brancheId === "vision" &&
        c.palierNumero === 2,
    );
    expect(compGeneral).toBeDefined();
    expect(visuelCompetence(compGeneral!)).toBe(
      "/competences/general.vision.2.webp",
    );

    const compTheme = COMPETENCES.find(
      (c) =>
        c.treeId === catTreeId(CATEGORIES[0]) &&
        c.brancheId === "reparer" &&
        c.palierNumero === 3,
    );
    expect(compTheme).toBeDefined();
    expect(visuelCompetence(compTheme!)).toBe(
      "/competences/theme.reparer.3.webp",
    );
  });

  it("chacune des 96 compétences pointe vers un fichier webp existant", () => {
    const manquants = COMPETENCES.filter(
      (c) =>
        !fs.existsSync(path.join(process.cwd(), "public", visuelCompetence(c))),
    ).map((c) => c.id);
    expect(manquants).toEqual([]);
  });
});
