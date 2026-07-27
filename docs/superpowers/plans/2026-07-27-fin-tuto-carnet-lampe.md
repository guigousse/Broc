# Fin du tutoriel : la lampe s'inscrit dans le carnet — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À la fin du tutoriel, le premier chapitre de la trame (« La lampe de mon atelier ») n'est plus délivré par la pastille du grand-père au bureau mais par l'ouverture du carnet de commandes — le dialogue se joue par-dessus le carnet ouvert et la commande s'y inscrit sous les yeux du joueur, dépliée.

**Architecture :** Aucun nouveau système. Le déclencheur UI du chapitre 1 se déplace du `GrandPereBadge` vers un effet du layout QG piloté par l'état existant `miniTutoCarnet` (`"ouvrir" | "termine"`). La règle de déclenchement est extraite en prédicat pur testable dans `src/lib/tutoriel.ts`. `chapitrePret()`, `accepterChapitre()` et `appliquerFinTutoriel()` sont inchangés ; aucun changement de type de sauvegarde, aucune migration.

**Tech Stack :** Next.js (App Router) + React 19, TypeScript, Vitest + @testing-library/react (jsdom), i18n maison (source FR dans `src/data/`, overlays EN/ES/EL dans `src/lib/i18n/contenu/`).

**Spec :** `docs/superpowers/specs/2026-07-27-fin-tuto-carnet-lampe-design.md`

## Global Constraints

- Branche de travail : `fix/pre-appstore` (branche courante, ne pas en créer d'autre).
- `npm run lint` est cassé sur ce projet (Next 16) : utiliser `npx eslint src` (alias `npm run lint:hooks`).
- Tests : `npx vitest run <fichier>` pour un fichier, `npm run test:run` pour la suite complète.
- Règle d'or i18n du projet : **jamais de chaîne localisée en sauvegarde**. Les textes ajoutés ici ne vont que dans `src/data/` (source FR) et les overlays `src/lib/i18n/contenu/{en,es,el}/dialogues.ts`.
- Les overlays i18n de dialogue sont des **tableaux indexés par ligne** : ajouter une ligne au FR impose d'ajouter la ligne au même index dans EN, ES et EL. Le filet `src/lib/i18n/contenu/dialogues.test.ts` vérifie la parité, `dlg_trame_chN` compris.
- Tous les hooks de `QgLayoutInner` doivent précéder son early-return d'hydratation (`if (!isHydrated || !state)`, `src/app/(qg)/layout.tsx:420`) — sinon crash React #310. `npx eslint src` vérifie les rules-of-hooks.
- Commits en français, style `type(scope): sujet`, avec le trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

## Structure des fichiers

| Fichier | Rôle après le changement |
|---|---|
| `src/lib/tutoriel.ts` | Ajoute `chapitreDuCarnetDu()` — prédicat pur : « l'ouverture du carnet doit-elle délivrer le chapitre du grand-père ? » |
| `src/lib/tutoriel.test.ts` | Couvre le nouveau prédicat |
| `src/components/mobile/qg/overlays/OngletCommandes.tsx` | L'accordéon se resynchronise quand `ouvertInitialId` change **après** le montage |
| `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` | Nouveau — couvre cette resynchro |
| `src/app/(qg)/layout.tsx` | Câblage : le tap sur le carnet ouvre le registre, deux effets clôturent le mini-tuto et jouent le dialogue du chapitre, la pastille du grand-père reste éteinte pendant la séquence |
| `src/data/dialogues.ts` | Texte FR : ligne 2 de `tuto_conclusion` retouchée |
| `src/data/quetesPrincipales.ts` | Texte FR : ligne d'amorce en tête du dialogue de `trame_ch1` |
| `src/lib/i18n/contenu/{en,es,el}/dialogues.ts` | Mêmes deux retouches dans les trois overlays |

---

### Task 1 : Prédicat de déclenchement

**Files:**
- Modify: `src/lib/tutoriel.ts` (après `doigtSwipeVersCarnet`, fin de fichier)
- Test: `src/lib/tutoriel.test.ts`

**Interfaces:**
- Consumes: `GameState["miniTutoCarnet"]` (`"ouvrir" | "termine" | undefined`)
- Produces: `chapitreDuCarnetDu(miniTuto: GameState["miniTutoCarnet"], registreOuvert: "commandes" | "comptes" | null): boolean` — consommé par la Task 3

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `src/lib/tutoriel.test.ts`, ajouter `chapitreDuCarnetDu` à l'import depuis `./tutoriel` (l'import existant liste déjà `doigtSwipeVersCarnet`, ordre alphabétique : le mettre juste après `appliquerFinTutoriel`), puis ajouter ce test après celui de `doigtSwipeVersCarnet` (ligne ~55) :

