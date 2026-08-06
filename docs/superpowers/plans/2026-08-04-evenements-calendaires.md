# Événements calendaires — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grande Braderie (brocante événementielle le premier week-end de septembre du calendrier de jeu) + anniversaire annuel avec vinyle cadeau chaque 11 juin de jeu.

**Architecture:** Un module pur `src/lib/evenements.ts` (jours de braderie en temps de jeu) + généralisation de `src/lib/anniversaire.ts` (cadeau par année). La braderie est une entrée permanente de `BROCANTES` (contrainte export statique Next : `generateStaticParams` pré-rend les routes depuis `BROCANTES`) filtrée à l'affichage et gatée par un nouveau variant de `ConditionDeblocage`. Effets branchés aux mêmes points que le boost célébrité.

**Tech Stack:** Next.js (export statique, Tauri iOS), TypeScript strict, vitest, i18n maison FR/EN/ES/EL (FR canonique + overlays).

**Spec:** `docs/superpowers/specs/2026-08-04-evenements-calendaires-design.md`

## Global Constraints

- Code, commentaires et commits en **français** (style du repo).
- **`npx vitest run --maxWorkers=4`** obligatoire sur cette machine (sinon ~41 faux échecs par famine de workers). Pour un fichier : `npx vitest run --maxWorkers=4 src/lib/evenements.test.ts`.
- `npm run lint` est cassé (Next 16) → utiliser **`npx eslint src`**.
- **Pas de bump de `SAVE_VERSION`** (reste 17) : tout le suivi passe par `declencheursDeclenches: string[]` (types/game.ts:363).
- **Jamais de chaîne localisée en save** ; la locale est résolue à l'affichage.
- Toute clé ajoutée dans `src/lib/i18n/ui/fr.ts` est **obligatoire** dans `en.ts`, `es.ts`, `el.ts` (type `DeepStrings<typeof fr>`). Tout contenu (brocante, dialogue) ajouté en FR exige ses 3 overlays (tests bloquants `contenu/*.test.ts`).
- La brocante `grande-braderie` reste **en permanence** dans `BROCANTES` (routes statiques) ; seule la visibilité/le déblocage sont conditionnels.
- Travailler sur une branche `feat/evenements-calendaires` depuis `main`.

## Valeurs d'équilibrage initiales (à ajuster en recette, pas dans ce plan)

| Constante | Valeur | Où |
|---|---|---|
| `FRAIS_ENTREE_BRADERIE` | 10 | `src/data/brocantes.ts` (fraisEntree) |
| `taillePool` braderie | 18 (boss = 12) | entrée `BROCANTES` |
| `facteurBourse` braderie | 1.5 | entrée `BROCANTES` |
| `RABAIS_BRADERIE` (prix vendeurs) | 0.7 | `src/lib/chine.ts` |
| `BRADERIE_INTERVALLE_MULT` (affluence vente) | 0.7 | `src/lib/vitrine.ts` |
| Boost raretés braderie | réutilise `CELEBRITE_BOOST_RARES` (×2 sur non-communs) | `src/lib/chine.ts` |

---

### Task 1: Module `evenements.ts` — jours de braderie en temps de jeu

**Files:**
- Create: `src/lib/evenements.ts`
- Test: `src/lib/evenements.test.ts`

**Interfaces:**
- Consomme : `dateForJour(jour)`, `jourForDate(date)` de `src/lib/calendrier.ts` (tout en UTC).
- Produit (utilisé par les tâches 5-9) :
  - `ID_GRANDE_BRADERIE = "grande-braderie"` (string)
  - `estGrandeBraderie(brocante: Pick<Brocante, "id">): boolean`
  - `samediBraderie(annee: number): number` — jour de jeu du 1ᵉʳ samedi de septembre de l'année interne
  - `estJourBraderie(jour: number): boolean`
  - `prochaineBraderie(jour: number): number` — samedi de la braderie en cours ou de la prochaine

Repère de calcul pour les tests : jour 1 = vendredi 6 juin 1924 (`DATE_JOUR_1`, calendrier.ts:12). Le 1ᵉʳ samedi de septembre 1924 est le 6 septembre → jour de jeu **93** (25 jours de juin + 31 + 31 + 6). En 1925, c'est le 5 septembre.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/evenements.test.ts
import { describe, expect, it } from "vitest";
import {
  ID_GRANDE_BRADERIE,
  estGrandeBraderie,
  estJourBraderie,
  prochaineBraderie,
  samediBraderie,
} from "@/lib/evenements";
import { dateForJour } from "@/lib/calendrier";

describe("samediBraderie", () => {
  it("retourne le 1ᵉʳ samedi de septembre 1924 (jour 93)", () => {
    expect(samediBraderie(1924)).toBe(93);
    const d = dateForJour(93);
    expect(d.getUTCMonth()).toBe(8);
    expect(d.getUTCDate()).toBe(6);
    expect(d.getUTCDay()).toBe(6); // samedi
  });

  it("tombe toujours un samedi de septembre entre le 1ᵉʳ et le 7 (10 années)", () => {
    for (let annee = 1924; annee < 1934; annee++) {
      const d = dateForJour(samediBraderie(annee));
      expect(d.getUTCDay()).toBe(6);
      expect(d.getUTCMonth()).toBe(8);
      expect(d.getUTCDate()).toBeGreaterThanOrEqual(1);
      expect(d.getUTCDate()).toBeLessThanOrEqual(7);
    }
  });
});

describe("estJourBraderie", () => {
  it("vrai le samedi et le dimanche de la braderie, faux autour", () => {
    expect(estJourBraderie(92)).toBe(false);
    expect(estJourBraderie(93)).toBe(true); // samedi
    expect(estJourBraderie(94)).toBe(true); // dimanche
    expect(estJourBraderie(95)).toBe(false);
  });

  it("exactement 2 jours de braderie par année de jeu (vérifié sur 3 ans)", () => {
    let count = 0;
    for (let jour = 1; jour <= 3 * 365; jour++) {
      if (estJourBraderie(jour)) count += 1;
    }
    expect(count).toBe(6);
  });
});

describe("prochaineBraderie", () => {
  it("retourne le samedi à venir depuis le début de partie", () => {
    expect(prochaineBraderie(1)).toBe(93);
  });
  it("retourne le samedi courant pendant la braderie (samedi et dimanche)", () => {
    expect(prochaineBraderie(93)).toBe(93);
    expect(prochaineBraderie(94)).toBe(93);
  });
  it("bascule sur l'année suivante dès le lundi", () => {
    const suivant = prochaineBraderie(95);
    expect(suivant).toBeGreaterThan(94);
    expect(estJourBraderie(suivant)).toBe(true);
    expect(dateForJour(suivant).getUTCFullYear()).toBe(1925);
  });
});

