# Jetons Bazar et boutique — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux quêtes périodiques une seconde monnaie — le jeton — et une boutique où la dépenser, le Bazar, ouverte le 10 juillet en temps de jeu.

**Architecture:** Le jeton est un entier sur `GameState`, versé à la livraison d'une quête par le point de passage unique existant (`appliquerRecompense`), avec le montant figé à la naissance de la quête comme le sont déjà les cibles chiffrées. Le Bazar est une route à part entière atteinte par un troisième bouton de la porte ; son étal est persisté dans la save et régénéré par un `settle` hebdomadaire calqué sur `settleQuetesPeriodiques`.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), TypeScript strict, React 19, Vitest + Testing Library, Tauri v2 (iOS/Android).

**Spec:** `docs/superpowers/specs/2026-08-19-jetons-bazar-design.md`

## Global Constraints

- **Tests :** `npx vitest run --maxWorkers=4 <fichier>`. **Le drapeau `--maxWorkers=4` est obligatoire** sur cette machine : sans lui, ~41 tests échouent par famine de workers, et le diagnostic est trompeur.
- **Lint :** `npx eslint src` (et non `npm run lint`, cassé depuis Next 16). `npx tsc --noEmit` doit rester vert.
- **1 jeton = 25 €**, fixe, partout. Aucune table, aucune variation par palier.
- **Quotidienne = 1 jeton, hebdomadaire = 3 jetons.** Montant figé à la naissance de la quête.
- **Prix en jetons = `Math.ceil(prixRefBase / 25)`, minimum 1.**
- **Ouverture du Bazar : jour de jeu 35** (jeudi 10 juillet 1924 ; Jour 1 = vendredi 6 juin 1924).
- **Rotation hebdomadaire**, ancrée sur `cleSemaineLocale` (semaine ISO, temps réel local, lundi).
- **i18n : quatre langues obligatoires** — `fr`, `en`, `es`, `el`. `src/lib/i18n/ui/ui.test.ts` vérifie la parité des placeholders `{x}` ; TypeScript vérifie la présence des clés. **Jamais de chaîne localisée dans une save.**
- **`SAVE_VERSION` passe de 19 à 20.** Tout champ neuf est additif et tolère l'absence sur les vieilles saves.
- **Aucune écriture au grand livre pour un achat au Bazar** : les colonnes `recette`/`depense`/`soldeApres` restent en euros purs.
- **Commits fréquents**, un par tâche minimum, message en français à l'impératif implicite (voir l'historique du dépôt).

---

## Structure des fichiers

**Créés :**

| Fichier | Responsabilité |
|---|---|
| `src/lib/bazar/ouverture.ts` | La constante d'ouverture et le prédicat d'accès. Rien d'autre. |
| `src/lib/bazar/etal.ts` | Composer un étal pour une clé de semaine (pur, déterministe à `rng` donné). |
| `src/lib/bazar/settleBazar.ts` | Régénérer l'étal quand la semaine change. Calqué sur `settlePeriodiques.ts`. |
| `src/lib/bazar/achat.ts` | Appliquer un achat à un `GameState` (pur). Porte le garde-fou du prix d'achat. |
| `src/app/bazar/page.tsx` | L'écran de la boutique. |
| `src/components/bazar/EtalBazar.tsx` | Le rendu de l'étal (présentation seule). |

Le découpage sépare **composer** (`etal.ts`), **faire tourner** (`settleBazar.ts`) et **acheter** (`achat.ts`). Ce sont trois responsabilités qui changent pour des raisons différentes : la première quand on retouche le catalogue, la deuxième jamais, la troisième quand on ajoute un type d'article (les paquets de cartes, plus tard). Les garder ensemble ferait un fichier qui grossit à chaque chantier suivant.

**Modifiés :**

| Fichier | Ce qui change |
|---|---|
| `src/types/game.ts` | `GameState.jetons`, `GameState.bazar`, `recompense.jetons`, `LedgerParams.jetons`, type `EtalBazar` |
| `src/lib/migrations.ts` | `SAVE_VERSION` 19 → 20, défaut `jetons: 0` |
| `src/lib/recompenses.ts` | `RecompenseEffective.jetons`, versement, constantes |
| `src/lib/quetes/periodiques.ts` | Écrire `jetons` dans le payload à la naissance (2 sites) |
| `src/lib/i18n/libelles.ts` | Suffixe jetons sur la ligne de grand livre |
| `src/components/mobile/qg/RecompenseJetons.tsx` | 4ᵉ pastille |
| `src/components/mobile/qg/carnet/PaveRecompense.tsx` | 4ᵉ pastille |
| `src/components/mobile/MobileHeader.tsx` | Compteur de jetons |
| `src/components/mobile/qg/sheets/PorteSheet.tsx` | 3ᵉ bouton |
| `src/app/(qg)/layout.tsx` | Navigation vers `/bazar` |
| `src/context/GameContext.tsx` | `jetons: 0` à la création, `settleBazar` au tick, action d'achat |
| `src/lib/__test-fixtures__/gameState.ts` | `jetons: 0` dans la base |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Libellés |

---

