import { describe, expect, it } from "vitest";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";

describe("dictionnaires UI", () => {
  it("les trois locales existent et divergent réellement", () => {
    expect(DICTIONNAIRES.fr.menu.nouvellePartie).toBe("Nouvelle partie");
    expect(DICTIONNAIRES.en.menu.nouvellePartie).toBe("New game");
    expect(DICTIONNAIRES.es.menu.nouvellePartie).toBe("Nueva partida");
  });

  it("tr interpole les paramètres {x}", () => {
    expect(tr("Jour {jour} · Niveau {niveau}", { jour: 2, niveau: 5 })).toBe(
      "Jour 2 · Niveau 5",
    );
  });

  it("tr laisse le gabarit intact pour un paramètre manquant", () => {
    expect(tr("il y a {n} min")).toBe("il y a {n} min");
  });
});
