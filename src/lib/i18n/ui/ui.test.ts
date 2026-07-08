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
    expect(derives).toEqual([]);
  });
});
