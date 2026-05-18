# Phase 5 — Polish + Balancing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Affiner l'équilibre mécanique (tolérance vendeur par tier, chance d'exclusif scalée, seuils de déblocage plus accessibles) et ajouter quelques éléments d'UX qui rendent la progression plus lisible et marquante (compteur global brocantes au QG, modale cérémonielle au déblocage du boss).

**Architecture:** Cinq modifications ciblées, toutes locales : 2 dans `lib/chine.ts` (mécaniques de tirage), 1 dans `app/qg/page.tsx` (UX compteur), 1 nouveau composant + 1 nouveau champ `GameState` (modale boss déblocage), 1 réajustement de constantes dans `data/brocantes.ts`. Pas de nouveau routing, pas de nouveau type majeur.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, lucide-react.

**Vérification:** pas de framework de test. `npx tsc --noEmit` + dev server au port 3000 + curl sur les routes impactées.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/chine.ts` | Modify | (Task 1) `instancier` reçoit `tier`, applique la matrice `TOLERANCE_PAR_TIER`. (Task 2) `genererSession` utilise `CHANCE_EXCLUSIF_PAR_TIER[brocante.tier]`. |
| `src/app/qg/page.tsx` | Modify | (Task 3) Compteur `Brocantes : N / 16 débloquées` au panneau Catalogue. (Task 4) Détection boss-déblocage + montage de la modale. |
| `src/types/game.ts` | Modify | (Task 4) Ajouter `bossDebloqueSeen: boolean` à `GameState`. |
| `src/context/GameContext.tsx` | Modify | (Task 4) Initialisation `bossDebloqueSeen: false` dans `nouvellePartie`, migration auto pour anciennes saves, action `marquerBossDebloqueVu()`. |
| `src/components/BossUnlockModal.tsx` | Create | (Task 4) Modale plein écran cérémonielle "Le Salon des Antiquaires vous ouvre ses portes". |
| `src/data/brocantes.ts` | Modify | (Task 5) Calibrage des `conditionDeblocage` (budgets et quotas catégoriels assouplis). |

---

## Task 1 : Tolérance vendeur par tier de brocante

**Files:**
- Modify: `src/lib/chine.ts`

- [ ] **Step 1 : Définir la matrice de tolérance et propager `tier` à `instancier`**

Édite `src/lib/chine.ts`. Trouve le bloc :

```ts
/** Plage du prix min accepté par le vendeur, en % de son prix affiché. */
const TOLERANCE_MIN = 0.7;
const TOLERANCE_MAX = 0.9;
```

Remplace par :

```ts
/**
 * Plages du prix min accepté par le vendeur, en % de son prix affiché.
 * Plus la brocante est prestigieuse, plus les vendeurs sont rigides.
 */
const TOLERANCE_PAR_TIER: Record<1 | 2 | 3 | 4, { min: number; max: number }> = {
  1: { min: 0.70, max: 0.90 },
  2: { min: 0.78, max: 0.92 },
  3: { min: 0.85, max: 0.95 },
  4: { min: 0.90, max: 0.97 },
};
```

Trouve la fonction `instancier` (signature actuelle `function instancier(template: ObjetTemplate, tendances: readonly Tendance[])`). Remplace sa signature et le calcul de tolérance :

```ts
function instancier(
  template: ObjetTemplate,
  tendances: readonly Tendance[],
  tier: 1 | 2 | 3 | 4 = 1,
): ObjetEnVente {
  const etat = pickRandom(ETATS);
  const prixReferenceReel = Math.max(
    1,
    Math.round(template.prixRefBase * FACTEUR_ETAT[etat]),
  );
  const facteurVendeur = 0.6 + Math.random() * 0.8;
  const modTend = modificateurTendance(template.categorie, tendances);
  const prixVendeur = Math.max(
    1,
    Math.round(prixReferenceReel * facteurVendeur * modTend),
  );
  const { min: tolMin, max: tolMax } = TOLERANCE_PAR_TIER[tier];
  const tolerance = tolMin + Math.random() * (tolMax - tolMin);
  const prixMinAccept = Math.max(1, Math.round(prixVendeur * tolerance));

  return {
    id: crypto.randomUUID(),
    objet: {
      id: crypto.randomUUID(),
      templateId: template.templateId,
      nom: template.nom,
      categorie: template.categorie,
      etat,
      prixReferenceReel,
      rarete: template.rarete,
    },
    prixVendeur,
    prixAffiche: Math.random() > 0.4,
    prixMinAccept,
    negociationsTentees: 0,
    statut: "disponible",
  };
}
```

- [ ] **Step 2 : Propager `brocante.tier` dans `genererSession` → `instancier`**

Trouve dans `genererSession` la ligne :

```ts
    items.push(instancier(t, tendances));
