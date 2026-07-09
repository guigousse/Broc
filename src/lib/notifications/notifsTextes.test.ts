import { describe, expect, test } from "vitest";
import { planifierPleinEnergie } from "./energieNotif";
import { notifsQuetes } from "./quetesNotif";
import { construireRappels } from "./rappelRetour";
import { notifsRestauration } from "./restaurationNotif";
import { DICTIONNAIRES } from "@/lib/i18n/ui";

/**
 * Notifs sans OS : on teste les BUILDERS purs de `NotifSpec` (pas `programmer`,
 * qui exige le runtime Tauri). `planifierPleinEnergie` n'est pas pur (elle
 * appelle `programmer`) mais reste testable : hors Tauri, `programmer()` est
 * un no-op silencieux — on ne peut donc valider son texte qu'indirectement via
 * le dictionnaire. On vérifie plutôt la cohérence dico ici, et les builders
 * purs des 3 autres modules directement.
 */

describe("notifs énergie : dictionnaire par locale", () => {
  test("titre/corps traduits selon la locale", () => {
    expect(DICTIONNAIRES.fr.notifs.energie.titre).toBe("Énergie pleine ⚡");
    expect(DICTIONNAIRES.en.notifs.energie.titre).toBe("Full energy ⚡");
    expect(DICTIONNAIRES.es.notifs.energie.titre).toBe("Energía al máximo ⚡");
    expect(DICTIONNAIRES.en.notifs.energie.titre).not.toBe(
      DICTIONNAIRES.fr.notifs.energie.titre,
    );
  });

  test("planifierPleinEnergie ne lève pas hors Tauri (no-op silencieux)", async () => {
    await expect(
      planifierPleinEnergie(Date.now() + 1000, "en"),
    ).resolves.toBeUndefined();
  });
});

describe("notifsQuetes : builder pur, textes selon la locale", () => {
  const now = Date.UTC(2026, 0, 5, 6, 0, 0); // lundi 5 janvier 2026, 06:00 UTC
  const etatToutFait = { quotidienNonTerminee: false, hebdoNonTerminee: false };

  test("FR : titres/corps des 2 notifs « nouvelles commandes »", () => {
    const specs = notifsQuetes(now, etatToutFait, "fr");
    expect(specs[0].title).toBe("Nouvelles commandes");
    expect(specs[0].body).toBe("De nouvelles commandes du jour t'attendent !");
    expect(specs[1].title).toBe("Commandes de la semaine");
  });

  test("EN : mêmes notifs traduites, distinctes du FR", () => {
    const specs = notifsQuetes(now, etatToutFait, "en");
    expect(specs[0].title).toBe("New orders");
    expect(specs[0].body).toBe("Today's new orders are waiting for you!");
    expect(specs[0].title).not.toBe("Nouvelles commandes");
  });

  test("ES : rappel quotidien traduit quand la quête n'est pas terminée", () => {
    const specs = notifsQuetes(
      Date.UTC(2026, 0, 5, 6, 0, 0),
      { quotidienNonTerminee: true, hebdoNonTerminee: false },
      "es",
    );
    const rappel = specs.find((s) => s.title === "Pedidos del día pendientes");
    expect(rappel).toBeDefined();
    expect(rappel?.body).toBe(
      "¡Todavía te quedan pedidos del día por cumplir antes de medianoche!",
    );
  });
});

describe("construireRappels : série J+1/3/7 selon la locale", () => {
  const now = Date.now();

  test("FR : 3 rappels avec les titres attendus", () => {
    const rappels = construireRappels(now, "fr");
    expect(rappels).toHaveLength(3);
    expect(rappels[0].title).toBe("Ta brocante prend la poussière…");
    expect(rappels[1].title).toBe("Des affaires t'attendent !");
    expect(rappels[2].title).toBe("On range le camion ?");
  });

  test("EN : titres traduits, distincts du FR", () => {
    const rappels = construireRappels(now, "en");
    expect(rappels[0].title).toBe("Your stall is gathering dust…");
    expect(rappels[0].title).not.toBe("Ta brocante prend la poussière…");
  });
});

describe("notifsRestauration : nom d'objet localisé au scheduling", () => {
  const now = Date.now();
  // Présent dans les 3 overlays i18n (objetTemplates.ts + objets.ts en/es).
  const objets = [
    {
      templateId: "br.scie_egoine_de_charpentier",
      nom: "Scie égoïne de charpentier",
      finMs: now + 1000,
    },
  ];

  test("FR : titre « Atelier », corps avec le nom FR", () => {
    const specs = notifsRestauration(objets, now, "fr");
    expect(specs[0].title).toBe("Atelier");
    expect(specs[0].body).toBe("« Scie égoïne de charpentier » est restauré ✓");
  });

  test("EN : titre et nom localisés, différents du FR", () => {
    const specs = notifsRestauration(objets, now, "en");
    expect(specs[0].title).toBe("Workshop");
    expect(specs[0].body).toBe('"Carpenter\'s hand saw" is restored ✓');
  });
});