```ts
  it("chapitreDuCarnetDu n'arme le chapitre qu'à l'ouverture de l'onglet Commandes pendant le mini-tuto", () => {
    expect(chapitreDuCarnetDu("ouvrir", "commandes")).toBe(true);
    // Mini-tuto déjà consommé : l'ouverture du carnet ne délivre plus rien.
    expect(chapitreDuCarnetDu("termine", "commandes")).toBe(false);
    expect(chapitreDuCarnetDu(undefined, "commandes")).toBe(false);
    // Autre onglet, ou registre fermé : rien.
    expect(chapitreDuCarnetDu("ouvrir", "comptes")).toBe(false);
    expect(chapitreDuCarnetDu("ouvrir", null)).toBe(false);
  });
```

- [ ] **Step 2 : Vérifier que le test échoue**

Run: `npx vitest run src/lib/tutoriel.test.ts`
Expected: FAIL — erreur de compilation TypeScript / `chapitreDuCarnetDu is not a function` (l'export n'existe pas encore).

- [ ] **Step 3 : Implémenter le prédicat**

À la fin de `src/lib/tutoriel.ts` :

```ts
/**
 * Vrai quand l'ouverture du carnet doit délivrer le chapitre du grand-père.
 * Fin du tutoriel : la main flottante guide jusqu'au carnet, et c'est son
 * ouverture — pas la pastille du bureau — qui déclenche le dialogue de la
 * lampe, dont la commande vient s'inscrire dans la page restée ouverte.
 * Le type du 2e paramètre est écrit en littéral plutôt qu'importé du
 * composant `RegistreOverlay` : `src/lib` ne dépend pas de l'UI.
 */
export function chapitreDuCarnetDu(
  miniTuto: GameState["miniTutoCarnet"],
  registreOuvert: "commandes" | "comptes" | null,
): boolean {
  return miniTuto === "ouvrir" && registreOuvert === "commandes";
}
```

- [ ] **Step 4 : Vérifier que le test passe**

