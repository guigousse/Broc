# Phase 4 — Boss + Trophée Final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la 16ᵉ brocante (« Salon des Antiquaires de Drouot », tier 4 boss) avec 6 objets uniques (un par catégorie) qui complètent le catalogue, créer la page `/trophees` (vitrine d'accomplissements) et déclencher le trophée du Chineur ultime quand toutes les catégories du catalogue sont à 100 %.

**Architecture:** On étend `BrocanteTier` à `1 | 2 | 3 | 4` (le 4 = boss), on ajoute un nouveau fichier `src/data/uniques.ts` avec 6 templates `unique: true` (résolus via `getTemplate`), on ajoute la 16ᵉ entrée dans `src/data/brocantes.ts`, on étend les boucles de tier dans les pages `/chiner` et `/vitrine` pour afficher la section boss. La page `/trophees` est principalement de l'affichage : brocantes débloquées, légendaires possédés, progression catalogue par catégorie, badge du Trophée ultime. Le QG gagne un bouton vers `/trophees` (grisé tant qu'aucune 3⭐ n'est débloquée).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, lucide-react.

**Vérification:** pas de framework de test. `npx tsc --noEmit` + dev server au port 3000 + curl sur les routes impactées.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modify | Étendre `BrocanteTier = 1 \| 2 \| 3 \| 4` + `etoiles: 1 \| 2 \| 3 \| 4`. |
| `src/data/standLevels.ts` | Modify | `COUTS_STAND` ajoute le tier 4 : 800 / 2000 / 5000. |
| `src/data/clients.ts` | Modify | `genererPoolClients(taille, tier: 1\|2\|3\|4 = 4)` accepte tier 4. |
| `src/lib/deblocage.ts` | Modify | `Map<1\|2\|3\|4, Set<string>>` pour les debloqueesParTier. |
| `src/data/uniques.ts` | Create | 6 templates uniques (un par catégorie) avec `unique: true`. |
| `src/data/objetTemplates.ts` | Modify | Inclure UNIQUES dans `ALL_TEMPLATES` (pour résolution via `getTemplate`). |
| `src/data/brocantes.ts` | Modify | Ajouter la 16ᵉ brocante (tier 4, poolExclusif = les 6 uniques). Étendre `brocantesParTier`. |
| `src/app/chiner/page.tsx` | Modify | Boucles tier `[1, 2, 3, 4]` + label spécial pour tier 4. |
| `src/app/vitrine/page.tsx` | Modify | Idem. |
| `src/app/trophees/page.tsx` | Create | Nouvelle page : brocantes débloquées + légendaires possédés + progression par cat + badge ultime. |
| `src/app/qg/page.tsx` | Modify | Bouton « Salle des trophées » dans le panneau Catalogue (grisé si aucune 3⭐ débloquée). |

---

## Task 1 : Étendre `BrocanteTier` au tier 4 (boss)

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/data/standLevels.ts`
- Modify: `src/data/clients.ts`
- Modify: `src/lib/deblocage.ts`

- [ ] **Step 1 : Étendre `BrocanteTier` et `Brocante.etoiles`**

Édite `src/types/game.ts`. Trouve :

```ts
export type BrocanteTier = 1 | 2 | 3;
```

Remplace par :

```ts
export type BrocanteTier = 1 | 2 | 3 | 4;
```

Trouve dans `interface Brocante` :

```ts
  etoiles: 1 | 2 | 3;
```

Remplace par :

```ts
  etoiles: 1 | 2 | 3 | 4;