```

Remplace par :

```ts
    items.push(instancier(t, tendances, brocante?.tier ?? 1));
```

- [ ] **Step 3 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.
Run: `curl -s -o /dev/null -w "/chiner/vide-grenier-quartier %{http_code}\n" http://localhost:3000/chiner/vide-grenier-quartier`
Expected : 200.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/chine.ts
git commit -m "feat(chine): vendor tolerance scales with brocante tier (1->4 = souple->rigide)"
```

---

## Task 2 : Chance d'exclusif scalée par tier

**Files:**
- Modify: `src/lib/chine.ts`

- [ ] **Step 1 : Remplacer la constante par une matrice**

Édite `src/lib/chine.ts`. Trouve la ligne :

```ts
/** Probabilité par item de tenter un tirage dans le poolExclusif de la brocante. */
const CHANCE_EXCLUSIF = 0.18;
```

Remplace par :

```ts
/**
 * Probabilité par item de tenter un tirage dans le poolExclusif de la brocante.
 * Plus la brocante est prestigieuse, plus l'exclusif est représenté.
 */
const CHANCE_EXCLUSIF_PAR_TIER: Record<1 | 2 | 3 | 4, number> = {
  1: 0.12,
  2: 0.18,
  3: 0.25,
  4: 0.40,
};
```

Trouve dans `genererSession` la ligne :

```ts
    const tenterExclusif =
      exclusifs.length > 0 && Math.random() < CHANCE_EXCLUSIF;
```

Remplace par :

```ts
    const chanceExclusif = CHANCE_EXCLUSIF_PAR_TIER[brocante?.tier ?? 1];
    const tenterExclusif =
      exclusifs.length > 0 && Math.random() < chanceExclusif;
```

- [ ] **Step 2 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.
Run: `curl -s -o /dev/null -w "/chiner/galerie-arts-decoratifs %{http_code}\n" http://localhost:3000/chiner/galerie-arts-decoratifs`
Expected : 200.

- [ ] **Step 3 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/lib/chine.ts
git commit -m "feat(chine): exclusif draw chance scales with tier (12% -> 40% on boss)"
```

---

## Task 3 : QG — compteur global de progression brocantes

**Files:**
- Modify: `src/app/qg/page.tsx`

- [ ] **Step 1 : Refactor — calculer `dejaParTier` une seule fois en haut du composant**

Édite `src/app/qg/page.tsx`. Le composant calcule actuellement `dejaParTier` à l'intérieur de l'IIFE du bouton trophées. On va l'extraire au niveau du composant pour pouvoir le réutiliser dans le compteur.

Trouve le bloc dans le composant `QgPage` qui définit les `useMemo` existants (chercher `categoriesConnuesTendance`). Juste après le dernier `useMemo`, ajoute :

```ts
  const dejaParTier = useMemo(() => {
    const map = new Map<1 | 2 | 3 | 4, Set<string>>([
      [1, new Set<string>()],
      [2, new Set<string>()],
      [3, new Set<string>()],
      [4, new Set<string>()],
    ]);
    if (!state) return map;
    for (const tier of [1, 2, 3, 4] as const) {
      for (const b of brocantesParTier(tier)) {
        if (estDebloquee(b, state, map)) {
          map.get(tier)!.add(b.id);
        }
      }
    }
    return map;
  }, [state]);

  const totalBrocantesDebloquees =
    dejaParTier.get(1)!.size +
    dejaParTier.get(2)!.size +
    dejaParTier.get(3)!.size +
    dejaParTier.get(4)!.size;