### Task 1 : La monnaie existe et survit au rechargement

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/lib/migrations.ts:108` (SAVE_VERSION)
- Modify: `src/lib/__test-fixtures__/gameState.ts:30-60`
- Modify: `src/context/GameContext.tsx:713` (création de partie)
- Test: `src/lib/migrations.test.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `GameState.jetons: number` — lu par toutes les tâches suivantes. `SAVE_VERSION === 20`.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/migrations.test.ts` :

```ts
describe("migration v20 — jetons du Bazar", () => {
  it("pose jetons: 0 sur une save v19 qui ne connaît pas le champ", () => {
    const v19 = { ...createMockGameState(), version: 19 } as unknown as Record<string, unknown>;
    delete v19.jetons;
    const migre = migrerSauvegarde(v19);
    expect(migre.jetons).toBe(0);
    expect(migre.version).toBe(20);
  });

  it("préserve un solde de jetons existant", () => {
    const v20 = { ...createMockGameState({ jetons: 7 }), version: 20 };
    expect(migrerSauvegarde(v20 as unknown as Record<string, unknown>).jetons).toBe(7);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
npx vitest run --maxWorkers=4 src/lib/migrations.test.ts
```

Attendu : ÉCHEC — `jetons` est `undefined`, et TypeScript refuse `createMockGameState({ jetons: 7 })` (propriété inconnue).

- [ ] **Step 3: Ajouter le champ au type**

Dans `src/types/game.ts`, à côté de `budget` dans `GameState` :

```ts
/**
 * Monnaie du Bazar. Gagnée aux quêtes périodiques uniquement, dépensée au
 * Bazar uniquement. 1 jeton = 25 € (ratio fixe, jamais indexé sur le niveau).
 * ADDITIF (v20) : absent des saves < 20, la migration pose 0.
 */
jetons: number;
```

- [ ] **Step 4: Monter SAVE_VERSION et poser le défaut**

Dans `src/lib/migrations.ts` :

```ts
export const SAVE_VERSION = 20;
```

Puis, dans le corps de `migrerSauvegarde`, à côté des autres champs additifs (voir le traitement de `piecesAmelioration` vers la ligne 781 pour la forme) :

```ts
jetons: typeof (loaded as Partial<GameState>).jetons === "number"
  ? (loaded as Partial<GameState>).jetons!
  : 0,
```

- [ ] **Step 5: Compléter la fixture et la création de partie**

Dans `src/lib/__test-fixtures__/gameState.ts`, ajouter à `base` :

```ts
jetons: 0,
```

Dans `src/context/GameContext.tsx`, dans l'objet de création de nouvelle partie (autour de la ligne 713, à côté de `piecesAmelioration: emptyPiecesAmelioration()`) :

```ts
jetons: 0,
```

- [ ] **Step 6: Lancer les tests**

```bash
npx vitest run --maxWorkers=4 src/lib/migrations.test.ts
npx tsc --noEmit
```

Attendu : les deux tests passent, `tsc` est vert.

- [ ] **Step 7: Commit**

```bash
git add src/types/game.ts src/lib/migrations.ts src/lib/migrations.test.ts src/lib/__test-fixtures__/gameState.ts src/context/GameContext.tsx
git commit -m "feat(bazar): la monnaie du Bazar entre dans la save (v20)"
```

---

### Task 2 : Les quêtes versent des jetons

**Files:**
- Modify: `src/types/game.ts` (`CourrierPayloadMission.recompense`, `LedgerParams`)
- Modify: `src/lib/recompenses.ts:16-45` et `:63-101`
- Modify: `src/lib/quetes/periodiques.ts:52` et `:162`
- Test: `src/lib/recompenses.test.ts`, `src/lib/quetes/periodiques.test.ts`

**Interfaces:**
- Consomme : `GameState.jetons` (Task 1).
- Produit :
  - `JETONS_QUOTIDIENNE: 1` et `JETONS_HEBDO: 3`, exportés depuis `src/lib/recompenses.ts`.
  - `RecompenseEffective` gagne `jetons: number`.
  - `recompenseEffective(payload)` renvoie désormais `{ argent, xp, energie, jetons }`.
  - `appliquerRecompense(state, r, ledger, now)` crédite `state.jetons`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/recompenses.test.ts` :

```ts
describe("jetons du Bazar", () => {
  it("recompenseEffective remonte les jetons du payload", () => {
    const payload = {
      type: "mission" as const,
      categorie: "chine" as const,
      expediteurId: "x",
      titre: "t",
      corps: [],
      cibles: [],
      recompense: { argent: 25, jetons: 1 },
    };
    expect(recompenseEffective(payload).jetons).toBe(1);
  });

  it("un payload sans jetons vaut 0 — jamais undefined", () => {
    const payload = {
      type: "mission" as const,
      categorie: "chine" as const,
      expediteurId: "x",
      titre: "t",
      corps: [],
      cibles: [],
      recompense: { argent: 25 },
    };
    expect(recompenseEffective(payload).jetons).toBe(0);
  });

  it("appliquerRecompense crédite le solde de jetons", () => {
    const state = createMockGameState({ jetons: 4 });
    const next = appliquerRecompense(
      state,
      { argent: 0, xp: 0, energie: 0, jetons: 3 },
      { designation: "d", courrierId: "c1" },
      Date.now(),
    );
    expect(next.jetons).toBe(7);
  });

  it("les jetons ne touchent pas les colonnes en euros du grand livre", () => {
    const state = createMockGameState({ jetons: 0, budget: 100 });
    const next = appliquerRecompense(
      state,
      { argent: 0, xp: 0, energie: 0, jetons: 3 },
      { designation: "d", courrierId: "c1" },
      Date.now(),
    );
    const ecriture = next.grandLivre[next.grandLivre.length - 1];
    expect(ecriture.recette).toBe(0);
    expect(ecriture.depense).toBe(0);
    expect(ecriture.params?.jetons).toBe(3);
  });
});
```

Dans `src/lib/quetes/periodiques.test.ts` :

```ts
describe("jetons figés à la naissance", () => {
  it("une quotidienne naît avec 1 jeton", () => {
    const lot = genererLot(createMockGameState({ brocanteur: { ...emptyBrocanteur(), niveau: 5 } }), "quotidienne", "2026-08-19");
    for (const c of lot) {
      const p = c.payload as CourrierPayloadMission;
      expect(p.recompense.jetons).toBe(1);
    }
  });

  it("une hebdomadaire naît avec 3 jetons", () => {
    const lot = genererLot(createMockGameState({ brocanteur: { ...emptyBrocanteur(), niveau: 5 } }), "hebdomadaire", "2026-W34");
    for (const c of lot) {
      const p = c.payload as CourrierPayloadMission;
      expect(p.recompense.jetons).toBe(3);
    }
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts src/lib/quetes/periodiques.test.ts
```

Attendu : ÉCHEC — `jetons` inconnu sur `RecompenseEffective` et sur `recompense`.

- [ ] **Step 3: Étendre les types**

Dans `src/types/game.ts`, `CourrierPayloadMission.recompense` :

```ts
/** Récompense de livraison. `energie` absent → 0. `jetons` absent → 0 :
 *  seules les quêtes périodiques en versent (1 quotidienne, 3 hebdo), et le
 *  montant est figé à la naissance de la quête. */
recompense: { argent: number; xp?: number; energie?: number; jetons?: number };
```

Et dans `LedgerParams`, à côté de `xp` et `energie` :

```ts
/** mission_recompense : jetons du Bazar versés à la livraison, pour le
 *  suffixe du grand livre. N'entre JAMAIS dans recette/depense. ADDITIF. */
jetons?: number;
```

- [ ] **Step 4: Étendre le versement**

Dans `src/lib/recompenses.ts` :

```ts
/** Jetons versés par une quête quotidienne livrée. */
export const JETONS_QUOTIDIENNE = 1;
/** Jetons versés par une quête hebdomadaire livrée. */
export const JETONS_HEBDO = 3;

export interface RecompenseEffective {
  argent: number;
  xp: number;
  energie: number;
  /** Jetons du Bazar. 1 jeton = 25 €, ratio fixe. */
  jetons: number;
}
```

Dans `recompenseEffective`, ajouter au retour :

```ts
jetons: payload.recompense.jetons ?? 0,
```

Dans `appliquerRecompense`, ajouter `jetons: r.jetons` aux `params` de l'écriture, puis créditer le solde après le bloc XP :

```ts
if (r.jetons > 0) {
  next = { ...next, jetons: next.jetons + r.jetons };
}
```

- [ ] **Step 5: Écrire le montant à la naissance de la quête**

Dans `src/lib/quetes/periodiques.ts`, importer les constantes :

```ts
import { JETONS_HEBDO, JETONS_QUOTIDIENNE } from "@/lib/recompenses";
```

Puis, ligne 52 (`genererUne`) :

```ts
const jetons = type === "quotidienne" ? JETONS_QUOTIDIENNE : JETONS_HEBDO;
const recompense = { argent: calculerRecompense(cibles, templates), jetons };
```

Et ligne 162 (`genererUneChiffree`) :

```ts
recompense: {
  argent: contenu.recompenseArgent,
  jetons: type === "quotidienne" ? JETONS_QUOTIDIENNE : JETONS_HEBDO,
},
```

- [ ] **Step 6: Lancer les tests**

```bash
npx vitest run --maxWorkers=4 src/lib/recompenses.test.ts src/lib/quetes/periodiques.test.ts
npx tsc --noEmit
```

Attendu : PASS sur les six tests neufs, `tsc` vert.

- [ ] **Step 7: Lancer la suite complète**

```bash
npx vitest run --maxWorkers=4
```

Attendu : aucune régression. Une quête livrée verse maintenant des jetons — si un test de cérémonie de livraison compte les gains, il peut demander une mise à jour ; corriger l'attendu, pas la production.

- [ ] **Step 8: Commit**

```bash
git add src/types/game.ts src/lib/recompenses.ts src/lib/recompenses.test.ts src/lib/quetes/periodiques.ts src/lib/quetes/periodiques.test.ts
git commit -m "feat(bazar): les quêtes périodiques versent des jetons"
```

---

### Task 3 : Le joueur voit ses jetons

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts`, `el.ts` (section `carnet`, section `chrome`)
- Modify: `src/lib/i18n/libelles.ts:213-216`
- Modify: `src/components/mobile/qg/RecompenseJetons.tsx:31-53`
- Modify: `src/components/mobile/qg/carnet/PaveRecompense.tsx:127`
- Modify: `src/components/mobile/MobileHeader.tsx:265-276`
- Test: `src/components/mobile/qg/RecompenseJetons.test.tsx`, `src/components/mobile/MobileHeader.test.tsx`

**Interfaces:**
- Consomme : `RecompenseEffective.jetons` (Task 2), `GameState.jetons` (Task 1).
- Produit : clés i18n `carnet.jetonBazarUn`, `carnet.jetonBazarN`, `chrome.jetons`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/components/mobile/qg/RecompenseJetons.test.tsx` :

```tsx
it("affiche une pastille de jetons quand la récompense en contient", () => {
  render(
    <RecompenseJetons
      recompense={{ argent: 0, xp: 0, energie: 0, jetons: 3 }}
      variante="ligne"
    />,
  );
  expect(screen.getByText("+3 jetons")).toBeInTheDocument();
});

it("accorde le singulier", () => {
  render(
    <RecompenseJetons
      recompense={{ argent: 0, xp: 0, energie: 0, jetons: 1 }}
      variante="ligne"
    />,
  );
  expect(screen.getByText("+1 jeton")).toBeInTheDocument();
});

it("n'affiche aucune pastille de jetons à zéro", () => {
  render(
    <RecompenseJetons
      recompense={{ argent: 10, xp: 0, energie: 0, jetons: 0 }}
      variante="ligne"
    />,
  );
  expect(screen.queryByText(/jeton/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg/RecompenseJetons.test.tsx
```

Attendu : ÉCHEC — aucun texte « +3 jetons ».

- [ ] **Step 3: Ajouter les libellés dans les quatre langues**

`fr.ts`, section `carnet` :

```ts
jetonBazarUn: "+{n} jeton",
jetonBazarN: "+{n} jetons",
```

`en.ts` : `jetonBazarUn: "+{n} token"`, `jetonBazarN: "+{n} tokens"`
`es.ts` : `jetonBazarUn: "+{n} ficha"`, `jetonBazarN: "+{n} fichas"`
`el.ts` : `jetonBazarUn: "+{n} μάρκα"`, `jetonBazarN: "+{n} μάρκες"`

Puis, section `chrome` des quatre fichiers :

```ts
jetons: "Jetons",     // en: "Tokens" · es: "Fichas" · el: "Μάρκες"
```

- [ ] **Step 4: Ajouter la pastille**

Dans `src/components/mobile/qg/RecompenseJetons.tsx`, étendre la table des teintes — laiton foncé, pour se distinguer du laiton clair de l'XP :

```ts
const JETON_STYLES: Record<"argent" | "xp" | "energie" | "bazar", CSSProperties> = {
  argent: { background: "#6e1f1f", color: "#f4e9cd", border: "1px solid #b03030" },
  xp: { background: "#e3d7b6", color: "#5a4210", border: "1px solid #c8a24a" },
  energie: { background: "#2c5e3f", color: "#f4e9cd", border: "1px solid #4a8a63" },
  bazar: { background: "#8a6a1f", color: "#f4e9cd", border: "1px solid #c8a24a" },
};
```

Puis, dans le corps, après la pastille énergie :

```ts
if (recompense.jetons > 0)
  jetons.push({
    type: "bazar",
    texte: tr(
      recompense.jetons > 1 ? d.carnet.jetonBazarN : d.carnet.jetonBazarUn,
      { n: recompense.jetons },
    ),
  });
```

Élargir le type local de la liste :

```ts
const jetons: Array<{ type: "argent" | "xp" | "energie" | "bazar"; texte: string }> = [];
```

- [ ] **Step 5: Faire la même chose dans le pavé du carnet**

Dans `src/components/mobile/qg/carnet/PaveRecompense.tsx`, à la suite de l'entrée `energie` (ligne 127) :

```ts
{
  cle: "bazar",
  valeur: recompense.jetons,
  texte: tr(
    recompense.jetons > 1 ? d.carnet.jetonBazarN : d.carnet.jetonBazarUn,
    { n: recompense.jetons },
  ),
},
```

- [ ] **Step 6: Ajouter le suffixe au grand livre**

Dans `src/lib/i18n/libelles.ts`, après la ligne `if (p.energie)` :

```ts
if (p.jetons)
  suffixes.push(
    tr(p.jetons > 1 ? d.carnet.jetonBazarN : d.carnet.jetonBazarUn, { n: p.jetons }),
  );
```

- [ ] **Step 7: Ajouter le compteur au bandeau**

Dans `src/components/mobile/MobileHeader.tsx`, étendre les props :

```ts
interface MobileHeaderProps {
  budget: number;
  /** Solde de jetons du Bazar. Le bloc est masqué tant qu'il vaut 0. */
  jetons?: number;
}
```

Puis, dans le rendu, juste avant le bloc `data-fly-target="caisse-header"` :

```tsx
{!!jetons && (
  <div style={{ textAlign: "right", flexShrink: 0, ...labelStyle }}>
    {d.chrome.jetons}
    <strong style={valueStyle}>{jetons.toLocaleString(locale)}</strong>
  </div>
)}
```

Le bloc reste masqué à zéro : avant le jour 35 le joueur n'a rien à en faire, et un compteur à zéro dans un bandeau déjà chargé n'apprend rien.

Répercuter `jetons={state.jetons}` sur les appels de `MobileHeader` (`npx eslint src` et `tsc` les signaleront ; `jetons` étant optionnel, aucun appel ne casse).

- [ ] **Step 8: Lancer les tests**

```bash
npx vitest run --maxWorkers=4 src/components/mobile/qg src/components/mobile/MobileHeader.test.tsx src/lib/i18n
npx tsc --noEmit && npx eslint src
```

Attendu : PASS, y compris le test de parité des placeholders `ui.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/i18n src/components/mobile
git commit -m "feat(bazar): le joueur voit ses jetons — pastille, pavé, bandeau, grand livre"
```

---

### Task 4 : Le Bazar ouvre le 10 juillet, la porte a trois sorties

**Files:**
- Create: `src/lib/bazar/ouverture.ts`
- Create: `src/lib/bazar/ouverture.test.ts`
- Modify: `src/components/mobile/qg/sheets/PorteSheet.tsx`
- Modify: `src/app/(qg)/layout.tsx:763-815`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (section `qg`)

**Interfaces:**
- Consomme : rien.
- Produit : `JOUR_OUVERTURE_BAZAR: 35` et `bazarEstOuvert(state: GameState): boolean`, depuis `src/lib/bazar/ouverture.ts`. `PorteSheet` gagne les props `bazarOuvert: boolean` et `onBazar: () => void`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/lib/bazar/ouverture.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { JOUR_OUVERTURE_BAZAR, bazarEstOuvert } from "@/lib/bazar/ouverture";
import { dateForJour } from "@/lib/calendrier";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

describe("ouverture du Bazar", () => {
  it("le jour d'ouverture est bien le 10 juillet 1924", () => {
    const d = dateForJour(JOUR_OUVERTURE_BAZAR);
    expect(d.getUTCFullYear()).toBe(1924);
    expect(d.getUTCMonth()).toBe(6); // juillet
    expect(d.getUTCDate()).toBe(10);
  });

  it("fermé la veille, ouvert le jour même et après", () => {
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR - 1 }))).toBe(false);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR }))).toBe(true);
    expect(bazarEstOuvert(createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR + 200 }))).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/ouverture.test.ts
