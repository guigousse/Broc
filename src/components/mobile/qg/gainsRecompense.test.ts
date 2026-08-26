import { describe, expect, it } from "vitest";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";
import { listerGains, STYLE_GAIN_BASE } from "./gainsRecompense";

const d = DICTIONNAIRES.fr;
const TOUT = { argent: 250, xp: 40, energie: 2, jetons: 3 };

describe("listerGains", () => {
  it("n'écrit aucun « + » : une récompense ne s'additionne à rien, elle se reçoit", () => {
    // Le « + » a sa place dans le GRAND LIVRE, où une ligne de crédit se lit
    // contre des lignes de débit. Sur une plaque qui s'intitule déjà
    // « Récompense », il n'apprend rien et vole la place du montant.
    for (const g of listerGains(TOUT, d, tr)) {
      expect(g.texte).not.toContain("+");
    }
  });

  it("le grand livre, lui, garde son « + » : ce sont deux clés distinctes", () => {
    // Garde-fou de la séparation : si quelqu'un « nettoie » les clés du
    // carnet en réutilisant celles-ci, le crédit du grand livre perdrait son
    // signe sans qu'aucun autre test ne bronche.
    expect(tr(d.carnet.jetonXp, { n: 40 })).toContain("+");
    expect(tr(d.carnet.jetonBazarN, { n: 3 })).toContain("+");
  });

  it("ne retient que les gains non nuls, dans l'ordre argent, xp, énergie, Bazarcoin", () => {
    expect(listerGains(TOUT, d, tr).map((g) => g.cle)).toEqual([
      "argent",
      "xp",
      "energie",
      "bazar",
    ]);
    // Un gain nul ne produit PAS de pastille : la cérémonie d'envol masque
    // les pastilles qu'elle trouve et n'émet d'étape que pour les gains non
    // nuls — une pastille à zéro resterait invisible pour toute la partie.
    expect(listerGains({ argent: 0, xp: 12, energie: 0, jetons: 0 }, d, tr).map((g) => g.cle))
      .toEqual(["xp"]);
  });

  it("le Bazarcoin sort en chiffre nu, son signe étant dessiné à côté", () => {
    const bazar = listerGains(TOUT, d, tr).find((g) => g.cle === "bazar")!;
    expect(bazar.texte).toBe("3");
    expect(bazar.signe).toBe(true);
    // Les autres portent leur unité dans le texte : pas de signe à dessiner.
    expect(listerGains(TOUT, d, tr).filter((g) => g.signe).length).toBe(1);
  });

  it("les quatre langues énoncent leurs gains sans « + »", () => {
    for (const [langue, dict] of Object.entries(DICTIONNAIRES)) {
      for (const g of listerGains(TOUT, dict, tr)) {
        expect(`${langue}:${g.texte}`).not.toContain("+");
      }
    }
  });
});

describe("STYLE_GAIN_BASE", () => {
  it("écrit les montants dans la police d'affichage, celle de la caisse", () => {
    // C'est là que le joueur compare ce qu'il gagne à ce qu'il possède ; et
    // c'est la seule fonte du jeu où le « € » (0,727 em) est à la hauteur du
    // signe Bazarcoin. En Cormorant il ne mesure que 0,492 em.
    expect(STYLE_GAIN_BASE.fontFamily).toBe("var(--font-display)");
  });

  it("demande les chiffres alignés et tabulaires", () => {
    // En style ancien — le défaut de Cormorant — le « 3 » plonge à -0,276 em
    // sous la ligne de base et le montant paraît petit et bancal.
    expect(STYLE_GAIN_BASE.fontVariantNumeric).toContain("lining-nums");
    expect(STYLE_GAIN_BASE.fontVariantNumeric).toContain("tabular-nums");
  });

  it("porte un corps franchement plus grand que le libellé qui le coiffe (9 px)", () => {
    // 15 px : le montant mesure alors 11,9 px d'encre contre 9,1 avant, et le
    // « € » 10,9 contre 6,4 — mesuré sur les vraies fontes, pas estimé.
    expect(Number(STYLE_GAIN_BASE.fontSize)).toBeGreaterThanOrEqual(15);
  });
});
