import { describe, expect, it } from "vitest";
import { CARTES } from "@/data/cartes";
import { CARTES_DUEL } from "@/data/duel/cartesDuel";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import { el } from "@/lib/i18n/ui/el";
import { libelleTexteDuel } from "@/lib/duel/libelles";

describe("libelleTexteDuel", () => {
  it("compose les 50 textes dans les 4 langues sans jeton {x} restant ni vide pour une carte à texte", () => {
    for (const d of [DICTIONNAIRES.fr, DICTIONNAIRES.en, DICTIONNAIRES.es, el]) {
      for (const c of CARTES) {
        const t = CARTES_DUEL[c.id].texte;
        const s = libelleTexteDuel(t, d);
        expect(s).not.toMatch(/\{\w+\}/);
        expect(s, c.id).not.toMatch(/undefined/);
        if (t) expect(s.length, c.id).toBeGreaterThan(0);
        else expect(s).toBe("");
      }
    }
  });

  it("exemples FR", () => {
    const d = DICTIONNAIRES.fr;
    expect(libelleTexteDuel({ type: "barrage" }, d)).toBe("Barrage");
    expect(libelleTexteDuel({ type: "cri", variante: "pioche" }, d)).toBe("Cri : piochez 1 carte");
    expect(libelleTexteDuel(CARTES_DUEL["carte.manuscrit_enlumine_xve"].texte, d)).toBe("À la pose, piochez 2 cartes.");
    expect(libelleTexteDuel(CARTES_DUEL["carte.violon_de_maitre_cremonais_1715"].texte, d)).toBe(
      "En début de votre tour, vos objets Musique gagnent +1 d'attaque.",
    );
    expect(libelleTexteDuel(CARTES_DUEL["carte.baby_foot_de_competition_minibon_homologue"].texte, d)).toBe(
      "À la pose, 1 dégât à tous les objets adverses et piochez 1 carte.",
    );
    expect(libelleTexteDuel(CARTES_DUEL["carte.rabot_d_ebeniste_a_semelle_modele_605"].texte, d)).toBe(
      "Quand il attaque, 1 dégât à la vitrine adverse.",
    );
  });
});