Run: `npx vitest run src/lib/tutoriel.test.ts`
Expected: PASS — tous les tests du fichier verts (9 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/tutoriel.ts src/lib/tutoriel.test.ts
git commit -m "$(cat <<'EOF'
feat(tuto): prédicat d'ouverture du carnet qui délivre le chapitre du grand-père

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Le carnet déplie une commande arrivée après son montage

**Files:**
- Modify: `src/components/mobile/qg/overlays/OngletCommandes.tsx:106-119` (l'effet « badge livrable tapé »)
- Test: `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` (à créer)

**Interfaces:**
- Consumes: prop existante `ouvertInitialId?: string | null` de `OngletCommandes`
- Produces: garantie que `ouvertInitialId` déplie la commande visée même quand il devient non nul **après** le montage — la Task 3 en dépend (le carnet est déjà ouvert quand la commande de la lampe est créée)

**Contexte :** aujourd'hui `const [ouvertId, setOuvertId] = useState(ouvertInitialId ?? null)` ne lit la prop qu'au montage ; l'effet voisin ne fait que le `scrollIntoView`. Dans le nouveau flux le carnet est monté **avant** que la commande existe, donc rien ne se déplie.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/components/mobile/qg/overlays/OngletCommandes.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OngletCommandes } from "./OngletCommandes";
import { courrierDeChapitre } from "@/lib/quetes/principales";
import { chapitreParId } from "@/data/quetesPrincipales";
import { createMockGameState } from "@/lib/__test-fixtures__/gameState";
import type { GameState } from "@/types/game";

afterEach(cleanup);

const livrer = () => ({ ok: true });

/** State avec la commande du chapitre 1 (« La lampe de mon atelier ») active. */
function stateAvecLampe(): GameState {
  const ch = chapitreParId("trame_ch1");
  if (!ch) throw new Error("chapitre trame_ch1 introuvable");
  return createMockGameState({
    courriers: [courrierDeChapitre(ch, 1)],
    missions: [{ courrierId: "trame_ch1", statut: "active" }],
  });
}

describe("OngletCommandes", () => {
  it("déplie la commande dont l'id arrive APRÈS le montage (carnet déjà ouvert)", () => {
    const vide = createMockGameState({ courriers: [], missions: [] });
    const { rerender } = render(
      <OngletCommandes state={vide} onLivrerMission={livrer} ouvertInitialId={null} />,
    );
    // Le grand-père vient d'écrire dans le carnet resté ouvert.
    rerender(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });

  it("déplie aussi la commande passée dès le montage (badge livrable tapé)", () => {
    render(
      <OngletCommandes
        state={stateAvecLampe()}
        onLivrerMission={livrer}
        ouvertInitialId="trame_ch1"
      />,
    );
    const ligne = screen.getByRole("button", { name: /La lampe de mon atelier/ });
    expect(ligne.getAttribute("aria-expanded")).toBe("true");
  });
});
```

- [ ] **Step 2 : Vérifier que le premier test échoue**

Run: `npx vitest run src/components/mobile/qg/overlays/OngletCommandes.test.tsx`
Expected: 1 FAIL / 1 PASS — le premier test échoue (`expected null to be "true"` ou `"false"` : la ligne existe mais reste repliée), le second passe déjà (chemin du montage, déjà couvert par le `useState` initial).

- [ ] **Step 3 : Resynchroniser l'accordéon**

Dans `src/components/mobile/qg/overlays/OngletCommandes.tsx`, l'effet actuel est :

```tsx
  // Badge livrable tapé : amener la commande visée dans la zone visible.
  useEffect(() => {
    if (!ouvertInitialId) return;
    const el = Array.from(document.querySelectorAll<HTMLElement>("[data-commande-id]")).find(
      (n) => n.dataset.commandeId === ouvertInitialId,
    );
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [ouvertInitialId]);
```

Le remplacer par :

```tsx
  // Commande visée (badge livrable tapé, ou commande que le grand-père vient
  // d'inscrire dans le carnet resté ouvert) : la déplier et l'amener dans la
  // zone visible. `ouvertId` étant initialisé au seul montage, la resynchro
  // ici est ce qui couvre le cas « le carnet était déjà ouvert ».
  useEffect(() => {
    if (!ouvertInitialId) return;
    setOuvertId(ouvertInitialId);
    const el = Array.from(document.querySelectorAll<HTMLElement>("[data-commande-id]")).find(
      (n) => n.dataset.commandeId === ouvertInitialId,
    );
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [ouvertInitialId]);
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run: `npx vitest run src/components/mobile/qg/overlays/OngletCommandes.test.tsx`
Expected: PASS — 2 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/qg/overlays/OngletCommandes.tsx src/components/mobile/qg/overlays/OngletCommandes.test.tsx
git commit -m "$(cat <<'EOF'
fix(carnet): déplier une commande arrivée alors que le carnet est déjà ouvert

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Câblage du layout QG

**Files:**
- Modify: `src/app/(qg)/layout.tsx` (import, un état local, deux effets, `QgCarnet.onTap`, `GrandPereBadge.visible`, `DialogueOverlay.onFini`)

**Interfaces:**
- Consumes: `chapitreDuCarnetDu` (Task 1) ; `ouvertInitialId` resynchronisé (Task 2) ; existants `chapitrePret()`, `accepterChapitrePrincipal()`, `terminerMiniTutoCarnet()`
- Produces: rien de réutilisé ailleurs (câblage terminal)

**Contexte utile :** `chapitrePret(state)` renvoie l'objet chapitre **directement issu du tableau module** `QUETES_PRINCIPALES` — son identité est donc stable d'un rendu à l'autre et peut servir de dépendance d'effet sans boucle.

- [ ] **Step 1 : Importer le prédicat**

`src/app/(qg)/layout.tsx:83`. Avant :

```tsx
import { tutorielActif, doigtSwipeVersCarnet } from "@/lib/tutoriel";
```

Après :

```tsx
import { tutorielActif, chapitreDuCarnetDu, doigtSwipeVersCarnet } from "@/lib/tutoriel";
```

(`DialogueSequence` est déjà importé plus haut, ligne 74 — rien à ajouter pour lui.)

- [ ] **Step 2 : Ajouter l'état du dialogue en attente**

Juste après la déclaration de `dialogueChapitreId` (`src/app/(qg)/layout.tsx:169`) :

```tsx
  const [dialogueChapitreId, setDialogueChapitreId] = useState<string | null>(null);
  // Dialogue du chapitre armé par l'ouverture du carnet (fin du tutoriel) :
  // il est joué après un court battement, le temps que le joueur voie la page
  // vide se poser. Stocké à part de `dialogueQg` pour que le minuteur vive
  // dans son propre effet — cf. les deux effets plus bas.
  const [chapitreEnAttente, setChapitreEnAttente] = useState<DialogueSequence | null>(null);
```

`DialogueSequence` est déjà importé dans ce fichier (type de `dialogueQg`).

- [ ] **Step 3 : Ajouter les deux effets**

Juste après l'effet des dialogues automatiques du tutoriel (celui qui se termine par `}, [etape, dialogueQg]);`, `src/app/(qg)/layout.tsx:413-418`) — donc bien **avant** l'early-return d'hydratation :

```tsx
  // Fin du tutoriel : la main a guidé jusqu'au carnet. Son ouverture clôt le
  // mini-tuto ET arme le premier chapitre de la trame (la lampe du grand-père),
  // qui se joue par-dessus le carnet resté ouvert — la commande s'y inscrit à
  // la fin du dialogue. Aucun minuteur ici : `terminerMiniTutoCarnet()` change
  // les dépendances de cet effet, son cleanup tuerait le minuteur avant qu'il
  // ne tire.
  useEffect(() => {
    if (!chapitreDuCarnetDu(state?.miniTutoCarnet, registreOuvert)) return;
    terminerMiniTutoCarnet();
    if (!chPret) return;
    setDialogueChapitreId(chPret.id);
    setChapitreEnAttente({ id: `dlg_${chPret.id}`, lignes: chPret.dialogue });
  }, [state?.miniTutoCarnet, registreOuvert, chPret, terminerMiniTutoCarnet]);

  // Battement avant le dialogue armé ci-dessus : le joueur voit d'abord la
  // page vide du carnet. Dépendance unique et stable → sûr sous StrictMode
  // (le double montage annule puis réarme le minuteur).
  useEffect(() => {
    if (!chapitreEnAttente) return;
    const t = window.setTimeout(() => {
      setDialogueQg(chapitreEnAttente);
      setChapitreEnAttente(null);
    }, 500);
    return () => window.clearTimeout(t);
  }, [chapitreEnAttente]);
```

- [ ] **Step 4 : Le tap sur le carnet ne clôt plus le mini-tuto**

`src/app/(qg)/layout.tsx:490-498`. Avant :

```tsx
                <QgCarnet
                  tutoMain={state.miniTutoCarnet === "ouvrir" && !dialogueQg}
                  onTap={() => {
                    if (tutoActif) return;
                    playClick();
                    terminerMiniTutoCarnet();
                    setRegistreOuvert("commandes");
                  }}
                />
```

Après (la clôture du mini-tuto a migré dans l'effet, qui couvre ainsi tous les points d'entrée du registre) :

```tsx
                <QgCarnet
                  tutoMain={state.miniTutoCarnet === "ouvrir" && !dialogueQg}
                  onTap={() => {
                    if (tutoActif) return;
                    playClick();
                    setRegistreOuvert("commandes");
                  }}
                />
```

- [ ] **Step 5 : Éteindre la pastille du grand-père pendant la séquence**

`src/app/(qg)/layout.tsx:854-862`. Avant :

```tsx
      <GrandPereBadge
        visible={!!chPret && !dialogueQg}
```

Après :

```tsx
      <GrandPereBadge
        visible={
          !!chPret &&
          !dialogueQg &&
          // Chapitre 1 réservé au carnet tant que le mini-tuto de fin de
          // tutoriel n'est pas consommé, puis pendant tout le temps où son
          // dialogue est armé/joué : un seul chemin de délivrance.
          state.miniTutoCarnet !== "ouvrir" &&
          !dialogueChapitreId
        }
```

Le reste des props (`onTap`) est inchangé.

- [ ] **Step 6 : La commande acceptée arrive dépliée**

`src/app/(qg)/layout.tsx:878-886`, dans le `onFini` du `DialogueOverlay`. Avant :

```tsx
          if (dialogueChapitreId) {
            accepterChapitrePrincipal(dialogueChapitreId);
            setDialogueChapitreId(null);
          } else if (etape === "accueil") avancerTutoriel("aller-chiner");
```

Après :

```tsx
          if (dialogueChapitreId) {
            accepterChapitrePrincipal(dialogueChapitreId);
            // Le carnet peut être ouvert derrière le dialogue (fin du
            // tutoriel) : la commande neuve s'y affiche dépliée. Sinon la
            // cible est simplement prête pour la prochaine ouverture.
            setMissionCibleId(dialogueChapitreId);
            setDialogueChapitreId(null);
          } else if (etape === "accueil") avancerTutoriel("aller-chiner");
```

- [ ] **Step 7 : Vérifier types, lint et suite de tests**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint src`
Expected: aucune erreur (notamment aucun avertissement rules-of-hooks ni dépendance d'effet manquante).

Run: `npm run test:run`
Expected: PASS — toute la suite verte (les tests i18n de dialogues sont encore verts, les textes ne bougent qu'en Task 4).

- [ ] **Step 8 : Commit**

```bash
git add "src/app/(qg)/layout.tsx"
git commit -m "$(cat <<'EOF'
feat(tuto): le grand-père délivre la lampe à l'ouverture du carnet

La pastille du bureau reste éteinte jusque-là : le chapitre 1 se joue
par-dessus le carnet ouvert et sa commande s'y inscrit, dépliée.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : Textes (FR source + overlays EN/ES/EL)

**Files:**
- Modify: `src/data/dialogues.ts` (ligne 75, `tuto_conclusion`)
- Modify: `src/data/quetesPrincipales.ts` (ligne ~36, `trame_ch1.dialogue`)
- Modify: `src/lib/i18n/contenu/en/dialogues.ts` (`tuto_conclusion[1]`, `dlg_trame_ch1[0]`)
- Modify: `src/lib/i18n/contenu/es/dialogues.ts` (idem)
- Modify: `src/lib/i18n/contenu/el/dialogues.ts` (idem)
- Test: `src/lib/i18n/contenu/dialogues.test.ts` (filet existant, pas de nouveau test)

**Interfaces:**
- Consumes: rien
- Produces: rien (données)

- [ ] **Step 1 : Retoucher la conclusion du tutoriel (FR)**

`src/data/dialogues.ts`, dans `tuto_conclusion`. Avant :

```ts
      { humeur: "souriant", texte: "Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent — regarde-le souvent." },
```

Après :

```ts
      { humeur: "souriant", texte: "Tiens : mon carnet de commandes. Les gens y notent ce qu'ils cherchent. Ouvre-le donc — j'ai justement quelque chose à y inscrire." },
```

- [ ] **Step 2 : Ajouter l'amorce du chapitre 1 (FR)**

`src/data/quetesPrincipales.ts`, dans `trame_ch1.dialogue`, **en première position** (avant la ligne « Quarante ans que ma vieille lampe à pétrole… ») :

```ts
      { humeur: "souriant", texte: "Ah, tu l'ouvres… Alors écris, petit. La toute première ligne sera pour moi." },
```

- [ ] **Step 3 : Vérifier que le filet i18n échoue**

Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts`
Expected: FAIL — 3 échecs « a le même nombre de lignes que le FR » (EN, ES, EL : `dlg_trame_ch1` a 4 lignes contre 5 en FR).

- [ ] **Step 4 : Traduire en anglais**

`src/lib/i18n/contenu/en/dialogues.ts`.

`tuto_conclusion[1]`, avant :

```ts
    "Here: my order book. People write down what they're looking for — check it often.",
```

après :

```ts
    "Here: my order book. People write down what they're looking for. Go on, open it — I've something to put in it, as it happens.",
```

`dlg_trame_ch1`, nouvelle ligne **en tête** :

```ts
    "Ah, you're opening it… Then write, lad. The very first line shall be mine.",
```

- [ ] **Step 5 : Traduire en espagnol**

`src/lib/i18n/contenu/es/dialogues.ts`.

`tuto_conclusion[1]`, avant :

```ts
    "Toma: mi cuaderno de encargos. La gente apunta lo que busca — míralo a menudo.",
```

après :

```ts
    "Toma: mi cuaderno de encargos. La gente apunta lo que busca. Ábrelo, anda — justo tengo algo que apuntar en él.",
```

`dlg_trame_ch1`, nouvelle ligne **en tête** :

```ts
    "Ah, lo abres… Pues escribe, muchacho. La primerísima línea será para mí.",
```

- [ ] **Step 6 : Traduire en grec**

`src/lib/i18n/contenu/el/dialogues.ts`.

`tuto_conclusion[1]`, avant :

```ts
    "Ορίστε: το τετράδιο παραγγελιών μου. Ο κόσμος σημειώνει εκεί τι ψάχνει — κοίταξέ το συχνά.",
```

après :

```ts
    "Ορίστε: το τετράδιο παραγγελιών μου. Ο κόσμος σημειώνει εκεί τι ψάχνει. Άνοιξέ το λοιπόν — έχω κάτι να γράψω μέσα.",
```

`dlg_trame_ch1`, nouvelle ligne **en tête** :

```ts
    "Α, το ανοίγεις… Τότε γράψε, μικρέ. Η πρώτη πρώτη γραμμή θα είναι δική μου.",
```

- [ ] **Step 7 : Vérifier que le filet i18n passe**

Run: `npx vitest run src/lib/i18n/contenu/dialogues.test.ts src/data/dialogues.test.ts`
Expected: PASS — tous verts (couverture, absence d'orphelins, parité des lignes dans les 3 langues).

- [ ] **Step 8 : Commit**

```bash
git add src/data/dialogues.ts src/data/quetesPrincipales.ts src/lib/i18n/contenu/en/dialogues.ts src/lib/i18n/contenu/es/dialogues.ts src/lib/i18n/contenu/el/dialogues.ts
git commit -m "$(cat <<'EOF'
feat(tuto): le grand-père invite à ouvrir le carnet et y écrit la première ligne

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : Vérification d'ensemble

**Files:** aucun (vérification seule ; corriger sur place si un filet casse)

- [ ] **Step 1 : Suite complète**

Run: `npm run test:run`
Expected: PASS — aucune régression. En particulier `src/lib/tutoriel.test.ts` (le mini-tuto est toujours armé par `appliquerFinTutoriel`), `src/lib/i18n/contenu/dialogues.test.ts`, `src/components/mobile/qg/overlays/CommandeRow.test.tsx`.

- [ ] **Step 2 : Types + lint**

Run: `npx tsc --noEmit && npx eslint src`
Expected: aucune sortie d'erreur.

- [ ] **Step 3 : Build**

Run: `npm run build`
Expected: build Next réussi.

- [ ] **Step 4 : Recette manuelle (à faire tourner par Guillaume)**

Nouvelle partie → jouer le tutoriel jusqu'à la conclusion, puis vérifier dans l'ordre :

1. Le grand-père dit « …Ouvre-le donc — j'ai justement quelque chose à y inscrire. »
2. La main flottante pousse vers la zone gauche, puis se pose sur le carnet ; **aucune pastille « ! » sur le grand-père**.
3. Tap sur le carnet → le registre s'ouvre sur l'onglet Commandes, page vide, pendant ~une demi-seconde.
4. Le dialogue de la lampe démarre par-dessus le carnet, portrait du grand-père visible, carnet lisible derrière.
5. Fin du dialogue → « La lampe de mon atelier » apparaît dans le carnet resté ouvert, **dépliée**, objectif visible.
6. Fermer le carnet, le rouvrir : la commande est toujours là, la pastille « ! » du grand-père reste éteinte (chapitre 2 pas encore dû).
7. Mettre l'app en arrière-plan pendant l'étape 3 puis revenir : la séquence ne se bloque pas (soit le dialogue se joue, soit le carnet reste utilisable et la commande est délivrable par la pastille au rechargement).

---

## Notes de vérification

- Le seul autre point d'ouverture du registre est `LivrablesBadges` (`src/app/(qg)/layout.tsx:863-873`), gaté sur `!tutoActif` **et** sur l'existence d'une commande livrable — inatteignable au moment du mini-tuto. La règle vit malgré tout dans un effet sur `registreOuvert`, donc elle est indépendante du point d'entrée.
- `missionCibleId` est remis à `null` à la fermeture du registre (`onClose`), rien à nettoyer en plus.
- Aucune migration de sauvegarde : `miniTutoCarnet` garde `"ouvrir" | "termine"`. Une partie sauvegardée en plein mini-tuto reprend la nouvelle mise en scène ; une partie plus avancée ne voit rien changer.
