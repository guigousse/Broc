# Refonte UI du mode étal (vente) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner la page journée de vente sur le mode chinage (header bas Sortir + dock d'atouts, fond brocante flouté, cadres simples) et corriger le bug de la fenêtre info client qui annule la vente en cours.

**Architecture:** `ChineSkillDock` devient `SkillDock` (composant partagé). La page journée passe en layout `100dvh` avec barre du bas en flux (`zIndex: 50`, au-dessus de la sheet) ; `BottomSheet` gagne `bottomOffset` pour s'arrêter au-dessus du dock. Le Boniment est remonté dans la page (l'état `offreJoueur` de `NegociationSheet` est lifté en prop contrôlée). Le bug info vient d'un `pointer-events: none` hérité — fix d'une ligne dans `PersonaInfoOverlay`.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, styles inline `CSSProperties`, vitest + @testing-library/react (jsdom), lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-13-etal-ui-refonte-design.md`

## Global Constraints

- Lint : `npx eslint src` (**`npm run lint` est cassé** — Next 16) et `npm run lint:hooks`.
- Tests : `npx vitest run <fichier>` par tâche, suite complète en fin de plan.
- Niveaux des atouts de vente (source : `src/lib/actives.ts` `NIVEAU_ACTIVES`) : lotGarni 10, boniment 20, criee 30.
- Les webp `public/competences/atout.{lotGarni,boniment,criee}.webp` n'existent pas encore : fallback emoji 🧺 🎩 📣 via `onError` (déjà géré par SkillDock).
- Aucune nouvelle chaîne i18n : réutiliser `d.chine.sortir`, `d.chine.atoutAria`, `d.chine.atoutVerrouilleAria`, `d.chine.atoutVerrouilleToast` et `libelleActive`.
- Styles inline `CSSProperties` en constantes de module, commentaires en français.
- jsdom n'applique pas `pointer-events` : les tests unitaires du fix info assertent le style ; la preuve comportementale viendra du e2e (tâche 7).

---

### Task 1: Renommer `ChineSkillDock` → `SkillDock` (composant partagé)

**Files:**
- Move: `src/components/mobile/chine/ChineSkillDock.tsx` → `src/components/mobile/SkillDock.tsx`
- Move: `src/components/mobile/chine/ChineSkillDock.test.tsx` → `src/components/mobile/SkillDock.test.tsx`
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (import + JSX)

**Interfaces:**
- Produces: `SkillDock({ skills }: { skills: DockSkill[] })` et `type DockSkill` exportés depuis `@/components/mobile/SkillDock` — mêmes champs qu'avant (id, nom, imageSrc, emojiFallback, verrouille, niveauRequis, restants, actif?, desactive?, ariaLabel, onActivate). Consommé par les tâches 6 (vente) et déjà par le chinage.

- [ ] **Step 1: Déplacer les fichiers**

```bash
git mv src/components/mobile/chine/ChineSkillDock.tsx src/components/mobile/SkillDock.tsx
git mv src/components/mobile/chine/ChineSkillDock.test.tsx src/components/mobile/SkillDock.test.tsx
```

- [ ] **Step 2: Renommer le composant**

Dans `src/components/mobile/SkillDock.tsx` :
- `export function ChineSkillDock` → `export function SkillDock`
- Docstring du composant : remplacer « du header bas du mode chinage » par « du header bas (partagé chinage/vente) » dans le commentaire du type ET du composant.

Dans `src/components/mobile/SkillDock.test.tsx` :
- `import { ChineSkillDock, type DockSkill } from "./ChineSkillDock";` → `import { SkillDock, type DockSkill } from "./SkillDock";`
- Toutes les occurrences JSX `<ChineSkillDock` → `<SkillDock` ; le `describe("ChineSkillDock", …)` → `describe("SkillDock", …)`.

- [ ] **Step 3: Mettre à jour le chinage**

Dans `src/app/chiner/[brocanteId]/ClientPage.tsx` :

```ts
import { SkillDock, type DockSkill } from "@/components/mobile/SkillDock";
```

(remplace l'import `ChineSkillDock` depuis `@/components/mobile/chine/ChineSkillDock`), et dans le JSX :

```tsx
            renderDock={(currentItem) => <SkillDock skills={dockSkills(currentItem)} />}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/components/mobile/SkillDock.test.tsx src/components/mobile/chine && npx tsc --noEmit`
Expected: PASS (5 tests SkillDock + tests chine), aucune erreur TS.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/mobile/SkillDock.tsx src/components/mobile/SkillDock.test.tsx src/components/mobile/chine "src/app/chiner/[brocanteId]/ClientPage.tsx"
git commit -m "refactor(ui): ChineSkillDock devient SkillDock, composant partagé chinage/vente"
```

