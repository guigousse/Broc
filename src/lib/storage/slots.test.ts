// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLE_INDEX,
  changerSlotActif,
  chargerIndex,
  cleBackup,
  cleSlot,
  premierSlotLibre,
  renommerSlot,
  resumeSlot,
  slotActif,
  supprimerSlot,
  toucherDerniereSession,
  viderSlotActif,
} from "./slots";

const CLE_LEGACY = "projet-broc:game-state:v1";

beforeEach(() => {
  localStorage.clear();
});

describe("index par défaut", () => {
  it("sans rien en storage : actif 1, trois slots vides", () => {
    const idx = chargerIndex();
    expect(idx.actif).toBe(1);
    expect(idx.slots).toEqual({ 1: null, 2: null, 3: null });
  });
});

describe("migration legacy", () => {
  it("copie game-state:v1 vers slot 1, vérifie, crée l'index, supprime la legacy", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');

    const idx = chargerIndex();

    expect(localStorage.getItem(cleSlot(1))).toBe('{"budget":123}');
    expect(localStorage.getItem(CLE_LEGACY)).toBeNull();
    expect(idx.actif).toBe(1);
    expect(idx.slots[1]).not.toBeNull();
    expect(idx.slots[1]?.nom).toBeNull();
    expect(typeof idx.slots[1]?.derniereSession).toBe("number");
  });

  it("échec de relecture : rien n'est détruit", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');

    // Simule une écriture silencieusement perdue (ex. quota atteint sans
    // exception, ou storage partiellement fonctionnel) : setItem n'écrit
    // réellement rien tant que le spy est actif.
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});

    const idx = chargerIndex();

    spy.mockRestore();

    expect(localStorage.getItem(CLE_LEGACY)).toBe('{"budget":123}');
    expect(localStorage.getItem(cleSlot(1))).toBeNull();
    expect(localStorage.getItem(CLE_INDEX)).toBeNull();
    expect(idx.actif).toBe(1);
    expect(idx.slots[1]).toBeNull();
    expect(idx.slots[2]).toBeNull();
    expect(idx.slots[3]).toBeNull();
  });

  it("idempotente : un second chargerIndex ne refait rien", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');
    const premier = chargerIndex();

    const second = chargerIndex();

    expect(second).toEqual(premier);
    expect(localStorage.getItem(CLE_LEGACY)).toBeNull();
    expect(localStorage.getItem(cleSlot(1))).toBe('{"budget":123}');
  });

  it("pas de migration si un index existe déjà mais est corrompu", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');
    localStorage.setItem(CLE_INDEX, "not-valid-json{");

    const idx = chargerIndex();

    // La clé d'index existe (même corrompue) : on ne migre pas par-dessus,
    // on retombe sur le défaut sans toucher à la legacy.
    expect(idx).toEqual({ actif: 1, slots: { 1: null, 2: null, 3: null } });
    expect(localStorage.getItem(cleSlot(1))).toBeNull();
    expect(localStorage.getItem(CLE_LEGACY)).toBe('{"budget":123}');
  });

  it("pas de migration si un index existe déjà", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({ actif: 2, slots: { 1: null, 2: null, 3: null } }),
    );

    const idx = chargerIndex();

    expect(idx.actif).toBe(2);
    expect(localStorage.getItem(cleSlot(1))).toBeNull();
    // La legacy n'est pas touchée puisqu'un index existe déjà.
    expect(localStorage.getItem(CLE_LEGACY)).toBe('{"budget":123}');
  });

  it("pas de migration si la clé du slot 1 existe déjà (état anormal) : rien n'est écrasé", () => {
    localStorage.setItem(CLE_LEGACY, '{"budget":123}');
    localStorage.setItem(cleSlot(1), '{"budget":999}');

    const idx = chargerIndex();

    // La clé du slot 1 garde sa valeur d'origine, pas celle de la legacy.
    expect(localStorage.getItem(cleSlot(1))).toBe('{"budget":999}');
    // Aucun index n'a été créé : ni migration, ni suppression de la legacy.
    expect(localStorage.getItem(CLE_INDEX)).toBeNull();
    expect(localStorage.getItem(CLE_LEGACY)).toBe('{"budget":123}');
    expect(idx).toEqual({ actif: 1, slots: { 1: null, 2: null, 3: null } });
  });
});