describe("estGrandeBraderie", () => {
  it("matche uniquement l'id de la braderie", () => {
    expect(estGrandeBraderie({ id: ID_GRANDE_BRADERIE })).toBe(true);
    expect(estGrandeBraderie({ id: "vide-grenier-quartier" })).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/evenements.test.ts`
Attendu : FAIL (module `@/lib/evenements` introuvable).

- [ ] **Step 3: Implémenter**

```ts
// src/lib/evenements.ts
import { dateForJour, jourForDate } from "@/lib/calendrier";
import type { Brocante } from "@/types/game";

/**
 * Événements du calendrier de jeu (spec 2026-08-04-evenements-calendaires).
 * Tout est exprimé en JOURS DE JEU (compteur linéaire, jour 1 = vendredi
 * 6 juin — cf. calendrier.ts). Aucun événement n'est calé sur la date réelle.
 */

/** Id de la brocante événementielle (entrée permanente de BROCANTES). */
export const ID_GRANDE_BRADERIE = "grande-braderie";

export function estGrandeBraderie(brocante: Pick<Brocante, "id">): boolean {
  return brocante.id === ID_GRANDE_BRADERIE;
}

/** Jour de jeu du premier samedi de septembre de l'année interne donnée. */
export function samediBraderie(annee: number): number {
  for (let n = 1; n <= 7; n++) {
    const d = new Date(Date.UTC(annee, 8, n));
    if (d.getUTCDay() === 6) return jourForDate(d);
  }
  /* istanbul ignore next -- une semaine contient toujours un samedi */
  throw new Error("septembre sans samedi");
}

/** Vrai si `jour` est l'un des deux jours de la Grande Braderie. */
export function estJourBraderie(jour: number): boolean {
  const samedi = samediBraderie(dateForJour(jour).getUTCFullYear());
  return jour === samedi || jour === samedi + 1;
}

/** Samedi de la braderie en cours (samedi/dimanche inclus) ou de la prochaine. */
export function prochaineBraderie(jour: number): number {
  const annee = dateForJour(jour).getUTCFullYear();
  const samedi = samediBraderie(annee);
  return jour <= samedi + 1 ? samedi : samediBraderie(annee + 1);
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/evenements.test.ts`
Attendu : PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/evenements.ts src/lib/evenements.test.ts
git commit -m "feat(evenements): calcul des jours de Grande Braderie en temps de jeu"
```

---

### Task 2: Anniversaire annuel — cadeau par année dans `anniversaire.ts`

**Files:**
- Modify: `src/lib/anniversaire.ts`
- Modify: `src/lib/chine.ts` (exporter `FACTEUR_ETAT`, actuellement privé l.27)
- Test: `src/lib/anniversaire.test.ts` (compléter l'existant)

**Interfaces:**
- Consomme : `ANNEE_DEBUT`, `jourForDate` de `calendrier.ts` (vérifier que `ANNEE_DEBUT` est exporté, calendrier.ts:9 — l'exporter sinon) ; `VINYLE_AUDIO_URLS` de `src/data/vinylesAudio.ts` (les 24 vinyles) ; `FACTEUR_ETAT` de `chine.ts` (`"Pristin état": 1.4`).
- Produit (utilisé par les tâches 3-4) :
  - `VINYLES_CADEAU_PAR_ANNEE: readonly [string, string, string]` — jazz, whale song, punk bot
  - `idDeclencheurCadeau(annee: number): string` — `"cadeau_anniversaire"` pour 1, `` `cadeau_anniversaire_a${n}` `` sinon
  - `jourAnniversaire(annee: number): number` — jour de jeu du 11 juin de la n-ième année (année 1 → jour 6)
  - `nbAnniversairesAtteints(jourActuel: number): number`
  - `cadeauEnAttente(state): number | null` — année du plus ancien cadeau non récupéré (null si rien / tuto en cours)
  - `cadeauAnniversaireVisible(state): boolean` — signature conservée (layout QG), désormais `cadeauEnAttente !== null`
  - `objetCadeauAnniversaire(annee: number, state): Objet` — **signature changée** (avant : sans argument)
  - `vinylesPossedes(state): Set<string>`
  - `vinylesCadeauxExclus(state: Pick<GameState, "declencheursDeclenches">): Set<string>`
- Existants conservés tels quels : `ID_DECLENCHEUR_CADEAU`, `TEMPLATE_VINYLE_CADEAU`, `estVinyle`, `doigtSwipeVersGramophone`. `JOUR_ANNIVERSAIRE = 6` conservé (alias historique, égal à `jourAnniversaire(1)`).

- [ ] **Step 1: Écrire les tests qui échouent** (ajouter à `src/lib/anniversaire.test.ts`)

```ts
import {
  cadeauEnAttente,
  idDeclencheurCadeau,
  jourAnniversaire,
  nbAnniversairesAtteints,
  objetCadeauAnniversaire,
  vinylesCadeauxExclus,
  VINYLES_CADEAU_PAR_ANNEE,
  ID_DECLENCHEUR_CADEAU,
} from "@/lib/anniversaire";
import { VINYLE_AUDIO_URLS } from "@/data/vinylesAudio";

// Base d'état minimale pour cadeauEnAttente (adapter aux helpers du fichier existant).
const base = {
  tutorielEtape: "termine" as const,
  declencheursDeclenches: [] as string[],
};

describe("anniversaire annuel", () => {
  it("jourAnniversaire : année 1 = jour 6, année 2 un an plus tard (11 juin 1925)", () => {
    expect(jourAnniversaire(1)).toBe(6);
    expect(jourAnniversaire(2)).toBe(6 + 365); // 1924-06-11 → 1925-06-11 (1924 bissextile, février déjà passé)
  });

  it("nbAnniversairesAtteints compte les 11 juin passés", () => {
    expect(nbAnniversairesAtteints(5)).toBe(0);
    expect(nbAnniversairesAtteints(6)).toBe(1);
    expect(nbAnniversairesAtteints(jourAnniversaire(2) - 1)).toBe(1);
    expect(nbAnniversairesAtteints(jourAnniversaire(3))).toBe(3);
  });

  it("idDeclencheurCadeau : rétro-compatible année 1", () => {
    expect(idDeclencheurCadeau(1)).toBe(ID_DECLENCHEUR_CADEAU);
    expect(idDeclencheurCadeau(2)).toBe("cadeau_anniversaire_a2");
  });

  it("cadeauEnAttente : le plus ancien d'abord, un seul à la fois", () => {
    const state = { ...base, jourActuel: jourAnniversaire(2) };
    expect(cadeauEnAttente(state)).toBe(1);
    const apresAn1 = { ...state, declencheursDeclenches: [idDeclencheurCadeau(1)] };
    expect(cadeauEnAttente(apresAn1)).toBe(2);
    const tout = { ...apresAn1, declencheursDeclenches: [idDeclencheurCadeau(1), idDeclencheurCadeau(2)] };
    expect(cadeauEnAttente(tout)).toBeNull();
  });

  it("cadeauEnAttente : null pendant le tutoriel et avant le jour 6", () => {
    expect(cadeauEnAttente({ ...base, tutorielEtape: "intro" as never, jourActuel: 10 })).toBeNull();
    expect(cadeauEnAttente({ ...base, jourActuel: 5 })).toBeNull();
  });

  it("vinylesCadeauxExclus : les 3 exclusifs tant que non offerts, réintégrés ensuite", () => {
    expect(vinylesCadeauxExclus({ declencheursDeclenches: [] })).toEqual(
      new Set(VINYLES_CADEAU_PAR_ANNEE),
    );
    const apres = vinylesCadeauxExclus({
      declencheursDeclenches: [idDeclencheurCadeau(1), idDeclencheurCadeau(3)],
    });
    expect(apres).toEqual(new Set([VINYLES_CADEAU_PAR_ANNEE[1]]));
  });
});

describe("objetCadeauAnniversaire par année", () => {
  // Fixture minimal pour la partie « possession » de l'état (typage souple
  // volontaire : objetCadeauAnniversaire ne lit que ces trois champs).
  const stateVide = {
    inventaireJoueur: [] as { templateId: string }[],
    vitrine: null,
    collection: {},
  } as never;

  it("années 1-3 : templates fixes, états Très bon puis Pristin", () => {
    const an1 = objetCadeauAnniversaire(1, stateVide);
    expect(an1.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[0]);
    expect(an1.etat).toBe("Très bon");
    const an2 = objetCadeauAnniversaire(2, stateVide);
    expect(an2.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[1]);
    expect(an2.etat).toBe("Pristin état");
    const an3 = objetCadeauAnniversaire(3, stateVide);
    expect(an3.templateId).toBe(VINYLES_CADEAU_PAR_ANNEE[2]);
    expect(an3.etat).toBe("Pristin état");
  });

  it("année 4+ : un vinyle du catalogue NON possédé, en Pristin état", () => {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const possedesSaufUn = tous.slice(1); // tout sauf le premier
    const state = {
      ...stateVide,
      inventaireJoueur: possedesSaufUn.map((templateId) => ({ templateId }) as never),
    };
    for (let i = 0; i < 20; i++) {
      const cadeau = objetCadeauAnniversaire(4, state);
      expect(cadeau.templateId).toBe(tous[0]);
      expect(cadeau.etat).toBe("Pristin état");
    }
  });

  it("année 4+ à 24/24 : doublon aléatoire du catalogue, jamais d'erreur", () => {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const state = {
      ...stateVide,
      inventaireJoueur: tous.map((templateId) => ({ templateId }) as never),
    };
    const cadeau = objetCadeauAnniversaire(4, state);
    expect(tous).toContain(cadeau.templateId);
    expect(cadeau.etat).toBe("Pristin état");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/anniversaire.test.ts`
Attendu : FAIL (exports manquants).

- [ ] **Step 3: Implémenter**

Dans `src/lib/chine.ts` l.27 : `const FACTEUR_ETAT` → `export const FACTEUR_ETAT`.
Si `ANNEE_DEBUT` n'est pas exporté par `calendrier.ts` (l.9), l'exporter.

Dans `src/lib/anniversaire.ts`, remplacer `cadeauAnniversaireVisible` et `objetCadeauAnniversaire`, ajouter :

```ts
import type { EtatObjet, GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { VINYLE_AUDIO_URLS } from "@/data/vinylesAudio";
import { ANNEE_DEBUT, jourForDate } from "@/lib/calendrier";
import { FACTEUR_ETAT } from "@/lib/chine";

/**
 * Vinyles offerts par Maman, dans l'ordre des années. Tant qu'un vinyle de
 * cette liste n'a pas été offert, il est EXCLU de tous les tirages de chine
 * (genererSession, La Fouille, boîte mystère) — cf. vinylesCadeauxExclus.
 */
export const VINYLES_CADEAU_PAR_ANNEE = [
  "mus.33tours_jazz_1",
  "mus.vinyle_whale_song_son_terrestre_n1",
  "mus.vinyle_free_robot_des_punkbot",
] as const;

/** Année 1 garde son id historique (saves existantes). */
export function idDeclencheurCadeau(annee: number): string {
  return annee === 1 ? ID_DECLENCHEUR_CADEAU : `cadeau_anniversaire_a${annee}`;
}

/** Jour de jeu du 11 juin de la n-ième année (année 1 = jour 6). */
export function jourAnniversaire(annee: number): number {
  return jourForDate(new Date(Date.UTC(ANNEE_DEBUT + annee - 1, 5, 11)));
}

export function nbAnniversairesAtteints(jourActuel: number): number {
  let n = 0;
  while (jourAnniversaire(n + 1) <= jourActuel) n += 1;
  return n;
}

/**
 * Année du plus ancien cadeau d'anniversaire non récupéré (un seul paquet à
 * la fois), ou null. `>=` implicite : une partie au-delà d'un 11 juin reçoit
 * le cadeau en retard, comme l'an 1 historiquement.
 */
export function cadeauEnAttente(
  state: Pick<GameState, "jourActuel" | "tutorielEtape" | "declencheursDeclenches">,
): number | null {
  if (state.tutorielEtape !== "termine") return null;
  const atteints = nbAnniversairesAtteints(state.jourActuel);
  for (let annee = 1; annee <= atteints; annee++) {
    if (!state.declencheursDeclenches.includes(idDeclencheurCadeau(annee))) {
      return annee;
    }
  }
  return null;
}

export function cadeauAnniversaireVisible(
  state: Pick<GameState, "jourActuel" | "tutorielEtape" | "declencheursDeclenches">,
): boolean {
  return cadeauEnAttente(state) !== null;
}

/** Vinyles possédés : stockage, coffre de vitrine, et collection (donnés). */
export function vinylesPossedes(
  state: Pick<GameState, "inventaireJoueur" | "vitrine" | "collection">,
): Set<string> {
  const possedes = new Set<string>();
  for (const o of state.inventaireJoueur) {
    if (estVinyle(o.templateId)) possedes.add(o.templateId);
  }
  for (const ov of state.vitrine?.objets ?? []) {
    if (estVinyle(ov.objet.templateId)) possedes.add(ov.objet.templateId);
  }
  for (const slots of Object.values(state.collection)) {
    for (const slot of slots ?? []) {
      if (slot.donation !== null && estVinyle(slot.templateId)) {
        possedes.add(slot.templateId);
      }
    }
  }
  return possedes;
}

/** Vinyles cadeau encore exclusifs — à unir aux exclusions de chinage. */
export function vinylesCadeauxExclus(
  state: Pick<GameState, "declencheursDeclenches">,
): Set<string> {
  const exclus = new Set<string>();
  VINYLES_CADEAU_PAR_ANNEE.forEach((templateId, i) => {
    if (!state.declencheursDeclenches.includes(idDeclencheurCadeau(i + 1))) {
      exclus.add(templateId);
    }
  });
  return exclus;
}

/**
 * Instancie le cadeau de l'année donnée. Années 1-3 : templates fixes
 * (Très bon pour l'an 1 — lié au mini-tuto restauration — puis Pristin).
 * Année 4+ : un vinyle non possédé, en Pristin ; à 24/24, doublon aléatoire
 * (jamais de repli énergie : l'IAP énergie infinie le viderait de sens).
 */
export function objetCadeauAnniversaire(
  annee: number,
  state: Pick<GameState, "inventaireJoueur" | "vitrine" | "collection">,
): Objet {
  let templateId: string;
  if (annee <= VINYLES_CADEAU_PAR_ANNEE.length) {
    templateId = VINYLES_CADEAU_PAR_ANNEE[annee - 1];
  } else {
    const tous = Object.keys(VINYLE_AUDIO_URLS);
    const possedes = vinylesPossedes(state);
    const candidats = tous.filter((id) => !possedes.has(id));
    const source = candidats.length > 0 ? candidats : tous;
    templateId = source[Math.floor(Math.random() * source.length)];
  }
  const tpl = getTemplate(templateId);
  if (!tpl) throw new Error(`template introuvable : ${templateId}`);
  const etat: EtatObjet = annee === 1 ? "Très bon" : "Pristin état";
  return {
    id: crypto.randomUUID(),
    templateId: tpl.templateId,
    nom: tpl.nom,
    categorie: tpl.categorie,
    rarete: tpl.rarete,
    etat,
    prixReferenceReel: Math.max(1, Math.round(tpl.prixRefBase * FACTEUR_ETAT[etat])),
  };
}
```

Vérifier la forme exacte des slots de collection (champ `donation`, cf. `uniquesExclusDuChinage`, chine.ts:339-353) et adapter `vinylesPossedes` si besoin. Mettre à jour les anciens tests du fichier qui appellent `objetCadeauAnniversaire()` sans argument.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/anniversaire.test.ts src/lib/chine.test.ts`
Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anniversaire.ts src/lib/anniversaire.test.ts src/lib/chine.ts src/lib/calendrier.ts
git commit -m "feat(anniversaire): cadeau annuel par année — 3 vinyles exclusifs puis vinyle non possédé en Pristin"
```

---

### Task 3: GameContext + layout QG + dialogue récurrent

**Files:**
- Modify: `src/context/GameContext.tsx` (imports l.32-36, `ouvrirCadeauAnniversaire` l.1027-1047, interface l.188-189)
- Modify: `src/app/(qg)/layout.tsx` (state local l.179-180, QgCadeau l.582-590, ColisOverlay l.862-871)
- Modify: `src/data/dialogues.ts` (`SEQUENCES_ANNIVERSAIRE`, ~l.82-97)
- Modify: `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` (overlay de la nouvelle séquence)
- Test: `src/data/dialogues` couvert par le test d'overlay existant (`contenu/*.test.ts`) — vérifier qu'il passe

**Interfaces:**
- Consomme : `cadeauEnAttente`, `idDeclencheurCadeau`, `objetCadeauAnniversaire(annee, state)` (Task 2).
- Produit : `ouvrirCadeauAnniversaire: () => { objet: Objet; annee: number } | null` (**type changé** dans l'interface du contexte) ; séquence `SEQUENCES_ANNIVERSAIRE.anniv_cadeau_recurrent`.

- [ ] **Step 1: Nouvelle séquence de dialogue (FR canonique + 3 overlays)**

Dans `src/data/dialogues.ts`, ajouter à `SEQUENCES_ANNIVERSAIRE` :

```ts
  anniv_cadeau_recurrent: {
    id: "anniv_cadeau_recurrent",
    lignes: [
      { humeur: "emu", texte: "Joyeux anniversaire, petit ! Ta mère n'oublie jamais la date — cette année encore, le facteur est arrivé en sifflotant." },
      { humeur: "souriant", texte: "Encore un disque pour ta collection ! File l'ajouter au Stockage — le gramophone n'attend que lui." },
    ],
  },
```

Dans chaque overlay (`contenu/en/dialogues.ts`, `es`, `el`), copier la forme de l'entrée `anniv_cadeau` existante et ajouter `anniv_cadeau_recurrent` :
- EN : « Happy birthday, kid! Your mother never forgets the date — this year again, the postman arrived whistling. » / « Another record for your collection! Go add it in Storage — the gramophone is waiting for it. »
- ES : « ¡Feliz cumpleaños, muchacho! Tu madre nunca olvida la fecha — este año el cartero llegó silbando otra vez. » / « ¡Otro disco para tu colección! Ve a añadirlo al Almacén — el gramófono lo está esperando. »
- EL : « Χρόνια πολλά, μικρέ! Η μητέρα σου δεν ξεχνά ποτέ την ημερομηνία — κι εφέτος ο ταχυδρόμος ήρθε σφυρίζοντας. » / « Άλλος ένας δίσκος για τη συλλογή σου! Πήγαινε να τον προσθέσεις στην Αποθήκη — το γραμμόφωνο τον περιμένει. »

(Adapter la terminologie « Stockage/Storage/Almacén/Αποθήκη » aux libellés réellement utilisés dans les dialogues existants du fichier.)

- [ ] **Step 2: Vérifier le test d'overlay des dialogues**

Run: `npx vitest run --maxWorkers=4 src/lib/i18n`
Attendu : PASS (si un test de couverture des séquences existe, il valide la nouvelle entrée ; s'il échoue en signalant `anniv_cadeau_recurrent` manquant dans un overlay, compléter).

- [ ] **Step 3: GameContext — `ouvrirCadeauAnniversaire` paramétré par année**

Remplacer l.1027-1047 (et les imports l.32-36 : retirer `ID_DECLENCHEUR_CADEAU`, ajouter `cadeauEnAttente`, `idDeclencheurCadeau`) :

```ts
/**
 * Ouvre le cadeau d'anniversaire en attente (le plus ancien) : ajoute le
 * vinyle de l'année au stockage, pose le déclencheur de l'année, et lance
 * le mini-tuto des vinyles UNIQUEMENT l'année 1. Null si rien en attente.
 */
const ouvrirCadeauAnniversaire = useCallback((): { objet: Objet; annee: number } | null => {
  const current = stateRef.current;
  if (!current) return null;
  const annee = cadeauEnAttente(current);
  if (annee === null) return null;
  const objet = objetCadeauAnniversaire(annee, current);
  setState((prev) => {
    if (!prev || cadeauEnAttente(prev) !== annee) return prev;
    return {
      ...prev,
      inventaireJoueur: [...prev.inventaireJoueur, objet],
      declencheursDeclenches: [
        ...prev.declencheursDeclenches,
        idDeclencheurCadeau(annee),
      ],
      ...(annee === 1 ? { miniTutoVinyle: "ajouter" as const } : {}),
    };
  });
  return { objet, annee };
}, []);
```

Mettre à jour l'interface (l.188-189) : `ouvrirCadeauAnniversaire: () => { objet: Objet; annee: number } | null;` (le commentaire aussi).

- [ ] **Step 4: Layout QG — cérémonie et dialogue selon l'année**

Dans `src/app/(qg)/layout.tsx` :
- l.179-180 : `const [objetCadeau, setObjetCadeau] = useState<{ objet: Objet; annee: number } | null>(null);`
- l.582-590 (QgCadeau) : `const res = ouvrirCadeauAnniversaire(); if (res) setObjetCadeau(res);`
- l.862-871 (ColisOverlay) : passer `objet={objetCadeau?.objet ?? null}` et

```tsx
onRecuperer={() => {
  const annee = objetCadeau?.annee ?? 1;
  setObjetCadeau(null);
  setDialogueQg(
    annee === 1
      ? SEQUENCES_ANNIVERSAIRE.anniv_cadeau
      : SEQUENCES_ANNIVERSAIRE.anniv_cadeau_recurrent,
  );
}}
```

- [ ] **Step 5: Vérifier compilation + suite**

Run: `npx tsc --noEmit && npx vitest run --maxWorkers=4 src/context src/lib/anniversaire.test.ts`
Attendu : PASS, aucune erreur TS (le changement de type de `ouvrirCadeauAnniversaire` doit être répercuté partout où TS le signale).

- [ ] **Step 6: Commit**

```bash
git add src/context/GameContext.tsx "src/app/(qg)/layout.tsx" src/data/dialogues.ts src/lib/i18n/contenu
git commit -m "feat(anniversaire): récupération du cadeau par année + dialogue récurrent 4 langues"
```

---

### Task 4: Exclusion des vinyles cadeau de tous les tirages

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (appel `genererSession` l.185-190 + appel `genererRemplacement` — le localiser dans le fichier)
- Modify: `src/lib/boiteMystere.ts` (l.83 : filtrage du pool)
- Test: `src/lib/chine.test.ts`, `src/lib/boiteMystere.test.ts` (s'il existe, sinon le créer pour ce cas)

**Interfaces:**
- Consomme : `vinylesCadeauxExclus(state)` (Task 2) ; `uniquesExclusDuChinage(state)` (chine.ts:319).
- Produit : `boiteMystere` accepte un paramètre optionnel `exclus?: ReadonlySet<string>` sur la fonction qui construit le pool (l.83, `poolPourTier(brocante.tier)`).

- [ ] **Step 1: Tests qui échouent**

Dans `src/lib/chine.test.ts` (le paramètre `exclus` de `genererSession` fonctionne déjà — le test documente l'usage vinyles) :

```ts
import { vinylesCadeauxExclus, VINYLES_CADEAU_PAR_ANNEE } from "@/lib/anniversaire";

it("les vinyles cadeau exclus ne sortent jamais en session", () => {
  const exclus = vinylesCadeauxExclus({ declencheursDeclenches: [] });
  for (let i = 0; i < 50; i++) {
    const session = genererSession(12, [], undefined, undefined, exclus);
    for (const it of session) {
      expect(VINYLES_CADEAU_PAR_ANNEE).not.toContain(it.objet.templateId);
    }
  }
});
```

Dans le test de la boîte mystère : ouvrir la boîte un grand nombre de fois avec `exclus = new Set(VINYLES_CADEAU_PAR_ANNEE)` et vérifier qu'aucun tirage ne retourne un template exclu (calquer le fixture sur les tests existants du fichier ; échec attendu tant que le paramètre n'existe pas).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/chine.test.ts src/lib/boiteMystere.test.ts`
Attendu : le test chine passe déjà (paramètre existant — c'est un test de non-régression), le test boîte mystère FAIL (paramètre inexistant).

- [ ] **Step 3: Implémenter**

`src/lib/boiteMystere.ts` : ajouter `exclus?: ReadonlySet<string>` à la signature de la fonction qui appelle `poolPourTier` (l.83) et filtrer :

```ts
const pool = poolPourTier(brocante.tier).filter((t) => !exclus?.has(t.templateId));
```

Propager le paramètre depuis le(s) point(s) d'appel UI (les trouver : `grep -rn "boiteMystere\|ouvrirBoite" src/app src/components --include="*.tsx"`) en passant :

```ts
new Set([...uniquesExclusDuChinage(state), ...vinylesCadeauxExclus(state)])
```

`src/app/chiner/[brocanteId]/ClientPage.tsx` : aux deux points d'appel (session l.185-190 et La Fouille/`genererRemplacement`), remplacer `uniquesExclusDuChinage(state)` par la même union (la construire une fois par usage, pas en module).

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/chine.test.ts src/lib/boiteMystere.test.ts && npx tsc --noEmit`
Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/boiteMystere.ts src/lib/chine.test.ts "src/app/chiner/[brocanteId]/ClientPage.tsx" src/lib/boiteMystere.test.ts
git commit -m "feat(anniversaire): les vinyles cadeau non offerts sont exclus de tous les tirages"
```

---

### Task 5: Brocante `grande-braderie` — données, condition « braderie », garde-fous

**Files:**
- Modify: `src/types/game.ts` (l.532-544 : variant `{ type: "braderie" }`)
- Modify: `src/data/brocantes.ts` (entrée après le boss + `fraisEntree`)
- Modify: `src/lib/deblocage.ts` (3 switchs : `evaluerCondition` l.273-320, `descriptionCondition` l.18-54, `descriptionConditionCourte` l.97-164)
- Modify: `src/lib/quetes/atteignables.ts` (exclure la braderie)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clé condition)
- Modify: `src/lib/i18n/contenu/{en,es,el}/brocantes.ts` (nom + description)
- Test: `src/lib/deblocage.test.ts`, `src/lib/celebrite.test.ts`, `src/lib/quetes/atteignables.test.ts` (ou créer le cas), `src/lib/i18n/contenu/brocantes.test.ts` (existant, bloquant)

**Interfaces:**
- Consomme : `estJourBraderie`, `ID_GRANDE_BRADERIE` (Task 1).
- Produit : `getBrocanteById("grande-braderie")` définie ; `ConditionDeblocage` accepte `{ type: "braderie" }` ; `fraisEntree(grandeBraderie) === 10`.

- [ ] **Step 1: Tests qui échouent**

`src/lib/deblocage.test.ts` :

```ts
import { samediBraderie } from "@/lib/evenements";
import { getBrocanteById } from "@/data/brocantes";

it("condition braderie : vraie les 2 jours, fausse sinon", () => {
  const samedi = samediBraderie(1924);
  const c = { type: "braderie" } as const;
  // adapter au helper d'état des tests existants du fichier
  expect(evaluerCondition(c, etatAvec({ jourActuel: samedi }))).toBe(true);
  expect(evaluerCondition(c, etatAvec({ jourActuel: samedi + 1 }))).toBe(true);
  expect(evaluerCondition(c, etatAvec({ jourActuel: samedi - 1 }))).toBe(false);
  expect(evaluerCondition(c, etatAvec({ jourActuel: samedi + 2 }))).toBe(false);
});

it("la grande braderie existe, tier 4, entrée à 10", () => {
  const b = getBrocanteById("grande-braderie")!;
  expect(b.tier).toBe(4);
  expect(fraisEntree(b)).toBe(10);
});
```

`src/lib/celebrite.test.ts` — compléter le test « jamais tier 4 » (l.26) d'une assertion explicite :

```ts
expect(tirerCelebrite().brocanteId).not.toBe("grande-braderie");
```

Test atteignables : un état avec `jourActuel` = samedi de braderie ne doit PAS voir le pool tier 4 complet apparaître dans `objetsAtteignables` (la braderie est ignorée même débloquée — sinon les quêtes générées pendant le week-end cibleraient des objets introuvables le reste de l'année).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/deblocage.test.ts src/lib/celebrite.test.ts src/lib/quetes`
Attendu : FAIL (variant inconnu, brocante absente).

- [ ] **Step 3: Implémenter**

`src/types/game.ts` — ajouter le variant (avec commentaire) :

```ts
  /** Ouvert uniquement les jours de Grande Braderie (cf. lib/evenements). */
  | { type: "braderie" }
```

`src/data/brocantes.ts` — après l'entrée boss (l.~380) :

```ts
  // ============================================================
  // ÉVÉNEMENT — La Grande Braderie (premier week-end de septembre du jeu)
  // Entrée PERMANENTE (les routes statiques sont pré-rendues depuis ce
  // tableau) ; visible et débloquée uniquement via la condition "braderie".
  // ============================================================
  {
    id: "grande-braderie",
    nom: "La Grande Braderie",
    description:
      "Deux jours de folie : des kilomètres d'étals, des prix sacrifiés et la foule des grands jours. Le rendez-vous de l'année pour tous les chineurs.",
    ambiance: "Dense",
    tier: 4,
    etoiles: 4,
    taillePool: 18,
    poolExclusif: [],
    facteurBourse: 1.5,
    conditionDeblocage: { type: "braderie" },
  },
```

`fraisEntree` (l.13-16) — l'esprit braderie, entrée modeste malgré le tier 4 :

```ts
export function fraisEntree(brocante: Brocante): number {
  if (brocante.id === "vide-grenier-quartier") return 0;
  if (brocante.id === "grande-braderie") return 10;
  return FRAIS_ENTREE[brocante.tier];
}
```

`src/lib/deblocage.ts` — dans `evaluerCondition` : `case "braderie": return estJourBraderie(state.jourActuel);` ; dans les deux fonctions de description, retourner la nouvelle clé `d.chine.conditionBraderie` (suivre la mécanique des cas voisins).

Clés UI (bloc `chine`) :
- FR : `conditionBraderie: "Ouvert uniquement le premier week-end de septembre"`
- EN : `"Open only on the first weekend of September"`
- ES : `"Abierto solo el primer fin de semana de septiembre"`
- EL : `"Ανοιχτά μόνο το πρώτο σαββατοκύριακο του Σεπτεμβρίου"`

`src/lib/quetes/atteignables.ts` (l.21-27) :

```ts
  for (const b of BROCANTES) {
    // La braderie (2 jours/an) ne doit pas rendre son pool « atteignable »
    // pour la génération de quêtes : les cibles deviendraient introuvables.
    if (b.id === ID_GRANDE_BRADERIE) continue;
    if (!idsDebloquees.has(b.id)) continue;
    ...
```

Overlays brocantes (`contenu/{en,es,el}/brocantes.ts`) :
- EN : `nom: "The Grand Braderie"`, `description: "Two days of madness: miles of stalls, slashed prices and the biggest crowds of the year. The rendezvous no bargain-hunter misses."`
- ES : `nom: "La Gran Braderie"`, `description: "Dos días de locura: kilómetros de puestos, precios regalados y la multitud de los grandes días. La cita del año para todo chamarilero."`
- EL : `nom: "Η Μεγάλη Μπραντερί"`, `description: "Δύο μέρες τρέλας: χιλιόμετρα πάγκων, τιμές-σοκ και το μεγαλύτερο πλήθος της χρονιάς. Το ραντεβού που κανείς παλιατζής δεν χάνει."`

Vérifier `src/lib/simulation/niveauSim.ts` : `grep -n "brocantesParTier\|tier === 4\|BROCANTES" src/lib/simulation/niveauSim.ts` — si la sim sélectionne une brocante tier 4 générique, épingler le boss par id pour que la braderie ne fausse pas la simulation.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 && npx tsc --noEmit`
Attendu : PASS complet (les 3 switchs exhaustifs de deblocage compilent, le test bloquant `contenu/brocantes.test.ts` passe avec les 3 overlays).

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/data/brocantes.ts src/lib/deblocage.ts src/lib/deblocage.test.ts src/lib/quetes/atteignables.ts src/lib/celebrite.test.ts src/lib/i18n src/lib/simulation
git commit -m "feat(braderie): brocante événementielle grande-braderie + condition de déblocage dédiée"
```

---

### Task 6: Effets braderie côté chine — prix cassés + raretés dopées

**Files:**
- Modify: `src/lib/chine.ts` (`instancier` l.69-117, `genererSession` l.192-261, `genererRemplacement` l.269-301)
- Test: `src/lib/chine.test.ts`

**Interfaces:**
- Consomme : `estGrandeBraderie` (Task 1), la brocante braderie (Task 5).
- Produit : `RABAIS_BRADERIE = 0.7` (exporté) ; le flag interne `boostRares` de `tirerTemplatePondere` devient `celebritePresente || braderie`.

- [ ] **Step 1: Tests qui échouent** (échantillonnage statistique, comme les tests de mix de rareté existants du fichier)

```ts
import { getBrocanteById } from "@/data/brocantes";

const BOSS = getBrocanteById("salon-antiquaires-drouot")!;
const BRADERIE = getBrocanteById("grande-braderie")!;

function prixMoyenRelatif(brocante: Brocante): number {
  let somme = 0;
  let n = 0;
  for (let i = 0; i < 300; i++) {
    for (const it of genererSession(10, [], brocante)) {
      somme += it.prixVendeur / it.objet.prixReferenceReel;
      n += 1;
    }
  }
  return somme / n;
}

it("braderie : prix vendeurs nettement plus bas qu'au boss (rabais 0.7)", () => {
  const ratio = prixMoyenRelatif(BRADERIE) / prixMoyenRelatif(BOSS);
  expect(ratio).toBeGreaterThan(0.6);
  expect(ratio).toBeLessThan(0.8);
});

it("braderie : proportion de non-communs supérieure au boss (boost raretés)", () => {
  const partRares = (brocante: Brocante) => {
    let rares = 0;
    let n = 0;
    for (let i = 0; i < 300; i++) {
      for (const it of genererSession(10, [], brocante)) {
        if (it.objet.rarete !== "commun") rares += 1;
        n += 1;
      }
    }
    return rares / n;
  };
  expect(partRares(BRADERIE)).toBeGreaterThan(partRares(BOSS) * 1.3);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/chine.test.ts`
Attendu : FAIL sur les deux nouveaux tests.

- [ ] **Step 3: Implémenter** dans `src/lib/chine.ts`

```ts
import { estGrandeBraderie } from "@/lib/evenements";

/** Braderie : rabais appliqué au prix affiché par tous les vendeurs. */
export const RABAIS_BRADERIE = 0.7;
```

Dans `instancier` (l.92-95), intégrer le rabais au produit du `prixVendeur` :

```ts
  const rabais = brocante && estGrandeBraderie(brocante) ? RABAIS_BRADERIE : 1;
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend * modSpec * surcote * rabais),
  );
```

(`prixMinAccept` dérive de `prixVendeur` via le persona → suit le rabais automatiquement.)

Dans `genererSession` : `const braderie = !!brocante && estGrandeBraderie(brocante);` puis passer `celebritePresente || braderie` à `tirerTemplatePondere` (l.253). Même chose dans `genererRemplacement` (l.294). Ne PAS appliquer `CELEBRITE_BOOST_TAILLE` à la braderie (l'étal géant vient de `taillePool: 18`).

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/chine.test.ts`
Attendu : PASS (si le test statistique est instable sur 300 itérations, monter à 500 — ne pas élargir les bornes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chine.ts src/lib/chine.test.ts
git commit -m "feat(braderie): prix cassés (rabais 0.7) et raretés dopées sur l'étal géant"
```

---

### Task 7: Effets braderie côté vente — affluence

**Files:**
- Modify: `src/lib/vitrine.ts` (constante à côté de `prochainIntervalleClient`, l.489-498)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (composition du multiplicateur l.169-182)
- Test: `src/lib/vitrine.test.ts`

**Interfaces:**
- Consomme : `estGrandeBraderie` (Task 1) ; `facteurBourse: 1.5` (déjà en données, Task 5 — les bourses passent par `bourseDe(persona, facteurBourse)`, vitrine.ts:122).
- Produit : `BRADERIE_INTERVALLE_MULT = 0.7` (exporté de vitrine.ts).

- [ ] **Step 1: Tests qui échouent** (`src/lib/vitrine.test.ts`)

```ts
it("BRADERIE_INTERVALLE_MULT accélère les arrivées de clients", () => {
  expect(BRADERIE_INTERVALLE_MULT).toBeLessThan(1);
  for (let i = 0; i < 50; i++) {
    const it = prochainIntervalleClient(BRADERIE_INTERVALLE_MULT);
    expect(it).toBeLessThanOrEqual(CLIENT_INTERVALLE_MAX_SEC * BRADERIE_INTERVALLE_MULT);
    expect(it).toBeGreaterThanOrEqual(CLIENT_INTERVALLE_MIN_SEC * BRADERIE_INTERVALLE_MULT);
  }
});

it("bourse moyenne braderie gonflée par le facteurBourse 1.5", () => {
  const braderie = getBrocanteById("grande-braderie")!;
  const boss = getBrocanteById("salon-antiquaires-drouot")!;
  expect(bourseMoyenne(braderie)).toBeGreaterThan(bourseMoyenne({ ...boss, facteurBourse: 1 }));
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/vitrine.test.ts`
Attendu : FAIL (constante absente).

- [ ] **Step 3: Implémenter**

`src/lib/vitrine.ts`, à côté des constantes d'intervalle (l.489-493) :

```ts
/** Braderie : la foule des grands jours — clients plus rapprochés. */
export const BRADERIE_INTERVALLE_MULT = 0.7;
```

`journee/ClientPage.tsx` l.169-182, étendre le produit :

```tsx
      intervalleMultiplier:
        (aGenPresentationSoignee(state) ? 0.75 : 1) *
        METEO_INTERVALLE_MULT[meteoDuJour(state)] *
        (brocante && estGrandeBraderie(brocante) ? BRADERIE_INTERVALLE_MULT : 1),
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/vitrine.test.ts && npx tsc --noEmit`
Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vitrine.ts src/lib/vitrine.test.ts "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"
git commit -m "feat(braderie): affluence à la vente — clients rapprochés et bourses gonflées"
```

---

### Task 8: Visibilité dans les listes + cadre panorama + badge Événement

**Files:**
- Modify: `src/app/chiner/page.tsx` (l.33-35), `src/app/vitrine/page.tsx` (filtre équivalent)
- Modify: `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts` (`TIER_1_FRAMES`)
- Modify: `src/components/mobile/brocante-pano/BrocanteFrame.tsx` (badge)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clé badge)
- Test: `src/components/mobile/brocante-pano/BrocantePanorama.test.tsx` (compléter)

**Interfaces:**
- Consomme : `estGrandeBraderie`, `estJourBraderie` (Task 1).
- Produit : la braderie n'apparaît dans les listes chine/vente QUE les jours de braderie ; badge « Événement » sur son cadre.

- [ ] **Step 1: Test qui échoue** (dans `BrocantePanorama.test.tsx`, suivre les fixtures existantes du fichier)

Plutôt que tester les pages, extraire le filtre en fonction pure dans `src/lib/evenements.ts` :

```ts
/** Filtre d'affichage des listes : la braderie n'apparaît que ses jours. */
export function brocantesVisiblesAuJour<T extends Pick<Brocante, "id">>(
  brocantes: readonly T[],
  jour: number,
): T[] {
  return brocantes.filter((b) => !estGrandeBraderie(b) || estJourBraderie(jour));
}
```

et le test dans `src/lib/evenements.test.ts` :

```ts
it("brocantesVisiblesAuJour masque la braderie hors braderie", () => {
  const liste = [{ id: "vide-grenier-quartier" }, { id: ID_GRANDE_BRADERIE }];
  expect(brocantesVisiblesAuJour(liste, 92).map((b) => b.id)).toEqual(["vide-grenier-quartier"]);
  expect(brocantesVisiblesAuJour(liste, 93).map((b) => b.id)).toEqual([
    "vide-grenier-quartier",
    ID_GRANDE_BRADERIE,
  ]);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/evenements.test.ts`
Attendu : FAIL (export manquant).

- [ ] **Step 3: Implémenter**

`src/lib/evenements.ts` : ajouter `brocantesVisiblesAuJour` (version simplifiée ci-dessus).

`src/app/chiner/page.tsx` l.33-35 :

```tsx
  const brocantesVisibles = tutoActif
    ? BROCANTES.filter((b) => b.id === "vide-grenier-quartier")
    : brocantesVisiblesAuJour(BROCANTES, state.jourActuel);
```

`src/app/vitrine/page.tsx` : appliquer le même `brocantesVisiblesAuJour` au tableau passé à `BrocantePanorama`.

`brocantePanoramaLayout.ts` — ajouter à `TIER_1_FRAMES` (position initiale, ajustée visuellement en Task 10) :

```ts
  { id: "grande-braderie", left: "37.00%", top: "3.00%", width: "30.00%", height: "16.00%" },
```

(un cadre dont la brocante est filtrée est simplement ignoré — BrocanteScene.tsx:102 — donc aucune garde supplémentaire ; le cadre vit sur la scène tier 1 pour être vu de tous, la mécanique tier 4 reste portée par la brocante.)

`BrocanteFrame.tsx` — badge au-dessus de l'image (zIndex 3, au même niveau que `lockOverlayStyle` l.74-94) :

```tsx
{estGrandeBraderie(brocante) && (
  <span style={badgeEvenementStyle} aria-hidden>
    {d.chine.badgeEvenement}
  </span>
)}
```

```ts
const badgeEvenementStyle: CSSProperties = {
  position: "absolute",
  top: "-0.5em",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 3,
  padding: "0.15em 0.6em",
  background: "var(--brass-500)",
  color: "var(--ink-900)",
  fontSize: "0.62rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "2px",
  whiteSpace: "nowrap",
};
```

(récupérer `d` comme les autres composants du dossier — même hook que celui qui fournit `locale` pour `nomBrocante`.)

Clés UI (bloc `chine`) : FR `badgeEvenement: "Événement"`, EN `"Event"`, ES `"Evento"`, EL `"Εκδήλωση"`.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/evenements.test.ts src/components && npx tsc --noEmit`
Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/evenements.ts src/lib/evenements.test.ts src/app/chiner/page.tsx src/app/vitrine/page.tsx src/components/mobile/brocante-pano src/lib/i18n
git commit -m "feat(braderie): visibilité les jours J dans les listes + cadre panorama + badge Événement"
```

---

### Task 9: Calendrier + encart gazette

**Files:**
- Modify: `src/components/mobile/qg/sheets/CalendrierSheet.tsx` (type `Cell` l.286-295, boucle l.298-324, style à côté de `circleCelebrite` l.212)
- Modify: `src/components/mobile/GazetteSheet.tsx` (nouvel encart avant « Carnet mondain » l.386)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (clés gazette)
- Test: pas de test de rendu dédié (les sheets n'en ont pas) — la logique de fenêtre est déjà testée en Task 1 ; vérification visuelle en Task 10

**Interfaces:**
- Consomme : `estJourBraderie`, `prochaineBraderie` (Task 1). `GazetteSheet` reçoit déjà `jourActuel` (props l.40).

- [ ] **Step 1: Marquage du calendrier**

Dans `CalendrierSheet.tsx` :
- Type `Cell` : ajouter `braderie?: boolean;` à la variante non-vide (l.294).
- Dans la boucle (après le calcul `celebrite`, l.321-322) : `const braderie = estJourBraderie(jourCell);` et le passer au push (l.324).
- Style, à côté de `circleCelebrite` (l.212) — un carré pointillé laiton, distinct du cercle rouge célébrité :

```ts
const carreBraderie: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "2em",
  height: "2em",
  border: "1.5px dashed var(--brass-500)",
  borderRadius: "3px",
  zIndex: 0,
};
```

- Rendu : là où `cell.celebrite` affiche son cercle, ajouter `{cell.braderie && <span style={carreBraderie} aria-hidden />}`.

- [ ] **Step 2: Encart gazette**

Dans `GazetteSheet.tsx`, juste avant la section « Carnet mondain » (l.386), en réutilisant `sectionTitle` et `SeparateurArtDeco` :

```tsx
{prochaineBraderie(jourActuel) - jourActuel <= 7 && (
  <>
    <h3 style={sectionTitle}>{d.gazette.braderieTitre}</h3>
    <p style={{ margin: 0, padding: "0.5% 2% 1%", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "3cqw", lineHeight: 1.35, color: "var(--ink-700)" }}>
      {estJourBraderie(jourActuel) ? d.gazette.braderieEnCours : d.gazette.braderieAnnonce}
    </p>
    <SeparateurArtDeco />
  </>
)}
```

(L'encart est **calculé à l'affichage** depuis `jourActuel` — rien n'est stocké dans l'édition, cf. spec. Il est visible de tous, sans compétence : c'est une nouvelle publique.)

Clés UI (bloc `gazette`) :
- FR : `braderieTitre: "La Grande Braderie"`, `braderieAnnonce: "Le premier week-end de septembre approche : la Grande Braderie dresse ses étals ! Deux jours de prix sacrifiés — attendez-vous à la foule des grands jours."`, `braderieEnCours: "La Grande Braderie bat son plein ! Étals à perte de vue, prix sacrifiés et foule record — c'est ce week-end ou jamais."`
- EN : `"The Grand Braderie"`, `"The first weekend of September is coming: the Grand Braderie is setting up its stalls! Two days of slashed prices — expect the biggest crowds of the year."`, `"The Grand Braderie is in full swing! Stalls as far as the eye can see, slashed prices and record crowds — it's this weekend or never."`
- ES : `"La Gran Braderie"`, `"Se acerca el primer fin de semana de septiembre: ¡la Gran Braderie monta sus puestos! Dos días de precios regalados — esperen la multitud de los grandes días."`, `"¡La Gran Braderie está en pleno apogeo! Puestos hasta donde alcanza la vista, precios regalados y multitud récord — es este fin de semana o nunca."`
- EL : `"Η Μεγάλη Μπραντερί"`, `"Πλησιάζει το πρώτο σαββατοκύριακο του Σεπτεμβρίου: η Μεγάλη Μπραντερί στήνει τους πάγκους της! Δύο μέρες με τιμές-σοκ — περιμένετε το μεγαλύτερο πλήθος της χρονιάς."`, `"Η Μεγάλη Μπραντερί είναι στο αποκορύφωμά της! Πάγκοι ως εκεί που φτάνει το μάτι, τιμές-σοκ και πλήθος-ρεκόρ — φέτος είναι αυτό το σαββατοκύριακο ή ποτέ."`

- [ ] **Step 3: Vérifier compilation + suite i18n**

Run: `npx tsc --noEmit && npx vitest run --maxWorkers=4 src/lib/i18n`
Attendu : PASS (les 4 dictionnaires portent les 3 nouvelles clés).

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/qg/sheets/CalendrierSheet.tsx src/components/mobile/GazetteSheet.tsx src/lib/i18n
git commit -m "feat(braderie): marquage du calendrier et encart gazette (annonce + en cours)"
```

---

### Task 10: Visuel de la braderie + vérification visuelle

**Files:**
- Modify: `scripts/brocante-prompts.json` (nouvelle entrée)
- Modify: `src/lib/brocanteImages.ts` (`BROCANTES_WITH_IMAGE`)
- Create: `public/brocantes/grande-braderie.webp` (généré)
- Modify (si besoin) : `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts` (ajustement du cadre)

- [ ] **Step 1: Prompt et génération**

Ajouter à `scripts/brocante-prompts.json` (copier le style des 17 entrées existantes — les lire d'abord) :

```json
{
  "id": "grande-braderie",
  "description": "a giant festive street flea-market, endless rows of stalls with bunting and banners stretching down a grand avenue, bargain price signs, dense joyful crowd, late-summer golden light"
}
```

Run: `npm run gen:brocantes -- grande-braderie` puis `npm run gen:webp`
Attendu : `public/brocantes/grande-braderie.png` puis `.webp` (~100-250 Ko, carré). Si la clé Gemini n'est pas disponible dans l'environnement, marquer l'étape bloquée et demander à Guillaume — ne pas committer d'image de substitution.

- [ ] **Step 2: Câbler l'image**

Ajouter `"grande-braderie"` au Set `BROCANTES_WITH_IMAGE` (`src/lib/brocanteImages.ts` l.8-14).

- [ ] **Step 3: Vérification visuelle du cadre et des écrans**

Servir l'app (`next dev`, **`http://localhost:3000` impérativement** — 127.0.0.1 fige l'app sur « Ouverture du local… » ; un seul `next dev` à la fois ; si un style semble fantôme : stop + `rm -rf .next`). Avec une save de dev, forcer `jourActuel` au jour 93 (outils dev du panorama disponibles — `BrocanteFramesEditProvider` — pour ajuster le cadre). Vérifier en mesurant les rects (pas à l'œil) :
- la braderie apparaît scène 1 avec badge et sans chevauchement de cadre ;
- absente au jour 92 ;
- calendrier : carrés pointillés sur les 6 et 7 septembre ;
- gazette : encart annonce ≤ 7 jours avant, « en cours » les jours J.
Reporter les coordonnées finales du cadre dans `brocantePanoramaLayout.ts`.

- [ ] **Step 4: Commit**

```bash
git add scripts/brocante-prompts.json src/lib/brocanteImages.ts public/brocantes/grande-braderie.png public/brocantes/grande-braderie.webp src/components/mobile/brocante-pano/brocantePanoramaLayout.ts
git commit -m "feat(braderie): illustration Gemini et câblage image + position du cadre"
```

---

### Task 11: Filet final

- [ ] **Step 1: Suite complète + lint**

Run: `npx vitest run --maxWorkers=4 && npx tsc --noEmit && npx eslint src`
Attendu : 0 échec (≈1810+ tests), 0 erreur lint. Corriger ce qui sort, re-exécuter jusqu'au vert.

- [ ] **Step 2: Auto-revue du diff**

`git diff main --stat` puis relire le diff complet : pas de `console.log`, pas de chaîne FR en dur dans les composants touchés (tout passe par `d.*` ou les overlays), pas de modification de `SAVE_VERSION` ni de `migrations.ts`.

- [ ] **Step 3: Commit final éventuel + push**

```bash
git push -u origin feat/evenements-calendaires
```

(PR à ouvrir à la main par Guillaume — pas de `gh` sur cette machine.)

## Recette device (hors plan, pour mémoire)

À vérifier par Guillaume sur simulateur/device après merge : cadence des jours jusqu'au jour 93, ouverture des cadeaux années 1→4 (dont save existante déjà au-delà du jour 6 : rattrapage année 1 seule d'abord), braderie complète (chine + vente + gazette + calendrier), et équilibrage réel des valeurs du tableau initial.