---

### Task 2: Fix du bug info — `PersonaInfoOverlay` intercepte les pointeurs

**Files:**
- Modify: `src/components/mobile/PersonaInfoOverlay.tsx` (style `scrim`, ~ligne 139)
- Test: `src/components/mobile/PersonaInfoOverlay.test.tsx` (nouveau)

**Interfaces:**
- Consumes: rien.
- Produces: comportement — l'overlay info rendu sous le `topDecoration` (`pointerEvents: "none"`) de `BottomSheet` redevient cliquable et n'est plus traversé par les clics.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/PersonaInfoOverlay.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonaInfoOverlay, type PersonaInfo } from "./PersonaInfoOverlay";

afterEach(cleanup);

const info: PersonaInfo = {
  revelePersona: false,
  releveBourse: false,
  oeilAiguise: false,
};

describe("PersonaInfoOverlay", () => {
  it("le scrim force pointer-events: auto (l'overlay vit sous le topDecoration en pointer-events: none — sans ça, tous les clics traversent vers le scrim de la sheet et ferment la vente)", () => {
    render(<PersonaInfoOverlay info={info} onClose={() => {}} />);
    const scrim = screen.getByRole("presentation");
    expect(scrim.style.pointerEvents).toBe("auto");
  });

  it("clic sur la carte : ne ferme pas ; clic sur le scrim : ferme l'overlay", () => {
    const onClose = vi.fn();
    render(<PersonaInfoOverlay info={info} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/PersonaInfoOverlay.test.tsx`
Expected: FAIL — `scrim.style.pointerEvents` vaut `""` (le style n'existe pas). Le 2e test passe déjà (jsdom ignore pointer-events) : c'est attendu.

- [ ] **Step 3: Appliquer le fix**

Dans `src/components/mobile/PersonaInfoOverlay.tsx`, style `scrim` :

```ts
const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  // Rendu sous le topDecoration de BottomSheet (pointerEvents: "none") :
  // sans ré-activation explicite, tous les clics traversent l'overlay et
  // atterrissent sur le scrim de la sheet → la visite client est fermée
  // et la vente perdue.
  pointerEvents: "auto",
};
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/components/mobile/PersonaInfoOverlay.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/PersonaInfoOverlay.tsx src/components/mobile/PersonaInfoOverlay.test.tsx
git commit -m "fix(vente): la fenêtre info client ne ferme plus la vente en cours (pointer-events hérité)"
```

---

### Task 3: `ItemCard` — cadre simple laiton

**Files:**
- Modify: `src/components/ui/ItemCard.tsx` (~lignes 48 et 109)

**Interfaces:**
- Consumes/Produces: aucun changement d'API — changement purement visuel, appliqué globalement (étal + Boîte mystère, seuls consommateurs).

- [ ] **Step 1: Simplifier le cadre principal**

Ligne ~48, supprimer la ligne `boxShadow` du `<article>` (garder la bordure) :

```tsx
      style={{
        background: "var(--paper-100)",
        border: `1.5px solid ${colors.outer}`,
        padding: 6,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: dimmed ? 0.5 : 1,
        ...style,
      }}
```

- [ ] **Step 2: Simplifier le médaillon catégorie**

Ligne ~109, garder l'ombre portée externe mais retirer les liserés incrustés :

```tsx
            boxShadow: `0 1px 2px rgba(0,0,0,0.25)`,
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npx eslint src/components/ui/ItemCard.tsx`
Expected: propre. (Pas de test unitaire — changement visuel, couvert par le e2e/captures de la tâche 7.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ItemCard.tsx
git commit -m "style(ui): ItemCard en cadre simple laiton (suppression du double liseré)"
```

---

### Task 4: `BottomSheet` — prop `bottomOffset`

**Files:**
- Modify: `src/components/mobile/BottomSheet.tsx`
- Test: `src/components/mobile/BottomSheet.test.tsx` (nouveau)

**Interfaces:**
- Produces: `BottomSheet` accepte `bottomOffset?: string` (longueur CSS). La sheet s'arrête à cette hauteur du bas (`bottom: bottomOffset`) et son `paddingBottom` retombe à 16px (le safe-area est déjà sous l'offset). Défaut : comportement actuel inchangé. Consommé par la tâche 5 (pass-through NegociationSheet) et 6 (la page passe la hauteur du dock).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/mobile/BottomSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

afterEach(cleanup);

describe("BottomSheet — bottomOffset", () => {
  it("sans offset : collée en bas (comportement historique)", () => {
    render(
      <BottomSheet open onClose={() => {}}>
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe("0px");
  });

  it("avec offset : la sheet s'arrête au-dessus du dock", () => {
    render(
      <BottomSheet open onClose={() => {}} bottomOffset="calc(71px + var(--safe-bottom))">
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe(
      "calc(71px + var(--safe-bottom))",
    );
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/BottomSheet.test.tsx`
Expected: FAIL — la prop `bottomOffset` n'existe pas (erreur TS au build du test) et/ou `bottom` reste `0px`.

- [ ] **Step 3: Implémenter**

Dans `src/components/mobile/BottomSheet.tsx` :

3a. Ajouter la prop au type et au destructuring :

```ts
  /**
   * Décalage du bord bas (longueur CSS), pour laisser visible une barre fixe
   * sous la sheet (ex : dock d'atouts du mode vente). Le safe-area est censé
   * être géré par la barre en dessous — le paddingBottom retombe à 16px.
   */
  bottomOffset?: string;
```

3b. `sheetWrap` devient paramétrée par l'offset :

```ts
const sheetWrap = (maxHeightPct: number, bottomOffset?: string): CSSProperties => ({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: bottomOffset ?? 0,
  zIndex: 41,
  background: "var(--paper-200)",
  borderTop: "2px solid var(--forest-800)",
  borderRadius: "14px 14px 0 0",
  boxShadow: "0 -6px 18px rgba(40,25,5,0.20)",
  maxHeight: `${maxHeightPct}%`,
  display: "flex",
  flexDirection: "column",
  paddingBottom: bottomOffset ? 16 : "calc(16px + var(--safe-bottom))",
  animation: "broc-slide-up 200ms ease",
  touchAction: "none",
});
```

3c. Au rendu : `style={{ ...sheetWrap(maxHeightPct, bottomOffset), ...dragStyle }}`.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/components/mobile/BottomSheet.test.tsx && npx tsc --noEmit`
Expected: PASS (2 tests), TS propre.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/BottomSheet.tsx src/components/mobile/BottomSheet.test.tsx
git commit -m "feat(ui): BottomSheet.bottomOffset — la sheet peut s'arrêter au-dessus d'une barre fixe"
```

---

### Task 5: `NegociationSheet` contrôlée — offre liftée, atouts retirés

**Files:**
- Modify: `src/components/mobile/NegociationSheet.tsx`
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (call-site)
- Test: `src/components/mobile/NegociationSheet.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `BottomSheet.bottomOffset` (tâche 4).
- Produces: `NegociationSheet` SANS props `boniment`/`lotGarni`, AVEC :
  - `offreJoueur: number` — offre courante du joueur (contrôlée par la page) ;
  - `onChangeOffre: (offre: number) => void` ;
  - `bottomOffset?: string` — pass-through vers `BottomSheet`.
  La tâche 6 s'appuie dessus pour déclencher le Boniment depuis le dock (l'offre vit dans la page).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/mobile/NegociationSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NegociationSheet } from "./NegociationSheet";
import { ouvrirNegociation } from "@/lib/negociation";
import type { NegoPersona } from "@/types/game";

afterEach(cleanup);

const persona: NegoPersona = {
  archetype: "grincheux",
  margePct: 0.1,
  elanPct: 0.25,
  patience: 3,
  tolerancePct: 0.3,
  sangFroid: 0.25,
};

function renderSheet(offreJoueur: number) {
  return render(
    <NegociationSheet
      open
      onClose={() => {}}
      mode="vente"
      persona={persona}
      echelleMax={100}
      cibleSecrete={90}
      prixDepartAdverse={40}
      nego={ouvrirNegociation("vente", 40, 90)}
      onUpdateNego={() => {}}
      onConclu={() => {}}
      onProposerOffre={(n) => n}
      personaInfo={{ revelePersona: false, releveBourse: false, oeilAiguise: false }}
      offreJoueur={offreJoueur}
      onChangeOffre={() => {}}
    />,
  );
}

describe("NegociationSheet — offre contrôlée, atouts déplacés dans le dock", () => {
  it("le bouton Proposer affiche l'offre passée en prop (état contrôlé)", () => {
    renderSheet(80);
    expect(screen.getByText(/Proposer 80/)).toBeTruthy();
  });

  it("n'affiche plus les boutons Lot garni / Boniment (ils vivent dans le dock)", () => {
    renderSheet(80);
    expect(screen.queryByText(/Lot garni/)).toBeNull();
    expect(screen.queryByText(/Boniment/)).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/components/mobile/NegociationSheet.test.tsx`
Expected: FAIL — TS refuse `offreJoueur`/`onChangeOffre` (props inconnues) et exige `boniment`… (le composant actuel a un état interne).

- [ ] **Step 3: Modifier `NegociationSheet.tsx`**

3a. Props : supprimer `boniment` et `lotGarni` (types + destructuring + docstrings) ; ajouter :

```ts
  /** Offre courante du joueur — contrôlée par la page (le dock Boniment en dépend). */
  offreJoueur: number;
  onChangeOffre: (offre: number) => void;
  /** Pass-through vers BottomSheet : laisse le dock d'atouts visible sous la sheet. */
  bottomOffset?: string;
```

3b. Supprimer l'état interne : les constantes `offreInitialeJoueur`, le `useState` d'`offreJoueur` et son `useEffect` de reset (lignes ~98-109). `NegoBar` reçoit `prixJoueur={offreJoueur}` et `onChangeJoueur={onChangeOffre}` ; `handleProposer` utilise la prop `offreJoueur` telle quelle.

3c. Supprimer `handleBoniment` (lignes ~136-148) et tout le bloc `{enCours && (lotGarni || boniment) && (…)}` (lignes ~216-239). Supprimer le style `activeBtnRowStyle` et `btnActiveState` s'ils deviennent orphelins, ainsi que les imports devenus inutiles (`appliquerBoniment` de `@/lib/vitrine`, `libelleActive`). `audioManager` RESTE (utilisé par `handleProposer`).

3d. Passer l'offset : `<BottomSheet open={open} onClose={onClose} title={title} bottomOffset={bottomOffset} …>`.

- [ ] **Step 4: Adapter le call-site (`vitrine/[brocanteId]/journee/ClientPage.tsx`)**

4a. Ajouter l'état à côté de `negoVente` (~ligne 177) :

```ts
  /** Offre courante du joueur dans la négo (liftée : le dock Boniment en dépend). */
  const [offreJoueur, setOffreJoueur] = useState(0);
```

4b. Au spawn d'un client dans le tick (juste après `setClientActuel(ev);`, ~ligne 469) :

```ts
            setOffreJoueur(ev.prixDemande);
```

4c. Dans `handleChoisirLotGarni`, après `setNegoVente(negoNext);` :

```ts
    setOffreJoueur(evNext.prixDemande);
```

4d. Sur le `<NegociationSheet …>` : supprimer les blocs `boniment={…}` et `lotGarni={…}` ; ajouter :

```tsx
          offreJoueur={offreJoueur}
          onChangeOffre={setOffreJoueur}
```

(Le `bottomOffset` sera passé en tâche 6 avec le dock.)

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/components/mobile/NegociationSheet.test.tsx && npx tsc --noEmit && npx eslint src/components/mobile/NegociationSheet.tsx "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"`
Expected: PASS (2 tests), TS et eslint propres.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/NegociationSheet.tsx src/components/mobile/NegociationSheet.test.tsx "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx"
git commit -m "refactor(vente): offre du joueur liftée (sheet contrôlée), boutons Lot garni/Boniment retirés de la sheet"
```

---

### Task 6: Page journée — dock, header bas, fond flouté, suppressions

**Files:**
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`
- Delete: `src/components/mobile/ActionFab.tsx` (plus aucun consommateur après cette tâche — vérifier par grep avant suppression)
- Modify: `src/lib/i18n/ui/fr.ts`, `en.ts`, `es.ts` (purge de la clé orpheline `vente.baisserRideau`)

**Interfaces:**
- Consumes: `SkillDock`/`DockSkill` (tâche 1), `BottomSheet.bottomOffset` via `NegociationSheet` (tâches 4-5), `jouerCriee`/`setLotGarniOuvert` existants, `appliquerBoniment` (`@/lib/vitrine`), `NIVEAU_ACTIVES`/`ActiveId` (`@/lib/actives`), `getBrocanteImageUrl` (`@/lib/brocanteImages`), `useToast` (`@/components/ui/Toast`).
- Produces: page journée avec header bas partagé. Hauteur du dock : `calc(71px + var(--safe-bottom))` (padding 8+8 + cercle 52 + bordure 3).

- [ ] **Step 1: Imports**

Ajouter :

```ts
import { DoorOpen } from "lucide-react";
import { SkillDock, type DockSkill } from "@/components/mobile/SkillDock";
import { appliquerBoniment } from "@/lib/vitrine";           // ← à fusionner dans l'import existant de @/lib/vitrine
import { NIVEAU_ACTIVES, type ActiveId } from "@/lib/actives"; // ← compléter l'import existant
import { audioManager } from "@/lib/audio/audioManager";
import { getBrocanteImageUrl } from "@/lib/brocanteImages";
import { useToast } from "@/components/ui/Toast";
```

Supprimer les imports `ActionFab`, et (après les steps 4-5) `Button`/`DecoDivider` s'ils deviennent orphelins. Dans le corps du composant, ajouter `const { toast } = useToast();`.

- [ ] **Step 2: `jouerBoniment` (après `terminerVisiteClient`, ~ligne 655)**

```ts
  /** Le Boniment (N20) : tentative de closing sur l'offre courante du joueur,
   *  déclenchée depuis le dock. Le sheet se resynchronise via sa prop `nego`. */
  const jouerBoniment = () => {
    const ev = clientActuelRef.current;
    if (!ev || !negoVente || negoVente.statut !== "en_cours") return;
    if (!utiliserActive("boniment")) return;
    const next = appliquerBoniment(negoVente, offreJoueur);
    setNegoVente(next);
    if (next.statut === "conclu") {
      audioManager.playCash();
      setTimeout(() => encaisserVente(ev, next.prixAdverseCourant), 600);
    }
  };
```

- [ ] **Step 3: Constructeur du dock (après `objetsAjoutablesLotGarni`, ~ligne 679)**

```tsx
  /** Les 3 atouts de vente, dans l'ordre de déblocage (cercles du header bas). */
  const dockSkills = (): DockSkill[] => {
    const niveau = state.brocanteur.niveau;
    const commun = (id: Exclude<ActiveId, "diplomate">, emoji: string) => {
      const verrouille = !activeDebloquee(state, id);
      const nom = libelleActive(id, d);
      const restants = usagesRestants(state.activesUtilisees, id, state.jourActuel, niveau);
      return {
        id,
        nom,
        imageSrc: `/competences/atout.${id}.webp`,
        emojiFallback: emoji,
        verrouille,
        niveauRequis: NIVEAU_ACTIVES[id],
        restants,
        ariaLabel: verrouille
          ? tr(d.chine.atoutVerrouilleAria, { nom, niveau: NIVEAU_ACTIVES[id] })
          : tr(d.chine.atoutAria, { nom, restants }),
        onActivate: () => {
          if (verrouille) {
            toast(tr(d.chine.atoutVerrouilleToast, { nom, niveau: NIVEAU_ACTIVES[id] }), { type: "info" });
          }
        },
      };
    };

    const lotGarniSkill = commun("lotGarni", "🧺");
    const bonimentSkill = commun("boniment", "🎩");
    const crieeSkill = commun("criee", "📣");
    const negoEnCours =
      clientActuel?.mode === "negociation" && negoVente?.statut === "en_cours";
    return [
      {
        ...lotGarniSkill,
        desactive:
          !negoEnCours ||
          (clientActuel?.panier.length ?? 0) >= 2 ||
          objetsAjoutablesLotGarni.length === 0,
        onActivate: lotGarniSkill.verrouille
          ? lotGarniSkill.onActivate
          : () => setLotGarniOuvert(true),
      },
      {
        ...bonimentSkill,
        desactive: !negoEnCours,
        onActivate: bonimentSkill.verrouille ? bonimentSkill.onActivate : jouerBoniment,
      },
      {
        ...crieeSkill,
        desactive:
          !!clientActuel ||
          tempsRestant < CRIEE_INTERVALLE_SEC * CRIEE_NB_CLIENTS,
        onActivate: crieeSkill.verrouille ? crieeSkill.onActivate : jouerCriee,
      },
    ];
  };

  const brocanteBg = brocante ? getBrocanteImageUrl(brocante.id) : null;
```

- [ ] **Step 4: Restructurer le rendu**

4a. Racine : `minHeight: "100dvh"` devient un layout figé comme en chinage :

```tsx
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper-100)",
      }}
    >
```

4b. `<main>` : fond flouté + zone scrollable interne. Remplacer l'actuel `<main style={{ flex: 1, overflowY: "auto", padding: … }}>` par :

```tsx
      <main style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {brocanteBg && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `linear-gradient(rgba(15,30,22,0.42), rgba(15,30,22,0.42)), url("${brocanteBg}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(7px)",
              transform: "scale(1.08)",
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            overflowY: "auto",
            padding: "12px 12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* … sections horloge / articles / journal inchangées … */}
        </div>
      </main>
```

Le paragraphe « étal vide » (posé directement sur le fond flouté) passe en clair :

```tsx
              color: "var(--paper-100)",
              textShadow: "0 1px 4px rgba(0,0,0,0.65)",
```

(remplace `color: "var(--ink-500)"`).

4c. Supprimer le bloc Criée de la section horloge (le `{activeDebloquee(state, "criee") && (<div…><Button…/></div>)}`, ~lignes 761-781).

4d. Supprimer le bloc `<ActionFab …/>` (~lignes 906-914).

4e. Ajouter la barre du bas juste après `</main>` (avant le bloc `{clientActuel && …}`) :

```tsx
      {/* Header bas partagé : Sortir + dock d'atouts (zIndex 50 : reste
          visible et actionnable au-dessus de la sheet de négociation). */}
      <div
        style={{
          position: "relative",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--forest-800)",
          borderTop: "3px solid var(--brass-500)",
          padding: "8px 16px calc(8px + var(--safe-bottom))",
        }}
      >
        <button
          type="button"
          aria-label={d.chine.sortir}
          onClick={handleFermerEnAvance}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--brass-300)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(10px, 2.6vw, 12px)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: 0,
          }}
        >
          <DoorOpen size={26} strokeWidth={2} />
          {d.chine.sortir}
        </button>

        <SkillDock skills={dockSkills()} />
      </div>
```

4f. Sur le `<NegociationSheet …>` : ajouter

```tsx
          bottomOffset="calc(71px + var(--safe-bottom))"
```

- [ ] **Step 5: Nettoyage**

5a. Supprimer la fonction morte `FinDeJournee` (~lignes 1185-1228, jamais référencée) et les imports devenus orphelins (`Button`, `DecoDivider` — vérifier qu'aucun autre usage ne reste dans le fichier avant de retirer chaque import).

5b. `grep -rn "ActionFab" src` → si le seul résultat restant est `src/components/mobile/ActionFab.tsx` lui-même : `git rm src/components/mobile/ActionFab.tsx`. Sinon NE PAS supprimer et le signaler.

5c. `grep -rn "baisserRideau" src` → si plus aucun consommateur hors dictionnaires : supprimer la clé `baisserRideau` de la section `vente` des trois dictionnaires (`src/lib/i18n/ui/fr.ts` ~ligne 299, `en.ts`, `es.ts`). Sinon NE PAS supprimer et le signaler.

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit && npx vitest run src/components/mobile src/lib/i18n && npx eslint "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx" src/components/mobile && npm run lint:hooks`
Expected: tout propre, aucun test cassé.

- [ ] **Step 7: Commit**

```bash
git add -A "src/app/vitrine/[brocanteId]/journee/ClientPage.tsx" src/components/mobile/ActionFab.tsx src/lib/i18n/ui
git commit -m "feat(vente): header bas partagé (Sortir + dock d'atouts), fond brocante flouté, ménage FAB/criée/FinDeJournee"
```

---

### Task 7: Vérification finale

**Files:** aucun nouveau.

- [ ] **Step 1: Suite complète + lint + types**

Run: `npx vitest run && npx eslint src && npm run lint:hooks && npx tsc --noEmit`
Expected: tout vert.

- [ ] **Step 2: Vérification end-to-end (skill verify, Playwright, vrai navigateur)**

Dérouler une journée de vente (préparer l'étal → ouvrir l'étal → journée) et vérifier :
1. **Bug info** (le point critique — vrai navigateur obligatoire, jsdom n'applique pas pointer-events) : client présent → ouvrir le « i » → fermer via ✕ puis via le scrim → **la sheet de négociation est toujours là et la transaction reste possible**.
2. Dock : 3 cercles (🧺 🎩 📣 en fallback), verrous selon niveau, toast sur cercle verrouillé.
3. Dock au-dessus de la sheet : pendant une négo, le dock reste visible/cliquable ; Boniment applicable depuis le dock ; Lot garni ouvre le picker ; Criée active hors client seulement.
4. « Sortir » termine la journée (résumé de session).
5. Fond flouté de la brocante visible ; cadres d'items simples (une seule bordure).

- [ ] **Step 3: Commit final éventuel + état de la branche**

```bash
git status
```

Rappel hors périmètre : webp `atout.{lotGarni,boniment,criee}.webp` à générer dans une session d'assets dédiée.
