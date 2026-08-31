/**
 * Le format d'une attente. Deux présentations pour une seule règle : le carnet
 * de quêtes compte en heures (« 97 h 28 »), l'ardoise du Bazar en jours
 * (« 4 j 01 h ») — sur une ardoise, quatre jours ne se lisent pas en heures.
 */
import { describe, expect, it } from "vitest";
import { decouperRestant, formatRestant } from "./dureeRestante";

const MIN = 60_000;
const H = 60 * MIN;
const J = 24 * H;

describe("formatRestant", () => {
  it("moins d'une heure : des minutes", () => {
    expect(formatRestant(38 * MIN)).toBe("38 min");
    expect(formatRestant(MIN)).toBe("1 min");
  });

  it("une heure et plus : heures et minutes, minutes sur deux chiffres", () => {
    expect(formatRestant(4 * H + 12 * MIN)).toBe("4 h 12");
    expect(formatRestant(4 * H + 5 * MIN)).toBe("4 h 05");
  });

  it("une heure pile : pas de minutes vides", () => {
    expect(formatRestant(3 * H)).toBe("3 h");
  });

  // La minute ENTAMÉE compte : à 30 secondes de l'échéance, il reste « 1 min »
  // et non « 0 min ». Un compte à rebours qui affiche zéro pendant une minute
  // entière donne l'impression d'être arrêté.
  it("arrondit à la minute supérieure", () => {
    expect(formatRestant(30_000)).toBe("1 min");
    expect(formatRestant(0)).toBe("0 min");
    expect(formatRestant(-5000)).toBe("0 min");
  });

  describe("avec les jours", () => {
    it("au-delà de 24 h : jours et heures, heures sur deux chiffres", () => {
      expect(formatRestant(3 * J + 4 * H, { jours: true })).toBe("3 j 04 h");
      expect(formatRestant(6 * J + 23 * H, { jours: true })).toBe("6 j 23 h");
    });

    /**
     * Zéro heure ne s'écrit pas. « 2 j 00 h » ferait lire un chiffre qui
     * n'apprend rien, et la demi-heure qui traîne au-dessus d'une journée ne
     * change pas la décision du joueur — à cette distance, on lit « deux
     * jours » et on referme.
     */
    it("un jour pile, ou presque : pas d'heures vides", () => {
      expect(formatRestant(2 * J, { jours: true })).toBe("2 j");
      expect(formatRestant(J + 30 * MIN, { jours: true })).toBe("1 j");
    });

    // Sous la journée, l'ardoise retombe sur les heures puis les minutes : la
    // précision monte à mesure que l'échéance approche.
    it("sous 24 h : la présentation en heures reprend la main", () => {
      expect(formatRestant(5 * H + 9 * MIN, { jours: true })).toBe("5 h 09");
      expect(formatRestant(42 * MIN, { jours: true })).toBe("42 min");
    });

    it("sans l'option, les jours restent comptés en heures", () => {
      expect(formatRestant(3 * J + 4 * H)).toBe("76 h");
    });
  });
});

/**
 * LA MÊME ATTENTE, EN MOTS. Le tenancier du Bazar ne dit pas « 4 j » : il dit
 * « 4 jours ». Le découpage reste ici, PUR — l'unité et le nombre — et c'est
 * la couche d'affichage qui va chercher le mot dans la langue du joueur, avec
 * son singulier.
 */
describe("decouperRestant", () => {
  it("au-delà de 24 h : des jours", () => {
    expect(decouperRestant(3 * J + 4 * H)).toEqual({ unite: "jours", n: 3 });
    expect(decouperRestant(J)).toEqual({ unite: "jours", n: 1 });
  });

  it("sous 24 h : des heures", () => {
    expect(decouperRestant(5 * H + 40 * MIN)).toEqual({ unite: "heures", n: 5 });
    expect(decouperRestant(H)).toEqual({ unite: "heures", n: 1 });
  });

  it("sous une heure : des minutes", () => {
    expect(decouperRestant(42 * MIN)).toEqual({ unite: "minutes", n: 42 });
    expect(decouperRestant(30_000)).toEqual({ unite: "minutes", n: 1 });
  });

  /**
   * L'unité ne s'arrondit JAMAIS vers le haut d'un cran : à 23 h 59 il reste
   * « 23 heures », pas « 1 jour ». Promettre un jour entier quand la
   * marchandise arrive dans l'heure qui suit minuit serait un mensonge, et
   * c'est le genre qui se remarque.
   */
  it("ne promeut pas l'unité au passage", () => {
    expect(decouperRestant(24 * H - MIN)).toEqual({ unite: "heures", n: 23 });
    expect(decouperRestant(59 * MIN)).toEqual({ unite: "minutes", n: 59 });
    // En revanche l'arrondi À LA MINUTE, lui, a le droit de faire basculer :
    // 59 min 59 s, c'est une heure — personne ne dit « 60 minutes ».
    expect(decouperRestant(60 * MIN - 1000)).toEqual({ unite: "heures", n: 1 });
  });

  it("échéance atteinte : zéro minute, pas un nombre négatif", () => {
    expect(decouperRestant(-5000)).toEqual({ unite: "minutes", n: 0 });
  });
});
