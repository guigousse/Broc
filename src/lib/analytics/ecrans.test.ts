import { describe, it, expect } from "vitest";
import { nomEcran } from "./ecrans";

describe("nomEcran", () => {
  it("nomme les pièces du QG", () => {
    expect(nomEcran("/bureau")).toBe("bureau");
    expect(nomEcran("/stockage")).toBe("stockage");
    expect(nomEcran("/atelier")).toBe("atelier");
    expect(nomEcran("/collection")).toBe("collection");
    expect(nomEcran("/bibliotheque")).toBe("bibliotheque");
  });

  it("distingue les écrans de vitrine", () => {
    expect(nomEcran("/vitrine/prep")).toBe("vitrine-prep");
    expect(nomEcran("/vitrine/broc-42/journee")).toBe("vitrine-journee");
    expect(nomEcran("/vitrine/broc-42")).toBe("vitrine");
    expect(nomEcran("/vitrine")).toBe("vitrine");
  });

  it("ne fait jamais fuiter un identifiant de brocante dans le nom d'écran", () => {
    expect(nomEcran("/chiner/broc-42")).toBe("chiner");
  });

  it("nomme le menu et le bazar", () => {
    expect(nomEcran("/")).toBe("menu");
    expect(nomEcran("/bazar")).toBe("bazar");
  });

  it("rend null pour les écrans hors jeu et les entrées vides", () => {
    expect(nomEcran("/privacy")).toBeNull();
    expect(nomEcran("/mentions-legales")).toBeNull();
    expect(nomEcran(null)).toBeNull();
  });
});