describe("opérations", () => {
  it("changerSlotActif persiste", () => {
    changerSlotActif(2);
    expect(slotActif()).toBe(2);
    expect(chargerIndex().actif).toBe(2);
  });

  it("renommerSlot trim/tronque/vide→null et préserve derniereSession", () => {
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 12345 },
          2: null,
          3: null,
        },
      }),
    );

    renommerSlot(1, "  Ma partie de test qui dépasse largement vingt-quatre caractères  ");
    let idx = chargerIndex();
    expect(idx.slots[1]?.nom).toBe("Ma partie de test qui dé");
    expect(idx.slots[1]?.nom?.length).toBe(24);
    expect(idx.slots[1]?.derniereSession).toBe(12345);

    renommerSlot(1, "   ");
    idx = chargerIndex();
    expect(idx.slots[1]?.nom).toBeNull();
    expect(idx.slots[1]?.derniereSession).toBe(12345);
  });

  it("renommerSlot sur un slot vide : no-op, pas de MetaSlot fantôme", () => {
    renommerSlot(2, "Nom fantôme");

    const idx = chargerIndex();
    expect(idx.slots[2]).toBeNull();
  });

  it("supprimerSlot d'un slot non actif : clé effacée, entrée null, actif inchangé", () => {
    localStorage.setItem(cleSlot(2), '{"budget":1}');
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 100 },
          2: { nom: null, derniereSession: 200 },
          3: null,
        },
      }),
    );

    supprimerSlot(2);

    const idx = chargerIndex();
    expect(idx.actif).toBe(1);
    expect(idx.slots[2]).toBeNull();
    expect(localStorage.getItem(cleSlot(2))).toBeNull();
  });

  it("supprimerSlot emporte aussi la copie de secours du slot", () => {
    localStorage.setItem(cleSlot(2), '{"budget":1}');
    localStorage.setItem(cleBackup(2), '{"budget":1}');
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 100 },
          2: { nom: null, derniereSession: 200 },
          3: null,
        },
      }),
    );

    supprimerSlot(2);

    expect(localStorage.getItem(cleBackup(2))).toBeNull();
  });

  it("supprimerSlot de l'actif : bascule sur le slot occupé le plus récent", () => {
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 100 },
          2: { nom: null, derniereSession: 200 },
          3: null,
        },
      }),
    );

    supprimerSlot(1);

    const idx = chargerIndex();
    expect(idx.actif).toBe(2);
    expect(idx.slots[1]).toBeNull();
  });

  it("supprimerSlot de l'actif sans autre slot occupé : actif inchangé (vide)", () => {
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: { 1: { nom: null, derniereSession: 100 }, 2: null, 3: null },
      }),
    );

    supprimerSlot(1);

    const idx = chargerIndex();
    expect(idx.actif).toBe(1);
    expect(idx.slots[1]).toBeNull();
  });

  it("premierSlotLibre : 1→2→3→null", () => {
    expect(premierSlotLibre()).toBe(1);

    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: { 1: { nom: null, derniereSession: 1 }, 2: null, 3: null },
      }),
    );
    expect(premierSlotLibre()).toBe(2);

    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 1 },
          2: { nom: null, derniereSession: 2 },
          3: null,
        },
      }),
    );
    expect(premierSlotLibre()).toBe(3);

    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: null, derniereSession: 1 },
          2: { nom: null, derniereSession: 2 },
          3: { nom: null, derniereSession: 3 },
        },
      }),
    );
    expect(premierSlotLibre()).toBeNull();
  });

  it("premierSlotLibre ignore un slot dont l'entrée d'index est null mais la clé de save existe encore (orpheline)", () => {
    localStorage.setItem(cleSlot(1), '{"budget":1}');
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({ actif: 1, slots: { 1: null, 2: null, 3: null } }),
    );

    // Le slot 1 a une entrée d'index null mais une vraie save dessous : il
    // n'est pas libre. Le slot 2 est réellement vide.
    expect(premierSlotLibre()).toBe(2);
  });

  it("resumeSlot lit jourActuel/brocanteur.niveau/budget ; null si vide ou JSON invalide", () => {
    expect(resumeSlot(1)).toBeNull();

    localStorage.setItem(
      cleSlot(1),
      JSON.stringify({
        budget: 456,
        jourActuel: 7,
        brocanteur: { xp: 0, niveau: 3, pointsDisponibles: 0 },
      }),
    );
    // valeurCollection : 0 par défaut (save sans collection lisible).
    expect(resumeSlot(1)).toEqual({
      jour: 7,
      niveau: 3,
      budget: 456,
      valeurCollection: 0,
    });

    localStorage.setItem(cleSlot(2), "not-valid-json{");
    expect(resumeSlot(2)).toBeNull();

    // valeurCollection somme les donations de la collection (plancher entier),
    // et une collection partiellement absente/corrompue ne casse rien.
    localStorage.setItem(
      cleSlot(2),
      JSON.stringify({
        budget: 10,
        jourActuel: 1,
        brocanteur: { xp: 0, niveau: 1, pointsDisponibles: 0 },
        collection: {
          Maison: [{ donation: { valeur: 120.9 } }, {}],
          Musique: [{ donation: { valeur: 65 } }],
        },
      }),
    );
    expect(resumeSlot(2)?.valeurCollection).toBe(185);

    localStorage.setItem(cleSlot(3), JSON.stringify({ budget: 1 }));
    expect(resumeSlot(3)).toBeNull();
  });

  it("viderSlotActif : vide la clé et l'entrée d'index de l'actif, sans rebasculer l'actif", () => {
    localStorage.setItem(cleSlot(1), '{"budget":1}');
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: "Ma partie", derniereSession: 100 },
          2: { nom: null, derniereSession: 200 },
          3: null,
        },
      }),
    );

    viderSlotActif();

    const idx = chargerIndex();
    expect(idx.actif).toBe(1);
    expect(idx.slots[1]).toBeNull();
    expect(localStorage.getItem(cleSlot(1))).toBeNull();
    // Le slot 2, pourtant plus récent, n'est pas touché : contrairement à
    // supprimerSlot, viderSlotActif ne rebascule jamais l'actif.
    expect(idx.slots[2]).toEqual({ nom: null, derniereSession: 200 });
  });

  it("viderSlotActif sur un index par défaut (rien en storage) : no-op propre", () => {
    viderSlotActif();

    const idx = chargerIndex();
    expect(idx.actif).toBe(1);
    expect(idx.slots).toEqual({ 1: null, 2: null, 3: null });
  });

  it("toucherDerniereSession upsert sans écraser le nom", () => {
    localStorage.setItem(
      CLE_INDEX,
      JSON.stringify({
        actif: 1,
        slots: {
          1: { nom: "Ma partie", derniereSession: 1 },
          2: null,
          3: null,
        },
      }),
    );

    toucherDerniereSession(1);
    let idx = chargerIndex();
    expect(idx.slots[1]?.nom).toBe("Ma partie");
    expect(idx.slots[1]?.derniereSession).toBeGreaterThan(1);

    toucherDerniereSession(2);
    idx = chargerIndex();
    expect(idx.slots[2]?.nom).toBeNull();
    expect(typeof idx.slots[2]?.derniereSession).toBe("number");
  });
});

describe("renommerSlot — clé orpheline (index sans entrée)", () => {
  it("renomme un slot occupé par sa clé même si l'index le croit vide", () => {
    // Clé de save présente mais AUCUNE entrée d'index (état « index corrompu »
    // que construireLignes affiche comme occupé — le Renommer doit marcher).
    localStorage.setItem(cleSlot(2), JSON.stringify({ budget: 42 }));
    renommerSlot(2, "Partie orpheline");
    expect(chargerIndex().slots[2]?.nom).toBe("Partie orpheline");
  });

  it("reste un no-op sur un slot réellement vide (ni clé ni entrée)", () => {
    renommerSlot(3, "Fantôme");
    expect(chargerIndex().slots[3]).toBeNull();
  });
});