```

Attendu : ÉCHEC — le module n'existe pas.

- [ ] **Step 3: Écrire le module**

`src/lib/bazar/ouverture.ts` :

```ts
import type { GameState } from "@/types/game";

/**
 * Jour de jeu du 10 juillet 1924, ouverture du Bazar (Jour 1 = 6 juin 1924,
 * cf. `src/lib/calendrier.ts`). C'est un événement du calendrier, pas une
 * récompense de progression : le Bazar ouvre ses portes, il ne se mérite pas.
 */
export const JOUR_OUVERTURE_BAZAR = 35;

/** Vrai si le joueur a atteint le jour d'ouverture. */
export function bazarEstOuvert(state: GameState): boolean {
  return state.jourActuel >= JOUR_OUVERTURE_BAZAR;
}
```

- [ ] **Step 4: Lancer le test**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/ouverture.test.ts
```

Attendu : PASS sur les deux tests. **Si le premier échoue, ne pas changer 35 sans recalculer** : `dateForJour` est la source de vérité.

- [ ] **Step 5: Ajouter le libellé dans les quatre langues**

Section `qg` : `bazar: "Bazar"` (identique dans les quatre — c'est un nom propre ; en grec, `bazar: "Παζάρι"`).

- [ ] **Step 6: Ajouter le troisième bouton**

Dans `src/components/mobile/qg/sheets/PorteSheet.tsx`, ajouter aux props :

```ts
/** Le Bazar a ouvert (jour 35) : le troisième bouton apparaît. */
bazarOuvert: boolean;
onBazar: () => void;
```

Puis, après le bouton « Étaler », dans le même conteneur :

```tsx
{bazarOuvert && (
  <FloatingActionButton
    onClick={onBazar}
    variant="secondary"
    disabled={tutoChiner || tutoEtaler}
    minWidth={140}
  >
    {d.qg.bazar}
  </FloatingActionButton>
)}
```

Le bouton est désactivé pendant les étapes dirigées du tutoriel, comme ses deux voisins : le tutoriel se déroule bien avant le jour 35, mais un `disabled` explicite coûte moins cher qu'une régression un jour où le scénario changera.

- [ ] **Step 7: Câbler la navigation**

Dans `src/app/(qg)/layout.tsx`, au montage de `PorteSheet` :

```tsx
bazarOuvert={bazarEstOuvert(state)}
onBazar={() => {
  playDoorClose();
  setPorteOuverte(false);
  router.push("/bazar");
}}
```

**Le Bazar ne coûte pas d'énergie** — contrairement à `onChiner` et `onVitrine`, il n'y a donc aucun garde `energieCourante(...) < 1` à recopier. Faire des courses n'est pas une journée de travail.

- [ ] **Step 8: Vérifier**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar src/lib/i18n
npx tsc --noEmit && npx eslint src
```

Attendu : vert. `tsc` signale les appels de `PorteSheet` qui manquent les nouvelles props obligatoires — il n'y en a qu'un.

- [ ] **Step 9: Commit**

```bash
git add src/lib/bazar src/components/mobile/qg/sheets/PorteSheet.tsx "src/app/(qg)/layout.tsx" src/lib/i18n
git commit -m "feat(bazar): la porte ouvre sur le Bazar à partir du 10 juillet"
```

---

### Task 5 : L'étal se compose et tourne chaque semaine

**Files:**
- Create: `src/lib/bazar/etal.ts`, `src/lib/bazar/etal.test.ts`
- Create: `src/lib/bazar/settleBazar.ts`, `src/lib/bazar/settleBazar.test.ts`
- Modify: `src/types/game.ts` (`EtalBazar`, `GameState.bazar`)
- Modify: `src/context/GameContext.tsx:404`

**Interfaces:**
- Consomme : `bazarEstOuvert` (Task 4).
- Produit :
  - `PRIX_JETON_EUROS = 25`, `PIECES_PAR_LOT = 5`, `NB_LOTS_PIECES = 3`
  - `prixEnJetons(prixRefBase: number): number`
  - `genererEtal(cleSemaine: string, rng?: () => number): EtalBazar`
  - `settleBazar(state: GameState, now: number): GameState`
  - Type `EtalBazar` (voir ci-dessous) — consommé par les Tasks 6 et 7.

- [ ] **Step 1: Écrire les tests de composition qui échouent**

`src/lib/bazar/etal.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { genererEtal, prixEnJetons, NB_LOTS_PIECES } from "@/lib/bazar/etal";

/** RNG déterministe : une suite fixe, rejouée en boucle. */
function rngFixe(suite: number[]): () => number {
  let i = 0;
  return () => suite[i++ % suite.length];
}

describe("prixEnJetons", () => {
  it("arrondit au supérieur, jamais en dessous de 1", () => {
    expect(prixEnJetons(250)).toBe(10);
    expect(prixEnJetons(260)).toBe(11);
    expect(prixEnJetons(9)).toBe(1);
  });
});

describe("genererEtal", () => {
  it("présente trois lots de pièces, de trois catégories distinctes", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.1, 0.4, 0.7, 0.2]));
    expect(etal.lotsPieces).toHaveLength(NB_LOTS_PIECES);
    const cats = etal.lotsPieces.map((l) => l.categorie);
    expect(new Set(cats).size).toBe(NB_LOTS_PIECES);
  });

  it("chaque lot coûte 1 jeton et donne 5 pièces", () => {
    for (const lot of genererEtal("2026-W34", rngFixe([0.3])).lotsPieces) {
      expect(lot.prix).toBe(1);
      expect(lot.quantite).toBe(5);
    }
  });

  it("la vitrine porte un objet dont le prix de base tient dans la fourchette", () => {
    const etal = genererEtal("2026-W34", rngFixe([0.42]));
    expect(etal.vitrine).not.toBeNull();
    expect(etal.vitrine!.valeurBase).toBeGreaterThanOrEqual(100);
    expect(etal.vitrine!.valeurBase).toBeLessThanOrEqual(400);
    expect(etal.vitrine!.prix).toBe(prixEnJetons(etal.vitrine!.valeurBase));
  });

  it("est déterministe à rng identique", () => {
    const a = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    const b = genererEtal("2026-W34", rngFixe([0.42, 0.1, 0.6, 0.9]));
    expect(b).toEqual(a);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/etal.test.ts
```

Attendu : ÉCHEC — module absent.

- [ ] **Step 3: Ajouter le type d'étal**

Dans `src/types/game.ts` :

```ts
/** Un lot de pièces de restauration à l'étal du Bazar. */
export interface LotPiecesBazar {
  categorie: CategorieObjet;
  /** Nombre de pièces livrées à l'achat. */
  quantite: number;
  /** Prix en jetons. */
  prix: number;
}

/** L'objet unique de la vitrine du Bazar, livré en Pristin état. */
export interface VitrineBazar {
  templateId: string;
  /** `prixRefBase` du template au moment de la composition (snapshot). */
  valeurBase: number;
  /** Prix en jetons — `Math.ceil(valeurBase / 25)`, minimum 1. */
  prix: number;
}

/** Étal du Bazar pour une semaine donnée. */
export interface EtalBazar {
  /** Clé de semaine ISO ("YYYY-Www") de l'étal présenté. */
  cleSemaine: string;
  /** Fond de commerce : stock illimité, trois catégories distinctes. */
  lotsPieces: LotPiecesBazar[];
  /** Vitrine : un seul exemplaire. `null` une fois acheté, jusqu'à la rotation. */
  vitrine: VitrineBazar | null;
}
```

Et sur `GameState` :

```ts
/** ADDITIF (v20) : étal courant du Bazar. Absent tant que le Bazar n'a pas ouvert. */
bazar?: EtalBazar;
```

- [ ] **Step 4: Écrire `etal.ts`**

```ts
import { CATEGORIES } from "@/data/categories";
import { poolPourTier } from "@/data/objetTemplates";
import type { CategorieObjet, EtalBazar, LotPiecesBazar, VitrineBazar } from "@/types/game";

/** Ratio fixe de la monnaie du Bazar. 1 jeton = 25 €, à vie. */
export const PRIX_JETON_EUROS = 25;
/** Pièces de restauration livrées par lot. */
export const PIECES_PAR_LOT = 5;
/** Lots de pièces présentés simultanément, de catégories distinctes. */
export const NB_LOTS_PIECES = 3;
/** Fourchette de `prixRefBase` éligible à la vitrine — le bouton de réglage. */
export const VITRINE_VALEUR_MIN = 100;
export const VITRINE_VALEUR_MAX = 400;

/** Prix en jetons d'un objet, arrondi au supérieur, jamais nul. */
export function prixEnJetons(prixRefBase: number): number {
  return Math.max(1, Math.ceil(prixRefBase / PRIX_JETON_EUROS));
}

/** Tire `n` éléments distincts, sans remise. */
function tirerSansRemise<T>(source: readonly T[], n: number, rng: () => number): T[] {
  const restant = [...source];
  const out: T[] = [];
  for (let i = 0; i < n && restant.length > 0; i++) {
    out.push(restant.splice(Math.floor(rng() * restant.length), 1)[0]);
  }
  return out;
}

/**
 * Compose l'étal d'une semaine. Pur et déterministe à `rng` donné : c'est ce
 * qui rend l'étal testable sans horloge.
 */
export function genererEtal(cleSemaine: string, rng: () => number = Math.random): EtalBazar {
  const categories = tirerSansRemise<CategorieObjet>(CATEGORIES, NB_LOTS_PIECES, rng);
  const lotsPieces: LotPiecesBazar[] = categories.map((categorie) => ({
    categorie,
    quantite: PIECES_PAR_LOT,
    prix: 1,
  }));

  const eligibles = poolPourTier(3).filter(
    (t) => t.prixRefBase >= VITRINE_VALEUR_MIN && t.prixRefBase <= VITRINE_VALEUR_MAX,
  );
  const choisi = eligibles[Math.floor(rng() * eligibles.length)];
  const vitrine: VitrineBazar | null = choisi
    ? {
        templateId: choisi.templateId,
        valeurBase: choisi.prixRefBase,
        prix: prixEnJetons(choisi.prixRefBase),
      }
    : null;

  return { cleSemaine, lotsPieces, vitrine };
}
```

- [ ] **Step 5: Lancer les tests de composition**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/etal.test.ts
```

Attendu : PASS sur les cinq tests.

- [ ] **Step 6: Écrire les tests de rotation qui échouent**

`src/lib/bazar/settleBazar.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { settleBazar } from "@/lib/bazar/settleBazar";
import { JOUR_OUVERTURE_BAZAR } from "@/lib/bazar/ouverture";
import { cleSemaineLocale } from "@/lib/quetes/periode";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";

const OUVERT = { jourActuel: JOUR_OUVERTURE_BAZAR };
const LUNDI = new Date(2026, 7, 17, 12, 0, 0).getTime();
const MARDI = new Date(2026, 7, 18, 12, 0, 0).getTime();
const LUNDI_SUIVANT = new Date(2026, 7, 24, 12, 0, 0).getTime();

describe("settleBazar", () => {
  it("ne compose rien tant que le Bazar n'a pas ouvert", () => {
    const state = createMockGameState({ jourActuel: JOUR_OUVERTURE_BAZAR - 1 });
    expect(settleBazar(state, LUNDI).bazar).toBeUndefined();
  });

  it("compose un étal au premier passage après l'ouverture", () => {
    const next = settleBazar(createMockGameState(OUVERT), LUNDI);
    expect(next.bazar?.cleSemaine).toBe(cleSemaineLocale(LUNDI));
    expect(next.bazar?.lotsPieces).toHaveLength(3);
  });

  it("ne rejoue rien dans la même semaine — même référence d'objet", () => {
    const lundi = settleBazar(createMockGameState(OUVERT), LUNDI);
    const mardi = settleBazar(lundi, MARDI);
    expect(mardi).toBe(lundi);
  });

  it("renouvelle l'étal au passage à la semaine suivante", () => {
    const semaine1 = settleBazar(createMockGameState(OUVERT), LUNDI);
    const semaine2 = settleBazar(semaine1, LUNDI_SUIVANT);
    expect(semaine2.bazar?.cleSemaine).toBe(cleSemaineLocale(LUNDI_SUIVANT));
    expect(semaine2.bazar?.cleSemaine).not.toBe(semaine1.bazar?.cleSemaine);
  });

  it("la vitrine achetée revient garnie à la rotation", () => {
    const semaine1 = settleBazar(createMockGameState(OUVERT), LUNDI);
    const vide = { ...semaine1, bazar: { ...semaine1.bazar!, vitrine: null } };
    const semaine2 = settleBazar(vide, LUNDI_SUIVANT);
    expect(semaine2.bazar?.vitrine).not.toBeNull();
  });
});
```

- [ ] **Step 7: Écrire `settleBazar.ts`**

```ts
import type { GameState } from "@/types/game";
import { cleSemaineLocale } from "@/lib/quetes/periode";
import { bazarEstOuvert } from "./ouverture";
import { genererEtal } from "./etal";

/**
 * Régénère l'étal si la semaine a changé. Pur, idempotent : retourne la MÊME
 * référence si rien ne bouge, pour que React ne rende pas dans le vide.
 *
 * L'étal est persisté plutôt que recalculé à la volée : une ancre périmée est
 * exactement ce qui avait fait sonner les notifications de restauration en
 * avance. La clé de semaine vit dans la save, pas dans une horloge.
 */
export function settleBazar(state: GameState, now: number): GameState {
  if (!bazarEstOuvert(state)) return state;
  const cle = cleSemaineLocale(now);
  if (state.bazar?.cleSemaine === cle) return state;
  return { ...state, bazar: genererEtal(cle) };
}
```

- [ ] **Step 8: Lancer les tests de rotation**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/settleBazar.test.ts
```

Attendu : PASS sur les cinq tests.

- [ ] **Step 9: Brancher le settle au tick**

Dans `src/context/GameContext.tsx`, importer :

```ts
import { settleBazar } from "@/lib/bazar/settleBazar";
```

Puis, immédiatement après la ligne 404 (`settleQuetesPeriodiques`) :

```ts
setState((prev) => (prev ? settleBazar(prev, now) : prev));
```

- [ ] **Step 10: Vérifier l'ensemble**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit && npx eslint src
```

- [ ] **Step 11: Commit**

```bash
git add src/lib/bazar src/types/game.ts src/context/GameContext.tsx
git commit -m "feat(bazar): l'étal se compose et tourne chaque lundi"
```

---

### Task 6 : Acheter à l'étal

**Files:**
- Create: `src/lib/bazar/achat.ts`, `src/lib/bazar/achat.test.ts`
- Modify: `src/context/GameContext.tsx` (exposer l'action)

**Interfaces:**
- Consomme : `EtalBazar`, `PRIX_JETON_EUROS` (Task 5), `GameState.jetons` (Task 1).
- Produit :
  - `type AchatBazar = { type: "pieces"; index: number } | { type: "vitrine" }` — **la source unique**, importée par la vue de la Task 7.
  - `type RaisonRefus = "jetons" | "indisponible"`
  - `type ResultatAchat = { ok: true; state: GameState } | { ok: false; raison: RaisonRefus }`
  - `acheterLotPieces(state, index): ResultatAchat`
  - `acheterVitrine(state, now): ResultatAchat`
  - `GameContext` expose `acheterAuBazar(achat: AchatBazar)`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/bazar/achat.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { acheterLotPieces, acheterVitrine } from "@/lib/bazar/achat";
import { genererEtal, PRIX_JETON_EUROS } from "@/lib/bazar/etal";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { GameState } from "@/types/game";

function avecEtal(patch: Partial<GameState> = {}): GameState {
  return createMockGameState({ jetons: 20, bazar: genererEtal("2026-W34"), ...patch });
}

describe("acheter un lot de pièces", () => {
  it("débite 1 jeton et crédite 5 pièces de la bonne catégorie", () => {
    const state = avecEtal();
    const cat = state.bazar!.lotsPieces[0].categorie;
    const avant = state.piecesAmelioration[cat];
    const r = acheterLotPieces(state, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(19);
    expect(r.state.piecesAmelioration[cat]).toBe(avant + 5);
  });

  it("le lot reste à l'étal — stock illimité", () => {
    const r = acheterLotPieces(avecEtal(), 0);
    expect(r.ok && r.state.bazar!.lotsPieces).toHaveLength(3);
  });

  it("refuse sans effet de bord quand les jetons manquent", () => {
    const state = avecEtal({ jetons: 0 });
    const r = acheterLotPieces(state, 0);
    expect(r).toEqual({ ok: false, raison: "jetons" });
  });
});

describe("acheter l'objet de vitrine", () => {
  it("débite le prix et pose l'objet en Pristin dans l'inventaire", () => {
    const state = avecEtal();
    const prix = state.bazar!.vitrine!.prix;
    const r = acheterVitrine(state, Date.now());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.jetons).toBe(20 - prix);
    expect(r.state.inventaireJoueur).toHaveLength(1);
    expect(r.state.inventaireJoueur[0].etat).toBe("Pristin état");
  });

  it("GARDE-FOU : l'objet porte un prix d'achat en euros égal à ce qui a été payé", () => {
    const state = avecEtal();
    const prix = state.bazar!.vitrine!.prix;
    const r = acheterVitrine(state, Date.now());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Sans ce prix d'achat, la revente serait un bénéfice pur : elle validerait
    // les quêtes de bénéfice, qui paient des jetons — boucle fermée et rentable.
    expect(r.state.inventaireJoueur[0].prixAchat).toBe(prix * PRIX_JETON_EUROS);
  });

  it("vide la vitrine jusqu'à la rotation", () => {
    const r = acheterVitrine(avecEtal(), Date.now());
    expect(r.ok && r.state.bazar!.vitrine).toBeNull();
  });

  it("refuse une vitrine déjà vide", () => {
    const state = avecEtal();
    const vide = { ...state, bazar: { ...state.bazar!, vitrine: null } };
    expect(acheterVitrine(vide, Date.now())).toEqual({ ok: false, raison: "indisponible" });
  });

  it("n'écrit rien au grand livre — aucun euro ne bouge", () => {
    const state = avecEtal();
    const r = acheterVitrine(state, Date.now());
    expect(r.ok && r.state.grandLivre).toHaveLength(state.grandLivre.length);
    expect(r.ok && r.state.budget).toBe(state.budget);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/achat.test.ts
```

Attendu : ÉCHEC — module absent.

- [ ] **Step 3: Écrire `achat.ts`**

```ts
import type { GameState, Objet } from "@/types/game";
import { getTemplate } from "@/data/objetTemplates";
import { recalculerPrixReference } from "@/lib/etat";
import { PRIX_JETON_EUROS } from "./etal";

/** Ce que le joueur peut acheter à l'étal. Défini ICI — la vue l'importe. */
export type AchatBazar = { type: "pieces"; index: number } | { type: "vitrine" };

export type RaisonRefus = "jetons" | "indisponible";

export type ResultatAchat =
  | { ok: true; state: GameState }
  | { ok: false; raison: RaisonRefus };

/** Achète le lot de pièces à l'index donné. Stock illimité : l'étal ne bouge pas. */
export function acheterLotPieces(state: GameState, index: number): ResultatAchat {
  const lot = state.bazar?.lotsPieces[index];
  if (!lot) return { ok: false, raison: "indisponible" };
  if (state.jetons < lot.prix) return { ok: false, raison: "jetons" };
  return {
    ok: true,
    state: {
      ...state,
      jetons: state.jetons - lot.prix,
      piecesAmelioration: {
        ...state.piecesAmelioration,
        [lot.categorie]: (state.piecesAmelioration[lot.categorie] ?? 0) + lot.quantite,
      },
    },
  };
}

/**
 * Achète l'objet de vitrine. Exemplaire unique : la vitrine se vide jusqu'à la
 * rotation.
 *
 * L'objet entre en stock avec un `prixAchat` en EUROS égal à ce que le joueur a
 * payé en jetons (prix × 25). Sans lui, sa revente compterait comme un bénéfice
 * intégral, ce qui validerait les quêtes de bénéfice — lesquelles paient des
 * jetons. La boucle serait fermée et rentable.
 */
export function acheterVitrine(state: GameState, now: number): ResultatAchat {
  const v = state.bazar?.vitrine;
  if (!v) return { ok: false, raison: "indisponible" };
  if (state.jetons < v.prix) return { ok: false, raison: "jetons" };
  const template = getTemplate(v.templateId);
  if (!template) return { ok: false, raison: "indisponible" };

  const objet: Objet = {
    id: `bazar_${v.templateId}_${now}`,
    templateId: template.templateId,
    nom: template.nom,
    categorie: template.categorie,
    prixReferenceReel: recalculerPrixReference(v.valeurBase, "Très bon", "Pristin état"),
    etat: "Pristin état",
    rarete: template.rarete,
    prixAchat: v.prix * PRIX_JETON_EUROS,
  };

  return {
    ok: true,
    state: {
      ...state,
      jetons: state.jetons - v.prix,
      inventaireJoueur: [...state.inventaireJoueur, objet],
      bazar: { ...state.bazar!, vitrine: null },
    },
  };
}
```

- [ ] **Step 4: Lancer les tests**

```bash
npx vitest run --maxWorkers=4 src/lib/bazar/achat.test.ts
```

Attendu : PASS sur les neuf tests, **dont le garde-fou**.

- [ ] **Step 5: Exposer l'action au contexte**

Dans `src/context/GameContext.tsx`, ajouter au type de la valeur de contexte puis à l'implémentation, sur le modèle des actions existantes (`useCallback`, lecture via `stateRef.current`, écriture via `setState`) :

```ts
const acheterAuBazar = useCallback(
  (achat: AchatBazar): { ok: boolean; raison?: string } => {
    const current = stateRef.current;
    if (!current) return { ok: false, raison: raisonLocalisee("pasDePartie") };
    const now = tempsConfiance() ?? Date.now();
    const r =
      achat.type === "pieces"
        ? acheterLotPieces(current, achat.index)
        : acheterVitrine(current, now);
    if (!r.ok) {
      // Localiser comme le font les actions voisines : jamais de clé brute
      // remontée à l'UI.
      return {
        ok: false,
        raison: raisonLocalisee(
          r.raison === "jetons" ? "bazarPasAssezDeJetons" : "bazarArticleIndisponible",
        ),
      };
    }
    setState((prev) => (prev ? r.state : prev));
    return { ok: true };
  },
  [],
);
```

Ajouter les deux raisons localisées dans la section `raisons` des quatre
dictionnaires (`fr`, `en`, `es`, `el`), à côté de `manquePiecesUn` :

```ts
bazarPasAssezDeJetons: "Pas assez de jetons",   // en: "Not enough tokens" · es: "No tienes fichas suficientes" · el: "Δεν έχετε αρκετές μάρκες"
bazarArticleIndisponible: "Article indisponible", // en: "Item unavailable" · es: "Artículo no disponible" · el: "Μη διαθέσιμο είδος"
```

- [ ] **Step 6: Vérifier**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit && npx eslint src
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/bazar src/context/GameContext.tsx
git commit -m "feat(bazar): acheter à l'étal, avec le prix d'achat qui suit l'objet"
```

---

### Task 7 : L'écran du Bazar

**Files:**
- Create: `src/app/bazar/page.tsx`
- Create: `src/components/bazar/EtalBazar.tsx`, `src/components/bazar/EtalBazar.test.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (section `bazar`)

**Interfaces:**
- Consomme : `EtalBazar` (Task 5) ; `AchatBazar` et `acheterAuBazar` (Task 6) ; `bazarEstOuvert` (Task 4).
- Produit : la route `/bazar`.

- [ ] **Step 1: Écrire le test de rendu qui échoue**

`src/components/bazar/EtalBazar.test.tsx` :

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EtalBazarVue } from "@/components/bazar/EtalBazar";
import { genererEtal } from "@/lib/bazar/etal";

const etal = genererEtal("2026-W34");

describe("EtalBazarVue", () => {
  it("montre les trois lots de pièces et la vitrine", () => {
    render(<EtalBazarVue etal={etal} jetons={20} onAcheter={() => {}} />);
    expect(screen.getAllByRole("button", { name: /pièces/i })).toHaveLength(3);
    expect(screen.getByRole("button", { name: new RegExp(etal.vitrine!.prix.toString()) })).toBeInTheDocument();
  });

  it("grise ce que le joueur ne peut pas payer", () => {
    render(<EtalBazarVue etal={etal} jetons={0} onAcheter={() => {}} />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });

  it("remonte l'achat d'un lot avec son index", async () => {
    const onAcheter = vi.fn();
    render(<EtalBazarVue etal={etal} jetons={20} onAcheter={onAcheter} />);
    await userEvent.click(screen.getAllByRole("button", { name: /pièces/i })[1]);
    expect(onAcheter).toHaveBeenCalledWith({ type: "pieces", index: 1 });
  });

  it("annonce la vitrine vide plutôt qu'un bouton mort", () => {
    render(<EtalBazarVue etal={{ ...etal, vitrine: null }} jetons={20} onAcheter={() => {}} />);
    expect(screen.getByText(/vendu/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/EtalBazar.test.tsx
```

Attendu : ÉCHEC — composant absent.

- [ ] **Step 3: Ajouter les libellés dans les quatre langues**

Nouvelle section `bazar` dans `fr.ts` (puis `en`, `es`, `el`) :

```ts
bazar: {
  titre: "Le Bazar",
  fondDeCommerce: "À l'étal",
  vitrine: "En vitrine",
  lotPieces: "{n} pièces · {categorie}",
  prixJetons: "{n} jetons",
  prixJetonUn: "{n} jeton",
  vendu: "Vendu — de retour lundi",
  pasAssez: "Pas assez de jetons",
  soldeJetons: "Vos jetons : {n}",
},
```

Traductions : `en` → `"The Bazaar" / "On the shelf" / "In the window" / "{n} parts · {categorie}" / "{n} tokens" / "{n} token" / "Sold — back on Monday" / "Not enough tokens" / "Your tokens: {n}"`. `es` → `"El Bazar" / "En el mostrador" / "En el escaparate" / "{n} piezas · {categorie}" / "{n} fichas" / "{n} ficha" / "Vendido — vuelve el lunes" / "No tienes fichas suficientes" / "Tus fichas: {n}"`. `el` → `"Το Παζάρι" / "Στον πάγκο" / "Στη βιτρίνα" / "{n} ανταλλακτικά · {categorie}" / "{n} μάρκες" / "{n} μάρκα" / "Πουλήθηκε — επιστρέφει τη Δευτέρα" / "Δεν έχετε αρκετές μάρκες" / "Οι μάρκες σας: {n}"`.

**Le nom de catégorie s'interpole via `libelleCategorie(cat, d)`** — jamais la valeur brute du `Record`, qui est une chaîne FR de save.

- [ ] **Step 4: Écrire le composant de présentation**

`src/components/bazar/EtalBazar.tsx` — **présentation seule** : aucun accès au contexte de jeu, tout arrive par les props. C'est ce qui le rend testable sans monter une partie, et ce qui permettra de le déplacer dans un décor à part entière plus tard sans y toucher.

```tsx
"use client";

import type { EtalBazar } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { getTemplate } from "@/data/objetTemplates";
import type { AchatBazar } from "@/lib/bazar/achat";

interface Props {
  etal: EtalBazar;
  jetons: number;
  onAcheter: (achat: AchatBazar) => void;
}

export function EtalBazarVue({ etal, jetons, onAcheter }: Props) {
  const { d, tr } = useLangue();
  const prix = (n: number) => tr(n > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n });

  return (
    <div>
      <h2>{d.bazar.fondDeCommerce}</h2>
      <ul>
        {etal.lotsPieces.map((lot, index) => (
          <li key={lot.categorie}>
            <button
              type="button"
              disabled={jetons < lot.prix}
              onClick={() => onAcheter({ type: "pieces", index })}
            >
              {tr(d.bazar.lotPieces, {
                n: lot.quantite,
                categorie: libelleCategorie(lot.categorie, d),
              })}{" "}
              — {prix(lot.prix)}
            </button>
          </li>
        ))}
      </ul>

      <h2>{d.bazar.vitrine}</h2>
      {etal.vitrine ? (
        <button
          type="button"
          disabled={jetons < etal.vitrine.prix}
          onClick={() => onAcheter({ type: "vitrine" })}
        >
          {getTemplate(etal.vitrine.templateId)?.nom} — {prix(etal.vitrine.prix)}
        </button>
      ) : (
        <p>{d.bazar.vendu}</p>
      )}

      <p>{tr(d.bazar.soldeJetons, { n: jetons })}</p>
    </div>
  );
}
```

Le style suit celui des écrans voisins (`src/app/(qg)/atelier/page.tsx` pour le gabarit d'une pièce, `FloatingRoomOverlay` pour le châssis). **Ne pas inventer de nouvelle direction visuelle** : la boutique aura son décor dans une passe dédiée, avec Guillaume.

- [ ] **Step 5: Lancer les tests du composant**

```bash
npx vitest run --maxWorkers=4 src/components/bazar/EtalBazar.test.tsx
```

Attendu : PASS sur les quatre tests.

- [ ] **Step 6: Écrire la page**

`src/app/bazar/page.tsx`, sur le modèle de `src/app/chiner/page.tsx` (redirection vers `/` si pas de partie, `SkeletonScreen` pendant l'hydratation) :

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { SkeletonScreen } from "@/components/ui/SkeletonScreen";
import { EtalBazarVue } from "@/components/bazar/EtalBazar";
import { useGame } from "@/context/GameContext";
import { bazarEstOuvert } from "@/lib/bazar/ouverture";

export default function BazarPage() {
  const router = useRouter();
  const { state, isHydrated, acheterAuBazar } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
    // Le Bazar n'a pas encore ouvert : on ne laisse pas une URL tapée à la main
    // exposer un écran qui n'existe pas dans la fiction.
    if (isHydrated && state && !bazarEstOuvert(state)) router.replace("/bureau");
  }, [isHydrated, state, router]);

  if (!state || !state.bazar) return <SkeletonScreen />;

  return (
    <MobileLayout header={<MobileHeader budget={state.budget} jetons={state.jetons} />}>
      <EtalBazarVue
        etal={state.bazar}
        jetons={state.jetons}
        onAcheter={(achat) => acheterAuBazar(achat)}
      />
    </MobileLayout>
  );
}
```

Vérifier la signature réelle de `MobileLayout` dans `src/components/mobile/MobileLayout.tsx` avant d'écrire ce bloc et s'y conformer.

- [ ] **Step 7: Vérifier l'ensemble**

```bash
npx vitest run --maxWorkers=4
npx tsc --noEmit && npx eslint src
```

- [ ] **Step 8: Commit**

```bash
git add src/app/bazar src/components/bazar src/lib/i18n
git commit -m "feat(bazar): l'écran de la boutique"
```

---

## Recette à la main (Guillaume)

Le code ne prouve pas ces points-là. À vérifier sur appareil, une fois le jalon posé :

1. **Avant le jour 35** : la porte n'a que deux boutons, le compteur de jetons est absent du bandeau.
2. **Livrer une quotidienne** : pastille « +1 jeton » dans le carnet, compteur qui monte, ligne du grand livre suffixée.
3. **Livrer une hebdomadaire** : « +3 jetons ».
4. **Au jour 35** : le troisième bouton apparaît, `/bazar` s'ouvre, l'étal montre trois lots et une vitrine.
5. **Acheter un lot** : les pièces arrivent dans la bonne catégorie à l'atelier, le lot reste à l'étal.
6. **Acheter la vitrine** : l'objet est en Pristin dans le stock, la vitrine affiche « Vendu ».
7. **Mettre l'objet en vente** : la marge affichée tient compte du prix payé — elle n'est pas égale au prix de vente entier.
8. **Passer un lundi** : nouvel étal, nouvelles catégories, nouvelle vitrine.
9. **Les quatre langues** sur l'écran du Bazar, grec en priorité (c'est là que les débordements se voient).

## Ce que ce plan ne fait pas

Consigné pour qu'aucun exécutant n'improvise :

- **Aucun paquet de cartes ni de timbres** — les collections n'existent pas encore (chantiers ④ et ③).
- **Aucune borne d'arcade** — chantier ⑤, V2.
- **Aucun décor de boutique.** L'écran est fonctionnel et sobre ; le lieu se dessinera avec Guillaume, qui a demandé à traiter les images ensemble.
- **Aucun rattrapage pour le joueur intermittent** (12 jetons contre 30). C'est un réglage de nombre, à décider sur des retours d'usage.
