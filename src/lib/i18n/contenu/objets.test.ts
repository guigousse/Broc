import { describe, expect, test } from "vitest";
import { ALL_TEMPLATES, getTemplate } from "@/data/objetTemplates";
import { OBJETS_EN } from "@/lib/i18n/contenu/en/objets";
import { OBJETS_ES } from "@/lib/i18n/contenu/es/objets";
import { OBJETS_EL } from "@/lib/i18n/contenu/el/objets";
import { manquants, nomObjet, nomTemplate, orphelins } from "@/lib/i18n/contenu";

const IDS = ALL_TEMPLATES.map((t) => t.templateId);

describe.each([
  ["EN", OBJETS_EN],
  ["ES", OBJETS_ES],
  ["EL", OBJETS_EL],
] as const)("overlay objets %s", (_, overlay) => {
  test("complétude : chaque templateId a son nom", () => {
    expect(manquants(IDS, overlay)).toEqual([]);
  });
  test("pas d'entrée orpheline", () => {
    expect(orphelins(IDS, overlay)).toEqual([]);
  });
  test("pas de nom vide", () => {
    expect(Object.entries(overlay).filter(([, v]) => !v.trim())).toEqual([]);
  });
});

describe("résolution", () => {
  const id = ALL_TEMPLATES[0].templateId;
  test("fr = nom canonique du template", () => {
    expect(nomTemplate(id, "fr")).toBe(getTemplate(id)!.nom);
  });
  test("en = overlay", () => {
    expect(nomTemplate(id, "en")).toBe(OBJETS_EN[id]);
  });
  test("id inconnu → fallback id (marqueur visible, pas de crash)", () => {
    expect(nomTemplate("xx.inconnu", "en")).toBe("xx.inconnu");
  });
  test("nomObjet : snapshot legacy sans template → fallback nom persisté", () => {
    expect(nomObjet({ templateId: "legacy", nom: "Vieux truc" }, "en")).toBe("Vieux truc");
  });
  test("nomObjet : préfère le nom du template au snapshot (renames)", () => {
    expect(nomObjet({ templateId: id, nom: "Ancien nom snapshoté" }, "fr")).toBe(
      getTemplate(id)!.nom,
    );
  });
});
