# Carnet — barre de progression, doublon de récompense et fond : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nettoyer l'affichage du carnet de commandes : fond sans lignes, un seul bandeau de récompense par carte, et une ligne de progression qui porte le compteur en son centre et le bouton Livrer à sa droite.

**Architecture:** Trois retouches indépendantes dans les composants de l'overlay carnet. La seule vraie restructuration est dans `CommandeRow` : la ligne de progression sort du `<button>` accordéon (interdiction du bouton imbriqué) et devient un frère pleine largeur, ce qui libère la place du compteur en surimpression et du bouton Livrer.

**Tech Stack:** Next.js / React 19, styles en objets `CSSProperties` inline, i18n maison (`DictionnaireUI`), tests Vitest + Testing Library en environnement jsdom.

## Global Constraints

- Aucun changement de règles de jeu : progression, livrabilité, cérémonie d'envol des jetons et gel/dégel des compteurs du header restent identiques.
- Les `data-testid` `progression-barre` et `progression-compteur` sont conservés tels quels.
- Toute clé i18n supprimée l'est dans les **quatre** dictionnaires (`fr`, `en`, `es`, `el`) — le type `DictionnaireUI` vaut `DeepStrings<typeof fr>`, un oubli casse la compilation.
- Lancer vitest **toujours** avec `--maxWorkers=4` : sans ce drapeau ce poste produit des dizaines de faux échecs par famine de workers.
- Spec de référence : `docs/superpowers/specs/2026-07-30-carnet-barre-progression-design.md`.

## Fichiers touchés

| Fichier | Rôle dans ce plan |
| --- | --- |
| `src/components/mobile/qg/overlays/RegistreOverlay.tsx` | Fond du châssis carnet (tâche 1) |
| `src/components/mobile/qg/overlays/CommandeRow.tsx` | Bandeau en doublon (tâche 2), ligne de progression + bouton Livrer (tâche 3) |
| `src/components/mobile/qg/overlays/CommandeRow.test.tsx` | Tests des tâches 2 et 3 |
| `src/components/mobile/qg/overlays/OngletCommandes.tsx` | Commentaire de la cérémonie (tâche 2) |
| `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` | Adaptation d'un test au bouton désormais visible carte fermée (tâche 3) |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Suppression de `carnet.livrerProgress` (tâche 3) |

---

### Task 1 : Fond du carnet sans lignes

**Files:**
- Modify: `src/components/mobile/qg/overlays/RegistreOverlay.tsx:61-79` (constante `carnetChassis`)

**Interfaces:**
- Consumes: rien.
- Produces: rien — changement purement visuel, aucune API touchée.

