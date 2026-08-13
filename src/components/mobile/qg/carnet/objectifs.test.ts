import { describe, expect, it } from "vitest";
import { libelleObjectif, objectifEnEuros } from "./objectifs";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import type { ObjectifMission } from "@/types/game";

const d = DICTIONNAIRES.fr;
const tr = (g: string, p?: Record<string, string | number>) =>
  Object.entries(p ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), g);

describe("objectifEnEuros", () => {
  it("les quatre types monétaires sont vrais", () => {
    for (const t of ["ventesCumulees", "profitVente", "valeurCollection", "beneficeCumule"] as const) {
      expect(objectifEnEuros(t)).toBe(true);
    }
  });
  it("les types qui comptent autre chose sont faux", () => {
    for (const t of ["objet", "objetsRares", "ventesCategorie", "niveau", "restauration"] as const) {
      expect(objectifEnEuros(t)).toBe(false);
    }
  });
});

describe("libelleObjectif", () => {
  it("interpole la catégorie traduite", () => {
    const o: ObjectifMission = { type: "ventesCategorie", categorie: "Mode", nombre: 5 };
    const s = libelleObjectif(o, d, tr);
    expect(s).toContain("Mode");
    expect(s).not.toMatch(/\{[a-z]+\}/);
  });
  it("aucun type ne rend une accolade non remplacée", () => {
    const tous: ObjectifMission[] = [
      { type: "objet", templateId: "ma.x" },
      { type: "ventesCumulees", montant: 300 },
      { type: "profitVente", montant: 60 },
      { type: "restauration", etatMin: "Bon" },
      { type: "valeurCollection", montant: 1500 },
      { type: "niveau", niveau: 12 },
      { type: "objetsRares", nombre: 2 },
      { type: "beneficeCumule", montant: 850 },
      { type: "ventesCategorie", categorie: "Musique", nombre: 4 },
    ];
    for (const o of tous) expect(libelleObjectif(o, d, tr)).not.toMatch(/\{[a-z]+\}/);
  });
});
