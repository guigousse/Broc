import { describe, expect, it } from "vitest";
import type { Courrier, MissionResolution } from "@/types/game";
import {
  ID_LETTRE_MAMAN_DEBUT,
  ID_MISSIONS_TEST,
  creerCourrierMission,
  creerLettreInvitation,
  creerLettreMamanDebut,
  creerMissionsTest,
  expireMissions,
  injecterLettreInvitationSiDue,
  injecterLettreMamanSiAbsente,
  migrerCourriers,
} from "./courrier";

describe("creerLettreMamanDebut", () => {
  it("crée une lettre avec l'ID stable", () => {
    const l = creerLettreMamanDebut(1);
    expect(l.id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(l.type).toBe("lettre");
  });

  it("non lue par défaut", () => {
    expect(creerLettreMamanDebut(1).lu).toBe(false);
  });

  it("jourRecu = jour passé en paramètre", () => {
    expect(creerLettreMamanDebut(42).jourRecu).toBe(42);
  });

  it("payload contient une récompense de 150 €", () => {
    const l = creerLettreMamanDebut(1);
    if (l.payload.type === "lettre") {
      expect(l.payload.recompense?.argent).toBe(150);
      expect(l.payload.expediteurId).toBe("maman");
      expect(l.payload.titre).toBeTruthy();
      expect(Array.isArray(l.payload.corps)).toBe(true);
    } else {
      expect.fail("payload should be a 'lettre'");
    }
  });
});

describe("creerLettreInvitation", () => {
  it("creerLettreInvitation : lettre non lue des organisateurs, id stable", () => {
    const c = creerLettreInvitation(2, 5);
    expect(c.id).toBe("invitation_tier2");
    expect(c.lu).toBe(false);
    expect(c.jourRecu).toBe(5);
    expect(c.type).toBe("lettre");
    if (c.payload.type === "lettre") {
      expect(c.payload.expediteurId).toBe("organisateurs");
      expect(c.payload.titre).toBeTruthy();
      expect(Array.isArray(c.payload.corps)).toBe(true);
      expect(c.payload.recompense).toBeUndefined();
    } else {
      expect.fail("payload should be a 'lettre'");
    }
  });

  it("id stable par tier (3 et 4)", () => {
    expect(creerLettreInvitation(3, 1).id).toBe("invitation_tier3");
    expect(creerLettreInvitation(4, 1).id).toBe("invitation_tier4");
  });

  it("titre/corps distincts par tier", () => {
    const t2 = creerLettreInvitation(2, 1);
    const t4 = creerLettreInvitation(4, 1);
    if (t2.payload.type === "lettre" && t4.payload.type === "lettre") {
      expect(t2.payload.titre).not.toBe(t4.payload.titre);
    }
  });
});

describe("injecterLettreInvitationSiDue", () => {
  it("ajoute la lettre du tier si absente", () => {
    const res = injecterLettreInvitationSiDue([], 2, 5);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("invitation_tier2");
  });

  it("n'ajoute rien si tier absent (chapitre sans invitation)", () => {
    const courriers = [creerLettreMamanDebut(1)];
    expect(injecterLettreInvitationSiDue(courriers, undefined, 5)).toBe(courriers);
  });

  it("idempotent : n'ajoute pas de doublon si la lettre est déjà présente", () => {
    const existante = creerLettreInvitation(2, 1);
    const res = injecterLettreInvitationSiDue([existante], 2, 5);
    expect(res).toEqual([existante]);
    expect(res.length).toBe(1);
  });

  it("préserve les courriers existants quand on injecte", () => {
    const autre = creerLettreMamanDebut(1);
    const res = injecterLettreInvitationSiDue([autre], 3, 7);
    expect(res.length).toBe(2);
    expect(res[0]).toBe(autre);
    expect(res[1].id).toBe("invitation_tier3");
  });
});

describe("migrerCourriers", () => {
  it("retourne [] si entrée undefined", () => {
    expect(migrerCourriers(undefined)).toEqual([]);
  });

  it("retourne [] si entrée non-array", () => {
    expect(migrerCourriers({} as unknown as Courrier[])).toEqual([]);
  });

  it("filtre les anciens courriers d'huissier", () => {
    const courriers = [
      { id: "h1", type: "huissier" } as unknown as Courrier,
      creerLettreMamanDebut(1),
      { id: "h2", type: "huissier" } as unknown as Courrier,
    ];
    const res = migrerCourriers(courriers);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe(ID_LETTRE_MAMAN_DEBUT);
  });

  it("conserve les autres lettres", () => {
    const l = creerLettreMamanDebut(1);
    expect(migrerCourriers([l])).toEqual([l]);
  });
});

describe("injecterLettreMamanSiAbsente", () => {
  it("injecte la lettre si jamais distribuée", () => {
    const res = injecterLettreMamanSiAbsente([], [], 1);
    expect(res.courriers.length).toBe(1);
    expect(res.courriers[0].id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(res.declencheursAjoutes).toEqual([ID_LETTRE_MAMAN_DEBUT]);
  });

  it("n'injecte pas si déjà dans la liste des courriers", () => {
    const existante = creerLettreMamanDebut(1);
    const res = injecterLettreMamanSiAbsente([existante], [], 1);
    expect(res.courriers.length).toBe(1);
    expect(res.declencheursAjoutes).toEqual([]);
  });

  it("n'injecte pas si déjà dans declencheursDeclenches", () => {
    const res = injecterLettreMamanSiAbsente(
      [],
      [ID_LETTRE_MAMAN_DEBUT],
      1,
    );
    expect(res.courriers).toEqual([]);
    expect(res.declencheursAjoutes).toEqual([]);
  });

  it("préserve les courriers existants quand on injecte", () => {
    const autreCourrier = {
      ...creerLettreMamanDebut(1),
      id: "autre",
    };
    const res = injecterLettreMamanSiAbsente([autreCourrier], [], 5);
    expect(res.courriers.length).toBe(2);
    expect(res.courriers[0]).toBe(autreCourrier);
    expect(res.courriers[1].id).toBe(ID_LETTRE_MAMAN_DEBUT);
    expect(res.courriers[1].jourRecu).toBe(5);
  });
});

describe("creerCourrierMission", () => {
  it("crée un courrier de type mission avec les bons champs", () => {
    const c = creerCourrierMission({
      id: "miss-1",
      jour: 5,
      expediteurId: "joueur_vide_grenier",
      titre: "Une quête vidéoludique",
      corps: ["Cher chineur,", "Trouve-moi **Ocarina of Time**."],
      categorie: "quotidienne",
      cibles: [{ templateId: "jeu.zelda_ocarina", etatMin: "Très bon" }],
      jourLimite: 12,
      recompense: { argent: 200 },
    });
    expect(c.type).toBe("mission");
    expect(c.lu).toBe(false);
    expect(c.jourRecu).toBe(5);
    if (c.payload.type === "mission") {
      expect(c.payload.cibles[0].templateId).toBe("jeu.zelda_ocarina");
      expect(c.payload.cibles[0].etatMin).toBe("Très bon");
      expect(c.payload.jourLimite).toBe(12);
      expect(c.payload.recompense.argent).toBe(200);
    } else {
      throw new Error("payload should be mission");
    }
  });
});

describe("expireMissions", () => {
  function missionCourrier(id: string, jourLimite?: number): Courrier {
    return {
      id,
      type: "mission",
      jourRecu: 1,
      lu: true,
      payload: {
        type: "mission",
        categorie: "quotidienne",
        expediteurId: "x",
        titre: "T",
        corps: [],
        cibles: [{ templateId: "tpl" }],
        jourLimite,
        recompense: { argent: 50 },
      },
    };
  }

  it("expire les missions actives dont jourLimite < jourActuel", () => {
    const courriers: Courrier[] = [missionCourrier("m1", 5)];
    const missions: MissionResolution[] = [{ courrierId: "m1", statut: "active" }];
    const out = expireMissions(missions, courriers, 6);
    expect(out).toEqual([
      { courrierId: "m1", statut: "expiree", jourResolution: 6 },
    ]);
  });

  it("laisse intactes les missions sans jourLimite", () => {
    const courriers: Courrier[] = [missionCourrier("m1")];
    const missions: MissionResolution[] = [{ courrierId: "m1", statut: "active" }];
    const out = expireMissions(missions, courriers, 999);
    expect(out).toEqual(missions);
  });

  it("laisse intactes les missions déjà livrées", () => {
    const courriers: Courrier[] = [missionCourrier("m1", 2)];
    const missions: MissionResolution[] = [
      { courrierId: "m1", statut: "livree", jourResolution: 1 },
    ];
    const out = expireMissions(missions, courriers, 100);
    expect(out).toEqual(missions);
  });
});

describe("creerMissionsTest (déprécié, SP2)", () => {
  it("ne produit plus de missions de démo (générateur + arc principal à la place)", () => {
    expect(creerMissionsTest(1)).toEqual([]);
    expect(ID_MISSIONS_TEST).toEqual([]);
  });
});
