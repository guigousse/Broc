import { describe, expect, test } from "vitest";
import { ALL_TEMPLATES, getTemplate } from "@/data/objetTemplates";
import { OBJETS_EN } from "@/lib/i18n/contenu/en/objets";
import { manquants, nomObjet, nomTemplate, orphelins } from "@/lib/i18n/contenu";

const IDS = ALL_TEMPLATES.map((t) => t.templateId);

describe("overlay objets EN", () => {
  test("complétude : chaque templateId a son nom EN", () => {
    expect(manquants(IDS, OBJETS_EN)).toEqual([]);
  });
  test("pas d'entrée orpheline (id inconnu du catalogue)", () => {
    expect(orphelins(IDS, OBJETS_EN)).toEqual([]);
  });
  test("pas de nom vide", () => {
    const vides = Object.entries(OBJETS_EN).filter(([, v]) => !v.trim());
    expect(vides).toEqual([]);
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