```

- [ ] **Step 2 : `COUTS_STAND` ajoute le tier 4**

Édite `src/data/standLevels.ts`. Trouve :

```ts
export const COUTS_STAND: Record<BrocanteTier, Record<StandLevel, number>> = {
  1: { 1: 20, 2: 50, 3: 120 },
  2: { 1: 70, 2: 180, 3: 420 },
  3: { 1: 220, 2: 550, 3: 1300 },
};
```

Remplace par :

```ts
export const COUTS_STAND: Record<BrocanteTier, Record<StandLevel, number>> = {
  1: { 1: 20, 2: 50, 3: 120 },
  2: { 1: 70, 2: 180, 3: 420 },
  3: { 1: 220, 2: 550, 3: 1300 },
  4: { 1: 800, 2: 2000, 3: 5000 },
};
```

- [ ] **Step 3 : `genererPoolClients` accepte tier 4**

Édite `src/data/clients.ts`. Trouve :

```ts
export function genererPoolClients(taille: number, tier: 1 | 2 | 3 = 3): ClientPersonnage[] {
```

Remplace par :

```ts
export function genererPoolClients(taille: number, tier: 1 | 2 | 3 | 4 = 4): ClientPersonnage[] {
```

(Le `filter(p => p.tierMin <= tier)` continue à fonctionner — `tierMin` reste typé `1|2|3` et `tier 4 >= tous les tierMin`, donc tous les personas passent.)

- [ ] **Step 4 : `estDebloquee` accepte Map<1|2|3|4, ...>**

Édite `src/lib/deblocage.ts`. Trouve les deux occurrences :

```ts
  brocantesDebloqueesParTier?: Map<1 | 2 | 3, Set<string>>,
```

Remplace les DEUX par :

```ts
  brocantesDebloqueesParTier?: Map<1 | 2 | 3 | 4, Set<string>>,
```

- [ ] **Step 5 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -30`
Expected: il y aura des erreurs dans les pages `/chiner/page.tsx` et `/vitrine/page.tsx` à cause des Maps littérales `new Map<1|2|3, ...>` — corrigées en Task 4.

- [ ] **Step 6 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts src/data/standLevels.ts src/data/clients.ts src/lib/deblocage.ts
git commit -m "feat(types): extend BrocanteTier to include tier 4 (boss)"
```

---

## Task 2 : 6 objets uniques (un par catégorie)

**Files:**
- Create: `src/data/uniques.ts`
- Modify: `src/data/objetTemplates.ts`

- [ ] **Step 1 : Créer le fichier des uniques**

Crée `src/data/uniques.ts` :

```ts
import type { ObjetTemplate } from "@/data/objetTemplates";

/**
 * 6 objets UNIQUES (un par catégorie) — ne peuvent être possédés qu'une fois par partie.
 * N'apparaissent QUE dans le `poolExclusif` du boss (Salon des Antiquaires de Drouot).
 * Compléter le catalogue passe par leur acquisition.
 */
export const UNIQUES: ObjetTemplate[] = [
  {
    templateId: "uniq.mus.violon_paganini",
    nom: "Violon \"Il Cannone\" de Paganini",
    categorie: "Musique",
    rarete: "legendaire",
    prixRefBase: 9000,
    unique: true,
  },
  {
    templateId: "uniq.jx.console_pong_1972",
    nom: "Prototype Pong, Atari 1972",
    categorie: "Jeux & Loisirs",
    rarete: "legendaire",
    prixRefBase: 6500,
    unique: true,
  },
  {
    templateId: "uniq.lv.manuscrit_voltaire",
    nom: "Manuscrit autographe de Voltaire",
    categorie: "Livres & Papeterie",
    rarete: "legendaire",
    prixRefBase: 7800,
    unique: true,
  },
  {
    templateId: "uniq.mo.bijou_marie_antoinette",
    nom: "Bijou ayant appartenu à Marie-Antoinette",
    categorie: "Mode",
    rarete: "legendaire",
    prixRefBase: 8500,
    unique: true,
  },
  {
    templateId: "uniq.ma.vase_ming_dynasty",
    nom: "Vase porcelaine dynastie Ming",
    categorie: "Maison",
    rarete: "legendaire",
    prixRefBase: 11000,
    unique: true,
  },
  {
    templateId: "uniq.br.coffre_outils_louis_xiv",
    nom: "Coffre d'outils d'ébéniste de Louis XIV",
    categorie: "Bricolage",
    rarete: "legendaire",
    prixRefBase: 5200,
    unique: true,
  },
];
```

- [ ] **Step 2 : Inclure UNIQUES dans `ALL_TEMPLATES`**

Édite `src/data/objetTemplates.ts`. Trouve le bloc :

```ts
import { LEGENDAIRES } from "@/data/legendaires";

const ALL_TEMPLATES: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES];
```

Remplace par :

```ts
import { LEGENDAIRES } from "@/data/legendaires";
import { UNIQUES } from "@/data/uniques";

const ALL_TEMPLATES: ObjetTemplate[] = [...OBJET_TEMPLATES, ...LEGENDAIRES, ...UNIQUES];
```

Note : `POOL_COMMUN_GENERIQUE` reste inchangé (= `OBJET_TEMPLATES`). Les UNIQUES, comme les LEGENDAIRES, n'apparaissent QUE via les `poolExclusif` des brocantes.

- [ ] **Step 3 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: pas de nouvelle erreur dans `uniques.ts` ou `objetTemplates.ts`. Les erreurs résiduelles sont celles de la Task 1.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/uniques.ts src/data/objetTemplates.ts
git commit -m "feat(data): 6 unique templates (1 per category) accessible via boss brocante"
```

---

## Task 3 : Ajouter la 16ᵉ brocante (boss tier 4)

**Files:**
- Modify: `src/data/brocantes.ts`

- [ ] **Step 1 : Ajouter le boss à la fin du tableau `BROCANTES`**

Édite `src/data/brocantes.ts`. Trouve la fermeture du tableau `BROCANTES` (la ligne `];` juste après la dernière brocante tier 3, qui est probablement `galerie-arts-decoratifs`). Juste AVANT le `];`, insère :

```ts
  // ============================================================
  // BOSS — Salon des Antiquaires (tier 4)
  // Toutes les pièces UNIQUES du catalogue y résident.
  // ============================================================
  {
    id: "salon-antiquaires-drouot",
    nom: "Salon des Antiquaires de Drouot",
    description:
      "Le saint des saints. Les plus grands collectionneurs s'y croisent, les pièces uniques y trouvent leur dernier passage.",
    ambiance: "Mythique",
    tier: 4,
    etoiles: 4,
    taillePool: 12,
    poolExclusif: [
      "uniq.mus.violon_paganini",
      "uniq.jx.console_pong_1972",
      "uniq.lv.manuscrit_voltaire",
      "uniq.mo.bijou_marie_antoinette",
      "uniq.ma.vase_ming_dynasty",
      "uniq.br.coffre_outils_louis_xiv",
    ],
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 10000 },
        { type: "brocantesDebloquees", tier: 3, nombre: 5 },
      ],
    },
  },
```

- [ ] **Step 2 : Étendre `brocantesParTier` pour accepter tier 4**

Toujours dans `src/data/brocantes.ts`. Trouve la signature :

```ts
export function brocantesParTier(tier: 1 | 2 | 3): Brocante[] {
  return BROCANTES.filter((b) => b.tier === tier);
}
```

Remplace par :

```ts
export function brocantesParTier(tier: 1 | 2 | 3 | 4): Brocante[] {
  return BROCANTES.filter((b) => b.tier === tier);
}
```

- [ ] **Step 3 : Type-check**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -20`
Expected: erreurs résiduelles dans `/chiner/page.tsx` et `/vitrine/page.tsx` (Maps littérales typées `<1|2|3, ...>` et boucles `[1, 2, 3]`). Corrigées en Task 4.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/brocantes.ts
git commit -m "feat(brocantes): add 16th brocante — Salon des Antiquaires (tier 4 boss)"
```

---

## Task 4 : Pages `/chiner` et `/vitrine` — afficher la section boss

**Files:**
- Modify: `src/app/chiner/page.tsx`
- Modify: `src/app/vitrine/page.tsx`

- [ ] **Step 1 : Adapter `/chiner` pour boucler sur `[1, 2, 3, 4]`**

Édite `src/app/chiner/page.tsx`. Trouve l'initialisation de `debloqueesParTier` :

```ts
  const debloqueesParTier = new Map<1 | 2 | 3, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
```

Remplace par :

```ts
  const debloqueesParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
    [4, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
```

Trouve ensuite la boucle de rendu des sections de tier :

```tsx
        {([1, 2, 3] as const).map((tier) => {
```

Remplace par :

```tsx
        {([1, 2, 3, 4] as const).map((tier) => {
```

Trouve enfin le `<span>` qui rend le titre de la section :

```tsx
                <span>
                  {tier === 1
                    ? "Brocantes de quartier"
                    : tier === 2
                      ? "Marchés réputés"
                      : "Salons et galeries"}
                </span>
```

Remplace par :

```tsx
                <span>
                  {tier === 1
                    ? "Brocantes de quartier"
                    : tier === 2
                      ? "Marchés réputés"
                      : tier === 3
                        ? "Salons et galeries"
                        : "Le Salon ultime"}
                </span>
```

- [ ] **Step 2 : Adapter `/vitrine` (sélecteur) identiquement**

Édite `src/app/vitrine/page.tsx`. Applique exactement les mêmes 3 remplacements qu'à l'étape 1 (init `debloqueesParTier`, boucle de map, switch du titre).

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected: 0 erreur.

Run :
```bash
curl -s -o /dev/null -w "/chiner %{http_code}\n" http://localhost:3000/chiner
curl -s -o /dev/null -w "/vitrine %{http_code}\n" http://localhost:3000/vitrine
```
Expected : 200 / 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/chiner/page.tsx src/app/vitrine/page.tsx
git commit -m "feat(pages): show boss tier 4 section in chiner and vitrine lists"
```

---

## Task 5 : Page `/trophees` — salle des accomplissements

**Files:**
- Create: `src/app/trophees/page.tsx`

- [ ] **Step 1 : Créer la page**

Crée `src/app/trophees/page.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/Button";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { DecoDivider } from "@/components/ui/DecoDivider";
import { Panel } from "@/components/ui/Panel";
import { RareteBadge } from "@/components/ui/RareteBadge";
import { useGame } from "@/context/GameContext";
import { CATEGORIES } from "@/data/categories";
import { BROCANTES, brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
import {
  catalogueComplete,
  progressionCategorie,
  progressionGlobale,
} from "@/lib/catalogue";

export default function TropheesPage() {
  const router = useRouter();
  const { state, isHydrated } = useGame();

  useEffect(() => {
    if (isHydrated && !state) router.replace("/");
  }, [isHydrated, state, router]);

  if (!isHydrated || !state) {
    return (
      <main
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-500)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        — ouverture de la salle des trophées…
      </main>
    );
  }

  // Brocantes débloquées par tier
  const debloqueesParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
    [4, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
  const totalDebloquees =
    debloqueesParTier.get(1)!.size +
    debloqueesParTier.get(2)!.size +
    debloqueesParTier.get(3)!.size +
    debloqueesParTier.get(4)!.size;

  // Légendaires possédés (rarete legendaire avec possede > 0)
  const legendairesPossedees: { templateId: string; nom: string; categorie: typeof CATEGORIES[number] }[] =
    [];
  for (const cat of CATEGORIES) {
    for (const e of state.catalogue[cat] ?? []) {
      if (e.rarete === "legendaire" && e.possede > 0) {
        legendairesPossedees.push({
          templateId: e.templateId,
          nom: e.nom,
          categorie: e.categorie,
        });
      }
    }
  }

  // Progression globale
  const global = progressionGlobale(state.catalogue);
  const complete = catalogueComplete(state.catalogue);

  return (
    <div
      className="bg-paper-grain"
      style={{ minHeight: "100dvh", padding: "20px 28px 32px" }}
    >
      <StatusBar jour={state.jourActuel} budget={state.budget} />

      <div
        style={{
          maxWidth: 1100,
          margin: "32px auto 0",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <div className="eyebrow">— salle des trophées —</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                margin: "4px 0 8px",
                lineHeight: 1.1,
              }}
            >
              Vos accomplissements
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                fontSize: 16,
                margin: 0,
                maxWidth: 540,
              }}
            >
              Le chemin parcouru et celui qui reste.
            </p>
          </div>
          <Link href="/qg">
            <Button variant="ghost" size="sm">
              ← Retour au QG
            </Button>
          </Link>
        </header>

        <DecoDivider />

        {/* TROPHÉE ULTIME */}
        <Panel
          eyebrow={complete ? "— gloire ! —" : "— quête finale —"}
          title={complete ? "Trophée du Chineur ultime" : "Trophée du Chineur ultime"}
          dark={complete}
        >
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            {complete ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 80,
                    color: "var(--brass-300)",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  ★
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 17,
                    color: "var(--paper-200)",
                    margin: "0 0 8px",
                  }}
                >
                  Toutes les pièces de tous les catalogues sont passées entre vos
                  mains. Le métier n'a plus de secret pour vous.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--brass-300)",
                    margin: 0,
                  }}
                >
                  {global.possedees} / {global.total} · catalogue complet
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 64,
                    color: "var(--ink-300)",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  ☆
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 17,
                    color: "var(--ink-500)",
                    margin: "0 0 8px",
                  }}
                >
                  À conquérir : compléter les 6 catalogues à 100 %.
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--brass-700)",
                    margin: 0,
                  }}
                >
                  Progression actuelle : {global.possedees} / {global.total}
                </p>
              </>
            )}
          </div>
        </Panel>

        {/* BROCANTES DÉBLOQUÉES */}
        <Panel
          eyebrow="— terrain conquis —"
          title={`Brocantes débloquées · ${totalDebloquees} / ${BROCANTES.length}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([1, 2, 3, 4] as const).map((tier) => {
              const list = brocantesParTier(tier);
              const dejaSet = debloqueesParTier.get(tier)!;
              return (
                <div key={tier}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--forest-800)",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {Array.from({ length: tier }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          fill="var(--brass-500)"
                          color="var(--brass-700)"
                          strokeWidth={1}
                        />
                      ))}
                    </span>
                    <span style={{ marginLeft: 4 }}>
                      {tier === 4 ? "Le Salon ultime" : `Tier ${tier}`}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--brass-700)",
                      }}
                    >
                      {dejaSet.size} / {list.length}
                    </span>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 6,
                    }}
                  >
                    {list.map((b) => {
                      const debloquee = dejaSet.has(b.id);
                      return (
                        <li
                          key={b.id}
                          style={{
                            padding: "8px 12px",
                            background: debloquee
                              ? "var(--paper-100)"
                              : "var(--paper-300)",
                            border: `1px solid ${
                              debloquee ? "var(--brass-500)" : "var(--paper-500)"
                            }`,
                            fontFamily: "var(--font-display)",
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: debloquee
                              ? "var(--forest-800)"
                              : "var(--ink-300)",
                            opacity: debloquee ? 1 : 0.5,
                          }}
                        >
                          {b.nom}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* LÉGENDAIRES POSSÉDÉS */}
        <Panel
          eyebrow="— vitrine personnelle —"
          title={`Légendaires possédés · ${legendairesPossedees.length}`}
        >
          {legendairesPossedees.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "20px 0",
                margin: 0,
              }}
            >
              Aucun légendaire dans votre vitrine, pour l'instant.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {legendairesPossedees.map((l) => (
                <li
                  key={l.templateId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--paper-300)",
                    border: "1px solid var(--brass-500)",
                  }}
                >
                  <CategorieIcon
                    categorie={l.categorie}
                    size={18}
                    color="var(--brass-700)"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--forest-800)",
                        lineHeight: 1.2,
                      }}
                    >
                      {l.nom}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <RareteBadge rarete="legendaire" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* PROGRESSION PAR CATÉGORIE */}
        <Panel
          eyebrow="— catalogue —"
          title={`Progression par catégorie · ${global.possedees} / ${global.total}`}
        >
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {CATEGORIES.map((cat, i) => {
              const p = progressionCategorie(state.catalogue, cat);
              const pct = p.total > 0 ? (p.possedees / p.total) * 100 : 0;
              return (
                <li
                  key={cat}
                  style={{
                    padding: "10px 0",
                    borderBottom:
                      i < CATEGORIES.length - 1
                        ? "1px dotted var(--paper-500)"
                        : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CategorieIcon categorie={cat} size={14} color="var(--brass-700)" />
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--forest-800)",
                      }}
                    >
                      {cat}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--brass-700)",
                      }}
                    >
                      {p.possedees} / {p.total}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      background: "var(--paper-300)",
                      border: "1px solid var(--paper-500)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--brass-500)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.

Run: `curl -s -o /dev/null -w "/trophees %{http_code}\n" http://localhost:3000/trophees`
Expected : 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/trophees/page.tsx
git commit -m "feat(trophees): salle des trophées — accomplissements + Trophée du Chineur ultime"
```

---

## Task 6 : QG — bouton vers `/trophees`

**Files:**
- Modify: `src/app/qg/page.tsx`

- [ ] **Step 1 : Ajouter un bouton secondaire vers `/trophees` dans le panneau Catalogue**

Édite `src/app/qg/page.tsx`. Trouve le panneau Catalogue (cherche `eyebrow="— catalogue des trésors —"`). À l'intérieur de la `<div>` qui contient le `<Button>` *Ouvrir le catalogue*, ajoute un deuxième bouton en dessous.

Trouve le bloc :

```tsx
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => router.push("/catalogue")}
                  >
                    Ouvrir le catalogue
                  </Button>
                </div>
