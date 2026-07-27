import { describe, expect, it } from "vitest";
import { resoudreEpisode } from "./episode.mjs";

const catalogue = new Map([
  ["art.aquarelle_marine_xixe", { id: "art.aquarelle_marine_xixe", nom: "Aquarelle marine du XIXe", categorie: "Objets d'art", rarete: "commun", prixTresBon: 35 }],
  ["lv.cartes_postales_anciennes", { id: "lv.cartes_postales_anciennes", nom: "Cartes postales anciennes (boîte)", categorie: "Livres & Papeterie", rarete: "commun", prixTresBon: 9 }],
]);

const personas = new Map([
  ["retraite_chineur", "an elderly French retired man in his 70s, flat wool cap"],
]);

const toutExiste = () => true;

function brut(surcharge = {}) {
  return {
    id: "ep01",
    items: ["art.aquarelle_marine_xixe", "lv.cartes_postales_anciennes"],
    vedette: "art.aquarelle_marine_xixe",
    acheteur: "a French woman in her thirties, denim jacket",
    fond: "autumn morning",
    accroche: "Elle vaut combien ?",
    plan1: { action: "she picks it up", demande: "Vous en voulez combien ?", prix: "Quarante euros." },
    plan2: { denouement: "marchande", action: "she folds her arms", replique: "Vingt-cinq." },
    chute: "auto",
    ...surcharge,
  };
}

describe("resoudreEpisode", () => {
  it("associe chaque objet à son fichier .webp", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.items).toHaveLength(2);
    expect(r.items[0].nom).toBe("Aquarelle marine du XIXe");
    expect(r.items[0].fichier).toMatch(/public\/items\/art\.aquarelle_marine_xixe\.webp$/);
  });

  it("désigne l'objet vedette", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.vedette.id).toBe("art.aquarelle_marine_xixe");
    expect(r.vedette.prixTresBon).toBe(35);
  });

  it("refuse un objet absent du catalogue en le nommant", () => {
    const ko = brut({ items: ["art.inexistant"], vedette: "art.inexistant" });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /art\.inexistant.*catalogue/i,
    );
  });

  it("refuse un objet sans image en le nommant", () => {
    expect(() =>
      resoudreEpisode(brut(), { catalogue, personas, fichierExiste: () => false }),
    ).toThrow(/art\.aquarelle_marine_xixe.*image/i);
  });

  it("refuse une vedette absente de la liste d'objets", () => {
    const ko = brut({ vedette: "lv.autre_chose" });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /vedette/i,
    );
  });

  it("résout un acheteur donné par identifiant de persona", () => {
    const r = resoudreEpisode(brut({ acheteur: "retraite_chineur" }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.acheteur).toBe("an elderly French retired man in his 70s, flat wool cap");
  });

  it("garde une description d'acheteur libre telle quelle", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.acheteur).toBe("a French woman in her thirties, denim jacket");
  });

  it("compose la chute automatique d'un achat à partir de la cote", () => {
    const r = resoudreEpisode(brut({ plan2: { denouement: "achete", action: "elle paie", replique: "Je la prends." } }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Valeur réelle : 35 €");
  });

  it("compose la chute automatique d'un marchandage", () => {
    const r = resoudreEpisode(brut(), { catalogue, personas, fichierExiste: toutExiste });
    expect(r.chute).toBe("Vous auriez accepté ?");
  });

  it("compose la chute automatique d'un départ", () => {
    const r = resoudreEpisode(brut({ plan2: { denouement: "repart", action: "elle s'éloigne", replique: "Je vais réfléchir." } }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Trop cher ? Ou l'affaire du jour ?");
  });

  it("laisse une chute écrite à la main intacte", () => {
    const r = resoudreEpisode(brut({ chute: "Et vous, vous auriez cédé ?" }), {
      catalogue,
      personas,
      fichierExiste: toutExiste,
    });
    expect(r.chute).toBe("Et vous, vous auriez cédé ?");
  });

  it("refuse un dénouement inconnu", () => {
    const ko = brut({ plan2: { denouement: "hesite", action: "…", replique: "…" } });
    expect(() => resoudreEpisode(ko, { catalogue, personas, fichierExiste: toutExiste })).toThrow(
      /hesite/,
    );
  });
});