```

- [ ] **Step 2 : Remplacer l'IIFE du bouton trophées pour utiliser le `dejaParTier` extrait**

Trouve l'IIFE qui calcule `dejaParTier` à l'intérieur du panneau Catalogue (l'IIFE actuelle dans le rendu du bouton trophées) :

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

Remplace par :

```tsx
                  {(() => {
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

- [ ] **Step 3 : Ajouter le compteur dans le panneau Catalogue**

Toujours dans `src/app/qg/page.tsx`. Trouve dans le panneau Catalogue le `<p>` qui affiche le statut catalogue (cherche `"Aucune compétence acquise"` — non, c'est le panneau compétences. Le panneau Catalogue contient `"Aucune compétence acquise"` non plus. Il contient `state.competencesDebloquees.length === 0 ?` non. Le panneau Catalogue contient `cat.possedees === 0 ?`). Donc cherche la chaîne `"Vous n'avez encore rien collectionné."` :

```tsx
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--ink-500)",
                    fontSize: 14,
                    margin: "0 0 12px",
                    textAlign: "center",
                  }}
                >
                  {cat.possedees === 0
                    ? "Vous n'avez encore rien collectionné."
                    : cat.possedees === cat.total
                      ? "Toutes les pièces sont entre vos mains."
                      : `${cat.vues} pièce${cat.vues > 1 ? "s" : ""} aperçue${cat.vues > 1 ? "s" : ""}, ${cat.possedees} acquise${cat.possedees > 1 ? "s" : ""}.`}
                </p>
```

Juste APRÈS ce `</p>` et AVANT la `<div>` qui contient les boutons, ajoute :

```tsx
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--brass-700)",
                    margin: "0 0 12px",
                    textAlign: "center",
                  }}
                >
                  Brocantes : {totalBrocantesDebloquees} / 16 débloquées
                </p>
```

- [ ] **Step 4 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.
Run: `curl -s -o /dev/null -w "/qg %{http_code}\n" http://localhost:3000/qg`
Expected : 200.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/app/qg/page.tsx
git commit -m "feat(qg): brocantes counter N/16 in catalogue panel, refactor dejaParTier"
```

---

## Task 4 : Modale cérémonielle au déblocage du boss

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/context/GameContext.tsx`
- Create: `src/components/BossUnlockModal.tsx`
- Modify: `src/app/qg/page.tsx`

- [ ] **Step 1 : Ajouter `bossDebloqueSeen` à `GameState`**

Édite `src/types/game.ts`. Trouve l'interface `GameState`. Ajoute en dernière propriété (juste avant la fermeture `}` de l'interface) :

```ts
  /** Vrai si la modale d'annonce du déblocage du boss a déjà été montrée. */
  bossDebloqueSeen: boolean;
```

- [ ] **Step 2 : Initialiser `bossDebloqueSeen: false` dans `nouvellePartie` + migration auto + action `marquerBossDebloqueVu`**

Édite `src/context/GameContext.tsx`. 

**2a** — Dans `interface GameContextValue`, ajoute en dernière propriété (juste avant la fermeture `}`) :

```ts
  marquerBossDebloqueVu: () => void;
```

**2b** — Dans la fonction `nouvellePartie`, à la fin de l'objet passé à `setState`, ajoute :

```ts
      bossDebloqueSeen: false,
```

**2c** — Dans `migrerSauvegarde`, à la fin du `return { ... }` ajoute :

```ts
    bossDebloqueSeen: loaded.bossDebloqueSeen ?? false,
```

**2d** — À côté des autres `useCallback` d'actions context (par exemple après `enregistrerSession` ou ouvrirVitrine), ajoute :

```ts
  const marquerBossDebloqueVu = useCallback(() => {
    setState((prev) =>
      prev && !prev.bossDebloqueSeen
        ? { ...prev, bossDebloqueSeen: true }
        : prev,
    );
  }, []);
```

**2e** — Dans le `value` du `useMemo` du provider, ajoute `marquerBossDebloqueVu` (avant la `}` de l'objet) et à la liste des dépendances du `useMemo` également.

- [ ] **Step 3 : Créer le composant `BossUnlockModal`**

Crée `src/components/BossUnlockModal.tsx` :

```tsx
"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DecoDivider } from "@/components/ui/DecoDivider";

interface BossUnlockModalProps {
  onClose: () => void;
}

export function BossUnlockModal({ onClose }: BossUnlockModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15, 30, 22, 0.85)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "var(--forest-800)",
          border: "2px solid var(--brass-500)",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow:
            "0 0 0 6px rgba(0,0,0,0.4), 0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            marginBottom: 20,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Star
              key={i}
              size={24}
              fill="var(--brass-300)"
              color="var(--brass-500)"
              strokeWidth={1}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--brass-300)",
            marginBottom: 12,
          }}
        >
          — annonce officielle —
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--paper-100)",
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}
        >
          Le Salon des Antiquaires
          <br />
          vous ouvre ses portes
        </h2>
        <DecoDivider />
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--paper-200)",
            margin: "18px 0 24px",
            lineHeight: 1.5,
          }}
        >
          Drouot vous a remarqué. Les pièces uniques de votre catalogue n'attendent
          plus que vous.
        </p>
        <Button variant="primary" size="lg" onClick={onClose}>
          Entrer dans la légende
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Monter la modale dans le QG quand boss devient débloqué**

Édite `src/app/qg/page.tsx`. En haut, ajoute aux imports `@/components/*` :

```ts
import { BossUnlockModal } from "@/components/BossUnlockModal";
```

Dans le composant `QgPage`, après les `useMemo` existants (y compris le `dejaParTier` ajouté en Task 3), ajoute :

```ts
  const { marquerBossDebloqueVu } = useGame();
  const bossEstDebloque = dejaParTier.get(4)!.size > 0;
  const montrerModale = bossEstDebloque && state !== null && !state.bossDebloqueSeen;
```

Note : `useGame()` est déjà appelé en haut du composant. Cherche la ligne `const { state, isHydrated, ajusterBudget } = useGame();` et ajoute simplement `marquerBossDebloqueVu` à la déstructuration au lieu d'un second appel à `useGame()` :

```ts
  const { state, isHydrated, ajusterBudget, marquerBossDebloqueVu } = useGame();
```

Et donc retire la ligne `const { marquerBossDebloqueVu } = useGame();` ajoutée précédemment — la déstructuration unifiée suffit.

Puis dans le rendu, à la TOUTE FIN du composant (avant la fermeture `</div>` racine), insère :

```tsx
      {montrerModale && (
        <BossUnlockModal onClose={marquerBossDebloqueVu} />
      )}
```

- [ ] **Step 5 : Type-check + curl**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.
Run: `curl -s -o /dev/null -w "/qg %{http_code}\n" http://localhost:3000/qg`
Expected : 200.

- [ ] **Step 6 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/types/game.ts src/context/GameContext.tsx src/components/BossUnlockModal.tsx src/app/qg/page.tsx
git commit -m "feat(qg): ceremonial modal when boss brocante first becomes available"
```

---

## Task 5 : Calibrage des seuils de déblocage

**Files:**
- Modify: `src/data/brocantes.ts`

- [ ] **Step 1 : Réajuster les `conditionDeblocage` des brocantes 1⭐**

Édite `src/data/brocantes.ts`. Trouve la brocante `bouquinerie-plein-air` et change sa `conditionDeblocage` :

```ts
    conditionDeblocage: { type: "budget", montant: 150 },
```

Pour `vide-dressing-centre` :

```ts
    conditionDeblocage: { type: "budget", montant: 200 },
```

Pour `brocante-club-jeux` :

```ts
    conditionDeblocage: { type: "budget", montant: 250 },
```

- [ ] **Step 2 : Réajuster les 2⭐**

Pour `deballage-collectionneurs`, remplace son `conditionDeblocage` par :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 800 },
        { type: "brocantesDebloquees", tier: 1, nombre: 3 },
      ],
    },
```

Pour `marche-saint-ouen` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1200 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 4 },
      ],
    },
```

Pour `disquaire-independant` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1000 },
        { type: "ventesCategorie", categorie: "Musique", nombre: 3 },
      ],
    },
```

Pour `atelier-bricoleur` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 900 },
        { type: "ventesCategorie", categorie: "Bricolage", nombre: 3 },
      ],
    },
```

Pour `marche-antiquaires-bibelots` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 1200 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 4 },
      ],
    },
```

- [ ] **Step 3 : Réajuster les 3⭐**

Pour `foire-chatou` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 2500 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
```

Pour `salon-grands-collectionneurs` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 4000 },
        { type: "brocantesDebloquees", tier: 2, nombre: 5 },
      ],
    },
```

Pour `drouot-mode-couture` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 3000 },
        { type: "ventesCategorie", categorie: "Mode", nombre: 8 },
      ],
    },
```

Pour `salon-violon-ancien` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 3500 },
        { type: "ventesCategorie", categorie: "Musique", nombre: 8 },
      ],
    },
```

Pour `galerie-arts-decoratifs` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 4500 },
        { type: "ventesCategorie", categorie: "Maison", nombre: 12 },
      ],
    },
```

- [ ] **Step 4 : Réajuster le boss 4⭐**

Pour `salon-antiquaires-drouot` :

```ts
    conditionDeblocage: {
      type: "ET",
      conditions: [
        { type: "budget", montant: 8000 },
        { type: "brocantesDebloquees", tier: 3, nombre: 5 },
      ],
    },
```

- [ ] **Step 5 : Type-check + curl complet**

Run: `cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc" && npx tsc --noEmit 2>&1 | head -10`
Expected : 0 erreur.

Run :
```bash
for r in /qg /chiner /vitrine /trophees /catalogue /atelier /competences /historique; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000$r"
done
```
Expected : tous 200.

- [ ] **Step 6 : Commit**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git add src/data/brocantes.ts
git commit -m "balance(brocantes): lower unlock thresholds for smoother progression"
```

---

## Vérification finale (manuelle)

1. **Tolérance vendeur** : en chinant dans `vide-grenier-quartier` (1⭐), tu peux espérer descendre jusqu'à ~70 % du prix affiché ; dans `galerie-arts-decoratifs` (3⭐), pas moins de ~85 %.
2. **Chance d'exclusif** : au Salon des Antiquaires (boss tier 4), ~40 % des tirages tentent un objet unique. Dans une 1⭐, c'est plutôt ~12 %.
3. **QG** : panneau Catalogue affiche `Brocantes : N / 16 débloquées` en mono laiton.
4. **Boss unlock** : dès que les conditions sont remplies (8000 € + 5 brocantes 3⭐), au retour suivant sur `/qg`, une modale velours apparaît avec ★★★★ et le titre cérémoniel. Un seul affichage par partie (`bossDebloqueSeen`).
5. **Seuils** : la première brocante 1⭐ spécialisée se débloque dès 150 € (vs 200 € avant). Le boss n'exige plus que 8000 € au lieu de 10 000 €.

---

## Self-Review (notes intégrées)

- **Spec coverage** : tous les points de la Phase 5 du spec sont couverts (balancing seuils + UX polish).
- **Placeholders** : aucun TBD/TODO. Tout le code est complet.
- **Type consistency** : `1 | 2 | 3 | 4` partout pour le tier. La signature `instancier(template, tendances, tier)` reçoit un default `tier = 1` qui couvre le cas où `brocante` n'est pas fourni à `genererSession`.
- **Migration save** : `bossDebloqueSeen: loaded.bossDebloqueSeen ?? false` couvre toutes les anciennes saves — les joueurs qui ont déjà débloqué le boss verront quand même la modale au prochain `/qg` (acceptable, c'est un moment marquant).
- **Idempotence modale** : `marquerBossDebloqueVu` ne fait rien si déjà vrai. La modale se ferme et ne réapparaît plus.
- **Caveat** : la modale s'affiche sur `/qg` uniquement. Si le joueur débloque le boss après une session de vente, il faut revenir au QG pour la voir. Acceptable car le QG est le hub central.
- **Caveat numérique** : les seuils 2⭐/3⭐ assouplis peuvent rendre certaines brocantes plus accessibles que prévu — à itérer après playtest.