```

Remplace par :

```tsx
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => router.push("/catalogue")}
                  >
                    Ouvrir le catalogue
                  </Button>
                  {(() => {
                    const aUneTrois =
                      brocantesParTier(3).some((b) =>
                        estDebloquee(b, state, undefined),
                      );
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!aUneTrois}
                        onClick={() => router.push("/trophees")}
                        title={
                          aUneTrois
                            ? "Voir la salle des trophées"
                            : "Débloquez une brocante 3⭐ pour ouvrir la salle"
                        }
                      >
                        Salle des trophées
                      </Button>
                    );
                  })()}
                </div>
```

- [ ] **Step 2 : Importer `brocantesParTier` et `estDebloquee`**

Toujours dans `src/app/qg/page.tsx`, ajoute en haut (à côté des autres imports `@/data/*` et `@/lib/*`) :

```ts
import { brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";
```

Note : `estDebloquee` est appelé sans `brocantesDebloqueesParTier` ici (3ᵉ arg `undefined`). Pour les brocantes 3⭐ courantes (qui requièrent typiquement `brocantesDebloquees: tier 2 nombre 5`), `estDebloquee` retournera `false` car le set est vide. C'est la sémantique voulue : tant que le joueur n'a pas effectivement "vu" une 3⭐ via la page /chiner ou /vitrine (où on calcule debloqueesParTier complet), il n'a pas non plus accès aux trophées. C'est OK pour cette phase, mais une amélioration future pourrait passer ce calcul au QG (et le mémoriser).

**Alternative immédiate plus juste** : calculer `debloqueesParTier` complet au QG également. Pour rester simple ici, on ouvre le bouton dès qu'une 3⭐ est visible — c'est-à-dire dès qu'au moins une 3⭐ apparaît dans le set `debloqueesParTier(3)` calculé localement. Implémentons la version complète, comme dans `/chiner` :

Remplace l'IIFE par :

```tsx
                  {(() => {
                    const dejaParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
                      [1, new Set<string>()],
                      [2, new Set<string>()],
                      [3, new Set<string>()],
                      [4, new Set<string>()],
                    ]);
                    for (const tier of [1, 2, 3, 4] as const) {
                      for (const b of brocantesParTier(tier)) {
                        if (estDebloquee(b, state, dejaParTier)) {
                          dejaParTier.get(tier)!.add(b.id);
                        }
                      }
                    }
                    const aUneTrois = dejaParTier.get(3)!.size > 0;
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!aUneTrois}
                        onClick={() => router.push("/trophees")}
                        title={
                          aUneTrois
                            ? "Voir la salle des trophées"
                            : "Débloquez une brocante 3⭐ pour ouvrir la salle"
                        }
                      >
                        Salle des trophées
                      </Button>
                    );
                  })()}
```

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.

Run :
```bash
for r in /qg /chiner /vitrine /trophees /catalogue /atelier /competences /historique; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"
done
```
Expected : tous 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/qg/page.tsx
git commit -m "feat(qg): trophees link button (disabled until first 3-star brocante unlocked)"
```

---

## Vérification finale (manuelle)

1. **`/chiner`** affiche désormais 4 sections : *Brocantes de quartier (★)*, *Marchés réputés (★★)*, *Salons et galeries (★★★)*, *Le Salon ultime (★★★★)*. Le Salon des Antiquaires est grisé (condition ET : 10 000 € + toutes les 3⭐ débloquées).
2. **`/vitrine`** : idem (sélection).
3. **`/trophees`** : panneau "Trophée du Chineur ultime" affiche un état "À conquérir" en début de partie. Le panneau "Brocantes débloquées" liste les 16 brocantes groupées par tier, avec celles non débloquées grisées. Le panneau "Légendaires possédés" est vide au début. Les barres de progression sont à 0 / total par catégorie.
4. **QG** : panneau Catalogue contient désormais un bouton *Ouvrir le catalogue* + un bouton *Salle des trophées* en dessous (grisé tant qu'aucune 3⭐ n'est débloquée).
5. **Boss déblocage** : avec ~10 000 € en caisse et les 5 brocantes 3⭐ ouvertes, la section *Le Salon ultime* devient cliquable. Le `poolExclusif` permet de tirer le Violon Paganini, le Pong 1972, etc., avec ~18 % de chance par item.
6. **Trophée ultime** : posséder UNE fois tous les templates (commun + rare + légendaire + unique) déclenche le badge *Gloire !* au sommet de `/trophees`.

---

## Self-Review (notes intégrées)

- **Spec coverage** :
  - Spec §2 « Boss » (16ᵉ brocante) → Tasks 1, 2, 3 (extension tier 4, uniques, brocante).
  - Spec §2 « Conditions » du boss (budget + brocantesDebloquees tier 3) → Task 3.
  - Spec §3 « Objets uniques » → Task 2 (6 templates `unique: true`).
  - Spec §7 « Salle des trophées (post-3⭐) » → Tasks 5, 6.
  - Spec §1 « Win condition : 6 catalogues à 100 % » → Task 5 (via `catalogueComplete()`).
- **Placeholders** : aucun TBD/TODO. Tout le code est complet.
- **Type consistency** : `BrocanteTier = 1 | 2 | 3 | 4`, `etoiles: 1|2|3|4`, `Map<1|2|3|4, Set<string>>` cohérent partout (chiner, vitrine, trophees, qg). Le type `brocantesDebloquees` dans `ConditionDeblocage` continue à n'utiliser que `tier: 1|2|3` (intentionnel — pas de raison de compter "brocantes tier 4 débloquées" pour gating).
- **Caveats** :
  - Aucun personnage client tier 4 exclusif n'est ajouté — le boss accepte tous les personas existants (tier ≤ 4). Une future itération pourrait ajouter 2-3 personas "haut de gamme" (Comte de X, Princesse Y).
  - La tolérance des vendeurs ne suit pas encore la prestige tier (cf. caveats Phase 2). Le boss aurait logiquement la négociation la plus dure.
  - Aucune notification narrative quand le boss se débloque — il apparaît juste cliquable dans `/chiner` et `/vitrine`. Pourrait être enrichi en Phase 5.
  - Le QG ne montre pas (encore) la progression `16/16` brocantes ni `Catalogue complet ★` — c'est dans `/trophees`. À enrichir au polish.