**Note sur l'absence de test :** `background-image` avec des dégradés n'est pas exploitable en jsdom (le parseur CSS de l'environnement de test ne conserve pas la valeur), un test d'assertion sur ce style serait vide de sens. Cette tâche est couverte par la relecture du diff et la recette visuelle de fin de plan.

- [ ] **Step 1: Retirer la couche de lignes**

Dans `RegistreOverlay.tsx`, remplacer la constante `carnetChassis` par :

```ts
const carnetChassis: CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 0,
  backgroundColor: "#f4e9cd",
  backgroundImage: "linear-gradient(180deg, #f4e9cd 0%, #ecdfb6 100%)",
  backgroundRepeat: "no-repeat",
  border: "2px solid #6e1f1f",
  borderRadius: 4,
  boxShadow: "inset 0 0 30px rgba(120, 60, 40, 0.15), 0 14px 28px rgba(0,0,0,0.4)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};
```

Le commentaire « deux couches : lignes horizontales pâles (tile 24px) + dégradé crème de base. » et la propriété `backgroundSize` disparaissent avec la couche qu'ils décrivaient.

- [ ] **Step 2: Vérifier la non-régression de l'overlay**

Run: `npx vitest run src/components/mobile/qg/overlays/RegistreOverlay.test.tsx --maxWorkers=4`
Expected: PASS (5 tests) — les tests portent sur le contenu, pas sur le fond, ils doivent rester verts.

- [ ] **Step 3: Commit**

```bash
git add src/components/mobile/qg/overlays/RegistreOverlay.tsx
git commit -m "style(carnet): fond du carnet sans les lignes du papier"
```

---

### Task 2 : Un seul bandeau de récompense par carte

**Files:**
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx:273-274` (second `RecompenseJetons`)
- Modify: `src/components/mobile/qg/overlays/OngletCommandes.tsx:271-277` (commentaire de l'envol)
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx`

**Interfaces:**
- Consumes: `RecompenseJetons` (inchangé), qui rend un `data-testid="jeton-argent"` / `"jeton-xp"` / `"jeton-energie"` par jeton non nul.
- Produces: une carte dépliée ne contient plus qu'**une** instance de chaque `data-jeton` — invariant sur lequel s'appuie la cérémonie d'envol.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `CommandeRow.test.tsx`, à la suite du test « bandeau récompense : jetons argent + xp… » :

```tsx
  it("carte dépliée : un seul bandeau de récompense (plus de doublon)", () => {
    const state = createMockGameState({ missions: [{ courrierId: "m1", statut: "active" }] });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getAllByTestId("jeton-argent").length).toBe(1);
    expect(screen.getAllByTestId("jeton-xp").length).toBe(1);
  });
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx --maxWorkers=4`
Expected: FAIL sur le nouveau test — `expected 2 to be 1` (le bandeau du panneau déplié fait doublon).

- [ ] **Step 3: Supprimer le bandeau du panneau déplié**

Dans `CommandeRow.tsx`, à l'intérieur du bloc `{ouvert && (…)}`, supprimer ces deux lignes situées juste après la liste des objectifs chiffrés et juste avant le `<div>` du bouton Livrer :

```tsx
          <RecompenseJetons recompense={rEff} variante="bandeau"
            label={bandeauPret ? d.carnet.pret : d.carnet.recompenseLabel} allume={bandeauPret} />
```

Le `RecompenseJetons` de la carte repliée (celui qui suit immédiatement le `<button style={row}>`) est **conservé**.

- [ ] **Step 4: Lancer le test pour le voir passer**

Run: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx --maxWorkers=4`
Expected: PASS (11 tests — les 10 existants plus le nouveau).

- [ ] **Step 5: Mettre à jour le commentaire de la cérémonie**

Dans `OngletCommandes.tsx`, à l'intérieur de `lancerLivraison`, la branche `if (etape.type === "envol")` porte ce commentaire devenu faux :

```tsx
          // Carte dépliée = DEUX bandeaux de récompense, donc deux jumeaux par
          // jeton : masquer les deux, sinon le jeton du détail reste visible
          // pendant que son clone s'envole.
```

Le remplacer par :

```tsx
          // Un seul bandeau par carte depuis la refonte, mais on masque toutes
          // les occurrences du jeton : le clone qui s'envole ne doit jamais
          // cohabiter avec son original.
```

Le code (`querySelectorAll` + boucle sur `jumeaux`) reste inchangé : il est correct avec un seul jumeau.

- [ ] **Step 6: Vérifier que la cérémonie reste verte**

Run: `npx vitest run src/components/mobile/qg/overlays/OngletCommandes.test.tsx --maxWorkers=4`
Expected: PASS — la cérémonie masque et fait voler les jetons comme avant.

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx src/components/mobile/qg/overlays/OngletCommandes.tsx
git commit -m "fix(carnet): un seul bandeau de recompense par carte"
```

---

### Task 3 : Compteur dans la barre et bouton Livrer à sa droite

**Files:**
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx` (styles `barreWrap`/`barreFond`/`compteurStyle`, structure JSX, panneau déplié)
- Modify: `src/components/mobile/qg/overlays/CommandeRow.test.tsx` (un test réécrit, deux ajoutés)
- Modify: `src/components/mobile/qg/overlays/OngletCommandes.test.tsx:349-351` (portée du `getByRole`)
- Modify: `src/lib/i18n/ui/fr.ts:583`, `en.ts:574`, `es.ts:575`, `el.ts:582`

**Interfaces:**
- Consumes: `livrable`, `accompli` (= `enCeremonie`), `boutonActif` (= `livrable && !accompli && !livrerVerrouille`), `pct`, `compteur` — tous déjà calculés en haut de `CommandeRow`, aucun calcul nouveau.
- Produces: le bouton Livrer est désormais rendu **hors** du panneau déplié, visible dès que `livrable || accompli`, avec le nom accessible `Livrer` (ou `Prêt ✓` en cérémonie). Les tests qui le cherchaient carte dépliée doivent le trouver carte fermée.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `CommandeRow.test.tsx`, **remplacer** le test existant « grise Livrer si une cible manque » par :

```tsx
  it("n'affiche aucun bouton Livrer si une cible manque", () => {
    const state = createMockGameState({
      inventaireJoueur: [],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.queryByRole("button", { name: /Livrer/ })).toBeNull();
  });
```

Puis **ajouter** ces deux tests à la fin du `describe` :

```tsx
  it("carte fermée et livrable : le bouton Livrer est là, actif", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
    const btn = screen.getByRole("button", { name: "Livrer" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("carte dépliée et livrable : un seul bouton Livrer (plus celui du détail)", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [createMockObjet({ templateId: "ma.lampe_petrole_ancienne", etat: "Très bon", categorie: "Maison" })],
      missions: [{ courrierId: "m1", statut: "active" }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={true} onToggle={() => {}} onLivrer={() => {}} />);
    expect(screen.getAllByRole("button", { name: "Livrer" }).length).toBe(1);
  });

  it("cérémonie en cours : bouton Prêt ✓ verrouillé, hors du panneau déplié", () => {
    const state: GameState = createMockGameState({
      inventaireJoueur: [],
      missions: [{ courrierId: "m1", statut: "livree", jourResolution: 1 }],
    });
    render(<CommandeRow courrier={courrierMission()} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} enCeremonie />);
    const btn = screen.getByRole("button", { name: "Prêt ✓" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId("progression-compteur").textContent).toBe("1/1");
  });
```

Le test « montre le bouton Livrer actif quand toutes les cibles sont réunies » reste tel quel : il passe `ouvert={true}` et cherche `/Livrer/`, ce qui reste vrai après la refonte.

- [ ] **Step 2: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx --maxWorkers=4`
Expected: FAIL — « n'affiche aucun bouton Livrer si une cible manque » trouve encore le bouton grisé du panneau déplié, et « carte fermée et livrable » ne trouve aucun bouton (`Unable to find role="button" and name "Livrer"`).

- [ ] **Step 3: Réécrire les styles de la ligne de progression**

Dans `CommandeRow.tsx`, remplacer les constantes `barreWrap`, `barreFond` et `compteurStyle` par :

```ts
/* Ligne de progression : hors du toggle accordéon (un bouton ne peut pas en
 * contenir un autre), donc pleine largeur sous l'avatar. */
const barreLigne: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "0 12px 10px",
};
const barreFond: CSSProperties = {
  position: "relative",
  flex: 1, height: 18, background: "#e3d7b6", borderRadius: 9, overflow: "hidden",
  boxShadow: "inset 0 1px 2px rgba(110,31,31,0.18)",
};
const barreRemplissage = (pct: number): CSSProperties => ({
  display: "block", width: `${pct}%`, height: "100%",
  background: "linear-gradient(180deg, #d9b45e, #c8a24a)",
  transition: "width 300ms ease",
});
/* Compteur en surimpression, centré : le halo crème le garde lisible aussi
 * bien sur l'or du remplissage que sur le fond vide. */
const compteurStyle: CSSProperties = {
  position: "absolute", inset: 0,
  display: "grid", placeItems: "center",
  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.04em", color: "#6e1f1f", whiteSpace: "nowrap",
  textShadow: "0 1px 0 rgba(255,250,235,0.85)",
  pointerEvents: "none",
};
const boutonLivrer = (accompli: boolean, actif: boolean): CSSProperties => ({
  flex: "0 0 auto",
  background: accompli ? "#2c5e3f" : actif ? "#6e1f1f" : "#b3a06a",
  color: "#f4e9cd", border: "none", borderRadius: 6, padding: "6px 14px",
  fontFamily: "var(--font-display)", fontSize: 11,
  letterSpacing: "0.14em", textTransform: "uppercase",
  cursor: actif ? "pointer" : "default",
  opacity: accompli || actif ? 1 : 0.6,
});
```

`barreRemplissage` est inchangée mais reproduite ici pour que le bloc de styles reste lisible d'un tenant. Ajuster aussi le padding bas de `row` (`padding: "12px 12px 10px"` → `padding: "12px 12px 8px"`), la ligne de progression apportant désormais son propre espacement bas.

- [ ] **Step 4: Sortir la ligne de progression du toggle**

Dans le JSX de `CommandeRow`, **supprimer** ce bloc de la fin de `blocCentral` (juste après les vignettes d'aperçu / le libellé d'objectif) :

```tsx
          <span style={barreWrap}>
            <span style={barreFond}>
              <span data-testid="progression-barre" style={barreRemplissage(pct)} />
            </span>
            <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
          </span>
```

Puis **insérer**, entre la fermeture du `<button style={row}>` et le `<RecompenseJetons>` de la carte repliée :

```tsx
      <div style={barreLigne}>
        <span style={barreFond}>
          <span data-testid="progression-barre" style={barreRemplissage(pct)} />
          <span data-testid="progression-compteur" style={compteurStyle}>{compteur}</span>
        </span>
        {(livrable || accompli) && (
          <button
            type="button"
            onClick={onLivrer}
            disabled={!boutonActif}
            style={boutonLivrer(accompli, boutonActif)}
          >
            {accompli ? d.carnet.pret : d.carnet.livrer}
          </button>
        )}
      </div>
```

- [ ] **Step 5: Supprimer le bouton du panneau déplié**

Toujours dans `CommandeRow.tsx`, à la fin du bloc `{ouvert && (…)}`, supprimer ce `<div>` entier (c'est le dernier enfant du panneau, après la liste des objectifs chiffrés) :

```tsx
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button
              type="button"
              onClick={onLivrer}
              disabled={!boutonActif}
              style={{ /* … styles inline du bouton … */ }}
            >
              {accompli
                ? d.carnet.pret
                : livrable
                ? d.carnet.livrer
                : tr(d.carnet.livrerProgress, { rempli: rempliesObjectifs, total: totalObjectifs })}
            </button>
          </div>
```

`rempliesObjectifs` et `totalObjectifs` restent utilisés plus haut par le calcul de `compteur` : ne pas les supprimer. `tr` reste utilisé par `objetsDemandes`, `etatMin` et `libelleObjectif` : ne pas retirer son import ni sa déstructuration.

- [ ] **Step 6: Lancer les tests de la carte**

Run: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx --maxWorkers=4`
Expected: PASS (14 tests — 11 après la tâche 2, un réécrit, trois ajoutés).

- [ ] **Step 7: Adapter le test de cérémonie concurrente**

Dans `OngletCommandes.test.tsx`, le test « cérémonie de A en cours : le bouton Livrer de B est verrouillé » part de deux commandes **toutes deux livrables**. Le bouton n'existant plus que dans le panneau déplié, `getByRole("button", { name: "Livrer" })` ne trouvait qu'un candidat ; il en trouve maintenant deux et lève « Found multiple elements ».

Importer `within` depuis Testing Library si ce n'est pas déjà fait :

```tsx
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
```

Puis remplacer le premier clic du test :

```tsx
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Livrer" }));
      });
```

par un clic explicitement porté sur la carte A :

```tsx
      const carteA = document.querySelector<HTMLElement>('[data-commande-id="cmd_a"]')!;
      act(() => {
        fireEvent.click(within(carteA).getByRole("button", { name: "Livrer" }));
      });
```

Les assertions suivantes du test restent valides : pendant la cérémonie, A affiche « Prêt ✓ » et B est le seul « Livrer » à l'écran. Le clic intermédiaire sur `/Commande B/` (qui servait à déplier B pour voir son bouton) devient inutile mais reste inoffensif — le laisser en place.

- [ ] **Step 8: Lancer les tests de l'onglet**

Run: `npx vitest run src/components/mobile/qg/overlays/OngletCommandes.test.tsx --maxWorkers=4`
Expected: PASS.

- [ ] **Step 9: Supprimer la clé i18n `livrerProgress`**

Elle n'a plus aucun point d'appel. Supprimer la ligne correspondante dans les quatre dictionnaires, sous la clé `carnet` :

- `src/lib/i18n/ui/fr.ts` : `livrerProgress: "Livrer ({rempli}/{total})",`
- `src/lib/i18n/ui/en.ts` : `livrerProgress: "Deliver ({rempli}/{total})",`
- `src/lib/i18n/ui/es.ts` : `livrerProgress: "Entregar ({rempli}/{total})",`
- `src/lib/i18n/ui/el.ts` : `livrerProgress: "Παράδοση ({rempli}/{total})",`

La clé voisine `livrer` est **conservée** dans les quatre fichiers. Vérifier ensuite qu'il ne reste aucune occurrence :

Run: `grep -rn "livrerProgress" src/`
Expected: aucune sortie.

- [ ] **Step 10: Vérifier types, parité des dictionnaires et suite complète**

Run: `npx tsc --noEmit`
Expected: aucune erreur (le type `DictionnaireUI` dérive de `fr` ; une suppression partielle échouerait ici).

Run: `npx vitest run --maxWorkers=4`
Expected: PASS sur toute la suite, y compris `src/lib/i18n/ui/ui.test.ts` qui contrôle la parité des dictionnaires.

Run: `npx eslint src`
Expected: aucune erreur nouvelle (`npm run lint` est cassé depuis Next 16, utiliser `npx eslint src`).

- [ ] **Step 11: Commit**

```bash
git add src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx src/components/mobile/qg/overlays/OngletCommandes.test.tsx src/lib/i18n/ui
git commit -m "feat(carnet): compteur dans la barre et bouton Livrer a sa droite"
```

---

## Recette visuelle (fin de plan)

À faire une fois les trois tâches commitées, sur `next dev` servi via `localhost` (127.0.0.1 est bloqué : l'app reste figée sur « Ouverture du local… »), un seul `next dev` à la fois.

- [ ] **Step 1: Ouvrir le carnet sur une partie qui a au moins une commande non livrable et une commande livrable**

- [ ] **Step 2: Mesurer plutôt que juger à l'œil**

Relever les `getBoundingClientRect()` de `[data-testid="progression-barre"]` (son parent) sur les deux cartes : la barre de la carte livrable doit être **plus courte** que celle de la carte non livrable, de la largeur du bouton plus le `gap` de 10 px.

- [ ] **Step 3: Contrôler la lisibilité du compteur**

Sur une commande à progression intermédiaire, vérifier que le texte reste lisible là où il chevauche la frontière or / crème.

- [ ] **Step 4: Contrôler le fond**

Aucune ligne horizontale ne doit subsister derrière les cartes, le dégradé crème et la bordure bordeaux sont intacts.
