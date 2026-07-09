import { describe, expect, it } from "vitest";
import { agregerJournees, libelleJournee } from "./historiqueJournalier";
import { DICTIONNAIRES } from "@/lib/i18n/ui";
import type { LedgerEntry, Session } from "@/types/game";

function ledger(jour: number, recette: number, depense: number, kind: LedgerEntry["kind"], designation: string, opts: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `${jour}-${designation}-${Math.random()}`,
    jour,
    timestamp: jour * 1000 + (opts.timestamp ?? 0),
    kind,
    designation,
    recette,
    depense,
    soldeApres: opts.soldeApres ?? 0,
    ...opts,
  };
}

function chinage(jour: number, brocanteNom: string): Session {
  return { id: `c-${jour}`, type: "chinage", jour, timestamp: jour * 1000, brocanteId: "b", brocanteNom, achats: [], xpGagne: {} };
}

function vente(jour: number): Session {
  return { id: `v-${jour}`, type: "vente", jour, timestamp: jour * 1000, niveauCamion: 1, loyer: 0, ventes: [], invendus: 0, xpGagne: {} };
}

describe("agregerJournees", () => {
  it("renvoie une ligne par jour, du plus récent au plus ancien", () => {
    const out = agregerJournees(
      [ledger(2, 0, 20, "loyer", "Loyer", { soldeApres: 80 }), ledger(5, 100, 0, "session_vente", "Marché", { sessionId: "v-5", soldeApres: 200 })],
      [vente(5)],
    );
    expect(out.map((j) => j.jour)).toEqual([5, 2]);
  });

  it("type=chinage si session chinage du jour", () => {
    const out = agregerJournees(
      [ledger(3, 0, 50, "session_chinage", "Brocante du Lac", { sessionId: "c-3", soldeApres: 950 })],
      [chinage(3, "Brocante du Lac")],
    );
    expect(out[0].type).toBe("chinage");
    expect(out[0].libelle).toBe("Brocante du Lac");
    expect(out[0].net).toBe(-50);
    expect(out[0].session).not.toBeNull();
  });

  it("type=vente, libelle=Marché du jour si session vente", () => {
    const out = agregerJournees(
      [ledger(4, 120, 0, "session_vente", "Marché", { sessionId: "v-4", soldeApres: 1120 })],
      [vente(4)],
    );
    expect(out[0].type).toBe("vente");
    expect(out[0].libelle).toBe("Marché du jour");
    expect(out[0].net).toBe(120);
  });

  it("type=repos, libelle dérivé d'upgrade prioritaire", () => {
    const out = agregerJournees(
      [
        ledger(6, 0, 180, "upgrade_atelier", "Atelier amélioré", { soldeApres: 820 }),
        ledger(6, 0, 5, "loyer", "Loyer", { soldeApres: 815, timestamp: 1 }),
      ],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Atelier amélioré");
    expect(out[0].net).toBe(-185);
  });

  it("type=repos, libelle=Loyer prélevé si seul loyer", () => {
    const out = agregerJournees(
      [ledger(7, 0, 5, "loyer", "Loyer", { soldeApres: 810 })],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Loyer prélevé");
  });

  it("type=repos, libelle=Récompense reçue si seule récompense courrier", () => {
    const out = agregerJournees(
      [ledger(8, 5, 0, "courrier_recompense", "Lettre", { soldeApres: 815 })],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Récompense reçue");
  });

  it("ignore les journées sans aucune écriture", () => {
    const out = agregerJournees([], [chinage(1, "X")]);
    expect(out).toEqual([]);
  });

  it("soldeFin = soldeApres de la dernière écriture par timestamp (entries triées asc même si données dans le désordre)", () => {
    const out = agregerJournees(
      [
        ledger(9, 100, 0, "courrier_recompense", "Récompense", { soldeApres: 900, timestamp: 2 }),
        ledger(9, 0, 10, "loyer", "Loyer", { soldeApres: 800, timestamp: 1 }),
      ],
      [],
    );
    expect(out[0].soldeFin).toBe(900);
    expect(out[0].entries.map((e) => e.designation)).toEqual(["Loyer", "Récompense"]);
  });
});

describe("libelleJournee (résolution localisée à l'affichage)", () => {
  it("session chinage avec brocanteId connu → nom de brocante localisé", () => {
    const out = agregerJournees(
      [ledger(3, 0, 50, "session_chinage", "Vide-grenier du quartier", { sessionId: "c-3", soldeApres: 950 })],
      [{
        id: "c-3",
        type: "chinage",
        jour: 3,
        timestamp: 3000,
        brocanteId: "vide-grenier-quartier",
        brocanteNom: "Vide-grenier du quartier",
        achats: [],
        xpGagne: {},
      }],
    );
    expect(libelleJournee(out[0], DICTIONNAIRES.en, "en")).toBe("Neighborhood yard sale");
    expect(libelleJournee(out[0], DICTIONNAIRES.fr, "fr")).toBe("Vide-grenier du quartier");
  });

  it("session chinage avec brocanteId inconnu → fallback brocanteNom persisté", () => {
    const out = agregerJournees(
      [ledger(3, 0, 50, "session_chinage", "Brocante disparue", { sessionId: "c-3", soldeApres: 950 })],
      [{
        id: "c-3",
        type: "chinage",
        jour: 3,
        timestamp: 3000,
        brocanteId: "id-inconnu-vieille-save",
        brocanteNom: "Brocante disparue",
        achats: [],
        xpGagne: {},
      }],
    );
    expect(libelleJournee(out[0], DICTIONNAIRES.en, "en")).toBe("Brocante disparue");
  });

  it("journée vente → d.cahier.marcheDuJour localisé", () => {
    const out = agregerJournees(
      [ledger(4, 120, 0, "session_vente", "Marché", { sessionId: "v-4", soldeApres: 1120 })],
      [vente(4)],
    );
    expect(libelleJournee(out[0], DICTIONNAIRES.en, "en")).toBe(DICTIONNAIRES.en.cahier.marcheDuJour);
    expect(libelleJournee(out[0], DICTIONNAIRES.es, "es")).toBe(DICTIONNAIRES.es.cahier.marcheDuJour);
  });

  it("journée repos → libellé localisé selon la priorité (atelier amélioré)", () => {
    const out = agregerJournees(
      [ledger(6, 0, 180, "upgrade_atelier", "Atelier amélioré", { soldeApres: 820 })],
      [],
    );
    expect(libelleJournee(out[0], DICTIONNAIRES.en, "en")).toBe(DICTIONNAIRES.en.cahier.atelierAmeliore);
  });

  it("journée repos sans écriture reconnue → libellé générique 'journée de repos' localisé", () => {
    const out = agregerJournees(
      [ledger(7, 0, 0, "frais_brocante", "Entrée", { soldeApres: 800 })],
      [],
    );
    expect(libelleJournee(out[0], DICTIONNAIRES.es, "es")).toBe(DICTIONNAIRES.es.cahier.journeeRepos);
  });
});
