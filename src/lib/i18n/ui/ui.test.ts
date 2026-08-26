import { describe, expect, it } from "vitest";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { el } from "@/lib/i18n/ui/el";

describe("dictionnaires UI", () => {
  it("les trois locales existent et divergent réellement", () => {
    expect(DICTIONNAIRES.fr.menu.nouvellePartie).toBe("Nouvelle partie");
    expect(DICTIONNAIRES.en.menu.nouvellePartie).toBe("New game");
    expect(DICTIONNAIRES.es.menu.nouvellePartie).toBe("Nueva partida");
    expect(el.menu.nouvellePartie).toBe("Νέα παρτίδα");
  });

  it("tr interpole les paramètres {x}", () => {
    expect(tr("Jour {jour} · Niveau {niveau}", { jour: 2, niveau: 5 })).toBe(
      "Jour 2 · Niveau 5",
    );
  });

  it("tr laisse le gabarit intact pour un paramètre manquant", () => {
    expect(tr("il y a {n} min")).toBe("il y a {n} min");
  });

  it("parité des placeholders {x} : chaque feuille EN/ES porte exactement les jetons du FR", () => {
    // tsc garantit la PRÉSENCE des clés (DeepStrings) ; ce test garantit
    // que les gabarits restent interpolables : un {n} oublié dans une
    // traduction compilerait mais livrerait une chaîne cassée en silence.
    const jetons = (s: string) =>
      [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

    const derives: string[] = [];
    const compare = (
      fr: Record<string, unknown>,
      autre: Record<string, unknown>,
      locale: string,
      chemin: string,
    ) => {
      for (const [cle, valeurFr] of Object.entries(fr)) {
        const valeurAutre = autre[cle];
        if (typeof valeurFr === "string") {
          if (jetons(valeurFr) !== jetons(valeurAutre as string)) {
            derives.push(
              `${locale}:${chemin}${cle} — fr[${jetons(valeurFr)}] vs [${jetons(valeurAutre as string)}]`,
            );
          }
        } else {
          compare(
            valeurFr as Record<string, unknown>,
            valeurAutre as Record<string, unknown>,
            locale,
            `${chemin}${cle}.`,
          );
        }
      }
    };

    compare(DICTIONNAIRES.fr, DICTIONNAIRES.en, "en", "");
    compare(DICTIONNAIRES.fr, DICTIONNAIRES.es, "es", "");
    compare(DICTIONNAIRES.fr, el, "el", "");
    expect(derives).toEqual([]);
  });

  it("l'onglet des compétences porte le nom de l'écran qu'il ouvre, dans les 4 langues", () => {
    // L'écran s'appelle « Compétences » depuis longtemps ; en français seul,
    // la barre disait encore « Biblio. » et le joueur cherchait un rapport
    // entre les deux (retour 2026-08-26). La route reste `/bibliotheque` —
    // c'est un chemin, pas un mot lu.
    for (const d of [DICTIONNAIRES.fr, DICTIONNAIRES.en, DICTIONNAIRES.es, el]) {
      expect(d.chrome.onglets.bibliotheque).toBe(d.bibliotheque.titre);
      // L'abrégé de la colonne étroite doit rester le MÊME mot, seulement
      // coupé : « Biblio. » pour « Compétences » nommait autre chose.
      const abrege = d.chrome.onglets.bibliothequeAbrege.replace(/\.$/, "");
      expect(d.bibliotheque.titre.startsWith(abrege)).toBe(true);
    }
  });

  it("la consigne d'ouverture nomme l'onglet réellement affiché, dans les 4 langues", () => {
    for (const d of [DICTIONNAIRES.fr, DICTIONNAIRES.en, DICTIONNAIRES.es, el]) {
      const consigne = d.tutoriel.instructions["stockage-ouvrir"];
      expect(consigne).toContain(d.chrome.onglets.reserve);
      // Le piège : « Ouvre le Stockage » resterait vrai pour le code et faux
      // pour le joueur, qui ne voit plus ce mot nulle part dans la barre.
      // Assertion sautée quand reserve === stockage (grec, où les deux
      // onglets partagent encore le même mot — décision de langue en attente ;
      // la consigne reste alors correcte quel que soit le mot qu'elle cite).
      if (d.chrome.onglets.reserve !== d.chrome.onglets.stockage) {
        expect(consigne).not.toContain(d.chrome.onglets.stockage);
      }
    }
  });
});
