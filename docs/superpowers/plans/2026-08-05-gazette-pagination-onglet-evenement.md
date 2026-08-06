# Gazette multi-pages & onglet Événement — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paginer la gazette quand son contenu déborde du papier, et donner à la Grande Braderie une 5ᵉ scène/plaque « Événement » dédiée dans le panorama des brocantes.

**Architecture:** (A) Les sections du journal deviennent des blocs insécables mesurés au montage ; une fonction pure `paginerSections` les répartit en pages ; un coin corné feuillette. (B) La couche panorama passe de `BrocanteTier` à `SceneId = BrocanteTier | "evenement"` ; la scène et la plaque événement n'existent que si la liste de brocantes (déjà filtrée par jour) contient la braderie ; le cadre braderie déménage de la scène 1 vers la scène dédiée au fond festif.

**Tech Stack:** Next.js/React (styles inline, container queries cqw), vitest + testing-library, pipeline Gemini scènes.

**Spec:** `docs/superpowers/specs/2026-08-05-gazette-pagination-onglet-evenement-design.md`
**Branche:** `feat/evenements-calendaires` (continuation — ne pas créer de nouvelle branche).

## Global Constraints

- Code, commentaires, commits en **français**.
- **`npx vitest run --maxWorkers=4`** obligatoire (faux échecs sinon sur ce Mac) ; `npx tsc --noEmit` et `npx eslint src` à zéro avant chaque commit.
- Toute clé ajoutée à `src/lib/i18n/ui/fr.ts` est obligatoire dans en/es/el (type `DeepStrings` bloquant).
- Styles : inline `CSSProperties` comme le reste du dossier ; les `@keyframes` de l'aura vont dans un `<style>` inline du composant, PAS dans `globals.css` (piège connu : `next dev` peut servir un globals.css périmé).
- Le type `Brocante` et la save ne changent pas (la braderie reste `tier: 4`).
- Vérification visuelle : dev server sur `http://localhost:3000` exclusivement (127.0.0.1 fige l'app), un seul `next dev`, mesurer les rects (pas d'appréciation à l'œil), `rm -rf .next` si style fantôme.

---

### Task 1: Fonction pure `paginerSections`

**Files:**
- Create: `src/lib/gazettePagination.ts`
- Test: `src/lib/gazettePagination.test.ts`

**Interfaces:**
- Produit : `paginerSections(hauteurs: readonly number[], hauteurDisponible: number): number[][]` — indices de sections groupés par page, ordre préservé. Consommée par la Task 2.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/gazettePagination.test.ts
import { describe, expect, it } from "vitest";
import { paginerSections } from "@/lib/gazettePagination";

describe("paginerSections", () => {
  it("tout tient sur une page", () => {
    expect(paginerSections([100, 150, 80], 400)).toEqual([[0, 1, 2]]);
  });

  it("déborde → la section qui ne rentre plus ouvre la page suivante", () => {
    expect(paginerSections([200, 150, 120], 400)).toEqual([[0, 1], [2]]);
  });

  it("une section plus haute qu'une page obtient sa page dédiée", () => {
    expect(paginerSections([500, 100], 400)).toEqual([[0], [1]]);
    // Même géante en milieu de liste, et la suivante repart sur une page neuve
    expect(paginerSections([100, 500, 100], 400)).toEqual([[0], [1], [2]]);
  });

  it("jamais de page vide : liste vide → une seule page vide", () => {
    expect(paginerSections([], 400)).toEqual([[]]);
  });

  it("hauteurs nulles (jsdom) → tout sur une page", () => {
    expect(paginerSections([0, 0, 0], 400)).toEqual([[0, 1, 2]]);
  });

  it("hauteurDisponible non positive → tout sur une page (garde-fou)", () => {
    expect(paginerSections([100, 100], 0)).toEqual([[0, 1]]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/lib/gazettePagination.test.ts`
Attendu : FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
// src/lib/gazettePagination.ts
/**
 * Répartition des sections de la gazette en pages (spec
 * 2026-08-05-gazette-pagination-onglet-evenement).
 *
 * Remplissage glouton dans l'ordre : une section est INSÉCABLE ; si elle ne
 * tient plus sur la page courante, elle ouvre la suivante. Une section plus
 * haute qu'une page obtient sa page dédiée (léger débord toléré). Garde-fous
 * jsdom/premier rendu : hauteur disponible non positive → une seule page.
 */
export function paginerSections(
  hauteurs: readonly number[],
  hauteurDisponible: number,
): number[][] {
  if (hauteurs.length === 0) return [[]];
  if (hauteurDisponible <= 0) return [hauteurs.map((_, i) => i)];
  const pages: number[][] = [];
  let courante: number[] = [];
  let reste = hauteurDisponible;
  hauteurs.forEach((h, i) => {
    if (courante.length > 0 && h > reste) {
      pages.push(courante);
      courante = [];
      reste = hauteurDisponible;
    }
    courante.push(i);
    reste -= h;
  });
  pages.push(courante);
  return pages;
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/lib/gazettePagination.test.ts`
Attendu : PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gazettePagination.ts src/lib/gazettePagination.test.ts
git commit -m "feat(gazette): répartition des sections en pages — fonction pure paginerSections"
```

---

### Task 2: GazetteSheet multi-pages (mesure, coin corné, indicateur)

**Files:**
- Modify: `src/components/mobile/GazetteSheet.tsx` (608 l. — corps des sections ~l.377-600 : encart braderie, Carnet mondain, Tendance du marché, Météo de la semaine)
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts` (2 clés aria)
- Test: la suite i18n + `npx tsc --noEmit` (pas de test de rendu — les sheets n'en ont pas ; jsdom mesure 0 → garde-fou de la Task 1 garantit « tout sur une page », donc aucun test existant ne casse)

**Interfaces:**
- Consomme : `paginerSections(hauteurs, hauteurDisponible)` (Task 1).
- Produit : rien pour les autres tâches (UI terminale).

- [ ] **Step 1: Restructurer le corps en liste de sections**

Dans `GazetteSheet.tsx`, sans changer le JSX interne d'aucun bloc, construire (avant le `return`) un tableau ordonné des sections du corps ; chaque entrée = le JSX actuel du bloc (braderie conditionnelle, carnet mondain, tendances, météo), avec sa `key` :

```tsx
const sections: { key: string; node: ReactNode }[] = [];
if (prochaineBraderie(jourActuel) - jourActuel <= 7) {
  sections.push({ key: "braderie", node: /* bloc braderie existant, SeparateurArtDeco inclus */ });
}
sections.push({ key: "carnet", node: /* bloc Carnet mondain existant */ });
sections.push({ key: "tendances", node: /* bloc Tendance du marché existant */ });
sections.push({ key: "meteo", node: /* bloc Météo de la semaine existant */ });
```

L'en-tête du journal (titre, numéro, semaine) reste HORS des sections : il s'affiche sur toutes les pages.

- [ ] **Step 2: Passe de mesure + état de pagination**

```tsx
const [pages, setPages] = useState<number[][]>([sections.map((_, i) => i)]);
const [pageIndex, setPageIndex] = useState(0);
const mesureRefs = useRef<(HTMLDivElement | null)[]>([]);
const corpsRef = useRef<HTMLDivElement>(null); // zone sous l'en-tête

// Clé de contenu : re-mesurer quand la composition change (ouverture, langue,
// présence de l'encart braderie ou de la célébrité).
const contenuKey = `${open}|${locale}|${sections.map((s) => s.key).join(",")}`;
useLayoutEffect(() => {
  if (!open) return;
  setPageIndex(0);
  const corps = corpsRef.current;
  if (!corps) return;
  const hauteurs = mesureRefs.current
    .slice(0, sections.length)
    .map((el) => el?.offsetHeight ?? 0);
  // Marge basse : 4 % de la hauteur du papier (respiration avant le bord).
  const dispo = corps.clientHeight - corps.clientHeight * 0.04;
  setPages(paginerSections(hauteurs, dispo));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [contenuKey]);
```

Rendu : dans la zone corps (`corpsRef`), deux couches :
1. **Couche de mesure** — TOUTES les sections, toujours montées, invisibles :
   `position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none", overflow: "hidden"` — chaque section dans un `<div ref={(el) => { mesureRefs.current[i] = el; }}>`. Même largeur que la zone visible → les tailles `cqw` (container query sur le papier) mesurent juste.
2. **Couche visible** — seulement `pages[pageIndex]` : `{(pages[pageIndex] ?? []).map((i) => <Fragment key={sections[i].key}>{sections[i].node}</Fragment>)}`.

- [ ] **Step 3: Coin corné + indicateur**

À l'intérieur du papier (même conteneur que l'image du journal), affichés SEULEMENT si `pages.length > 1` :

```tsx
{pageIndex < pages.length - 1 && (
  <button type="button" onClick={() => setPageIndex((p) => p + 1)}
    aria-label={d.gazette.pageSuivanteAria} style={coinCorne("droit")} />
)}
{pageIndex > 0 && (
  <button type="button" onClick={() => setPageIndex((p) => p - 1)}
    aria-label={d.gazette.pagePrecedenteAria} style={coinCorne("gauche")} />
)}
<span aria-hidden style={indicateurPageStyle}>{pageIndex + 1}/{pages.length}</span>
```

```ts
/** Coin de page corné : triangle papier replié, cliquable, ombré. */
const coinCorne = (cote: "droit" | "gauche"): CSSProperties => ({
  position: "absolute",
  bottom: "1.5%",
  [cote === "droit" ? "right" : "left"]: "1.5%",
  width: "9cqw",
  height: "9cqw",
  padding: 0,
  border: "none",
  cursor: "pointer",
  background: "transparent",
  // Triangle plié : dégradé du papier vers son ombre.
  clipPath: cote === "droit" ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 0 100%, 100% 100%)",
  backgroundImage:
    cote === "droit"
      ? "linear-gradient(315deg, #d8cdb4 0%, #efe7d2 45%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 60%)"
      : "linear-gradient(45deg, #d8cdb4 0%, #efe7d2 45%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0) 60%)",
  zIndex: 4,
});

const indicateurPageStyle: CSSProperties = {
  position: "absolute",
  bottom: "1.8%",
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: "3cqw",
  color: "var(--ink-700)",
  zIndex: 4,
};
```

Adapter les couleurs du dégradé au papier réel (`/qg/journalouvert.webp`) lors de la vérification visuelle (Task 5).

Clés i18n (bloc `gazette`) :
- FR : `pageSuivanteAria: "Page suivante"`, `pagePrecedenteAria: "Page précédente"`
- EN : `"Next page"`, `"Previous page"` · ES : `"Página siguiente"`, `"Página anterior"` · EL : `"Επόμενη σελίδα"`, `"Προηγούμενη σελίδα"`

- [ ] **Step 4: Vérifier compilation + suites**

Run: `npx tsc --noEmit && npx vitest run --maxWorkers=4 src/lib/i18n src/lib/gazettePagination.test.ts && npx eslint src/components/mobile/GazetteSheet.tsx`
Attendu : 0 erreur partout.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/GazetteSheet.tsx src/lib/i18n
git commit -m "feat(gazette): pagination par sections insécables — coin corné et indicateur de page"
```

---

### Task 3: Panorama — SceneId, scène et plaque Événement

**Files:**
- Modify: `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts` (déplacer le cadre braderie de `TIER_1_FRAMES` vers une nouvelle entrée `evenement`)
- Modify: `src/components/mobile/brocante-pano/BrocanteScene.tsx` (prop `tier` → `sceneId`, fond de scène)
- Modify: `src/components/mobile/brocante-pano/BrocantePanorama.tsx` (liste de scènes dynamique, scroll/sélection)
- Modify: `src/components/mobile/brocante-pano/ScenePlaquesBar.tsx` (5ᵉ plaque Megaphone + aura)
- Modify: `src/components/mobile/brocante-pano/ScenesEditPanel.tsx` (type élargi — garde si non pertinent pour "evenement")
- Test: `src/components/mobile/brocante-pano/BrocantePanorama.test.tsx`

**Interfaces:**
- Consomme : `ID_GRANDE_BRADERIE`, `estGrandeBraderie` (`src/lib/evenements.ts`).
- Produit : `type SceneId = BrocanteTier | "evenement"` et `sceneDeBrocante(b: Pick<Brocante, "id" | "tier">): SceneId`, exportés de `brocantePanoramaLayout.ts` ; `SCENE_FRAMES: Record<SceneId, FrameCoord[]>`.

- [ ] **Step 1: Tests qui échouent** (dans `BrocantePanorama.test.tsx`, en suivant les fixtures existantes du fichier — il rend déjà le panorama avec une liste contenant la braderie)

```tsx
it("avec la braderie : 5 plaques (dont Événement) et cadre braderie hors scène 1", () => {
  // fixture existante qui inclut grande-braderie dans `brocantes`
  render(/* panorama avec braderie */);
  expect(screen.getAllByRole("button", { name: /événement/i }).length).toBeGreaterThanOrEqual(1);
  // Le cadre braderie n'est plus dans TIER_1_FRAMES :
  expect(TIER_1_FRAMES.some((f) => f.id === "grande-braderie")).toBe(false);
  expect(SCENE_FRAMES.evenement.some((f) => f.id === "grande-braderie")).toBe(true);
});

it("sans la braderie : 4 plaques, pas de plaque Événement", () => {
  render(/* panorama SANS braderie dans la liste */);
  expect(screen.queryByRole("button", { name: /événement/i })).toBeNull();
});
```

(adapter le matcher au libellé exact `d.chine.badgeEvenement` = « Événement » en FR de test ; importer `TIER_1_FRAMES`/`SCENE_FRAMES` du layout.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/brocante-pano`
Attendu : FAIL.

- [ ] **Step 3: Implémenter — layout**

`brocantePanoramaLayout.ts` :

```ts
import { ID_GRANDE_BRADERIE, estGrandeBraderie } from "@/lib/evenements";

/** Scènes du panorama : les 4 tiers + la scène événement (braderie). */
export type SceneId = BrocanteTier | "evenement";

/** Scène d'affichage d'une brocante (la braderie vit sur la scène événement). */
export function sceneDeBrocante(b: Pick<Brocante, "id" | "tier">): SceneId {
  return estGrandeBraderie(b) ? "evenement" : b.tier;
}

/** Cadre unique de la scène événement : la braderie, en grand, centrée. */
export const EVENEMENT_FRAMES: FrameCoord[] = [
  { id: ID_GRANDE_BRADERIE, left: "25.00%", top: "18.00%", width: "50.00%", height: "26.00%" },
];

export const SCENE_FRAMES: Record<SceneId, FrameCoord[]> = {
  1: TIER_1_FRAMES, 2: TIER_2_FRAMES, 3: TIER_3_FRAMES, 4: TIER_4_FRAMES,
  evenement: EVENEMENT_FRAMES,
};
```

Retirer l'entrée `grande-braderie` (et son commentaire) de `TIER_1_FRAMES`.

- [ ] **Step 4: Implémenter — BrocanteScene**

Prop `tier: BrocanteTier` → `sceneId: SceneId` ; fond :

```ts
const sceneBackgroundUrl = (sceneId: SceneId) =>
  sceneId === "evenement"
    ? "/brocantes/scenes/scene-evenement.webp"
    : `/brocantes/scenes/scene-tier-${sceneId}.webp`;
```

`frames = SCENE_FRAMES[sceneId]` (le reste du composant est déjà agnostique : lookup `brocantesById` + skip).

- [ ] **Step 5: Implémenter — BrocantePanorama**

- `const braderiePresente = brocantesById.has(ID_GRANDE_BRADERIE);`
- `const scenes: SceneId[] = useMemo(() => braderiePresente ? [1, 2, 3, 4, "evenement"] : [1, 2, 3, 4], [braderiePresente]);`
- Remplacer l'état `currentTier: BrocanteTier` par `currentScene: SceneId` et TOUTES les occurrences de `TIERS`/`TIERS.indexOf` par `scenes`/`scenes.indexOf` (scroll initial l.123-136, `goToTier` → `goToScene` l.139-150, listener scroll l.160-192, rendu l.264-280).
- Reset de sélection (l.183) : `if (sel && sceneDeBrocante(sel) !== sceneAtScroll) setSelectedId(null);`
- `setDernierTierVisite(selected.tier)` (l.235) : inchangé (la braderie mémorise le tier 4 — sans conséquence, la scène événement n'est jamais la cible du scroll initial ; ajouter un commentaire d'une ligne le disant).
- `ScenesEditPanel currentTier={...}` (l.307) : passer `currentScene` et élargir le type côté panel (ou `currentScene === "evenement" ? 4 : currentScene` avec commentaire si le panel est intrinsèquement lié aux tiers — au choix de l'implémenteur selon le code du panel, expliquer dans le rapport).

- [ ] **Step 6: Implémenter — ScenePlaquesBar**

Props : `{ currentScene: SceneId; onSceneClick: (s: SceneId) => void; evenementVisible: boolean; position?: "top" | "bottom" }`. Rendu : plaques `[1,2,3,4, ...(evenementVisible ? ["evenement"] : [])]`. Pour `"evenement"` :
- label : `<Megaphone size={18} strokeWidth={2} color={active ? "#3a2410" : "#2c2018"} />` (import lucide-react, comme `Crown`) ;
- aria-label : `d.chine.badgeEvenement` (clé existante) ;
- style : `plaqueStyle(active)` + surcharge aura :

```tsx
const plaqueEvenementStyle = (active: boolean): CSSProperties => ({
  ...plaqueStyle(active),
  animation: "aura-evenement 1.6s ease-in-out infinite",
});
```

```tsx
{/* Aura dorée pulsante — inline pour éviter le piège du globals.css périmé */}
<style>{`@keyframes aura-evenement {
  0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 0 10px rgba(240,185,70,0.55), 0 3px 8px rgba(20,12,0,0.45); }
  50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), 0 0 22px rgba(255,205,90,0.95), 0 3px 8px rgba(20,12,0,0.45); }
}`}</style>
```

(le `<style>` n'est rendu que si `evenementVisible`).

- [ ] **Step 7: Vérifier le succès**

Run: `npx vitest run --maxWorkers=4 src/components/mobile/brocante-pano && npx tsc --noEmit && npx eslint src/components/mobile/brocante-pano`
Attendu : PASS, 0 erreur. Puis suite complète : `npx vitest run --maxWorkers=4`.

- [ ] **Step 8: Commit**

```bash
git add src/components/mobile/brocante-pano
git commit -m "feat(braderie): scène et plaque Événement dédiées dans le panorama — mégaphone et aura"
```

---

### Task 4: Fond de scène festif

**Files:**
- Modify: `scripts/brocante-scenes-prompts.json` (nouvelle entrée, style calqué sur les 4 existantes — les lire d'abord)
- Create: `public/brocantes/scenes/scene-evenement.webp` (généré)

- [ ] **Step 1: Prompt + génération**

Ajouter l'entrée (adapter la CLÉ/format à ce que `generate-brocante-scenes.mjs` attend — lire le script d'abord) avec une description dans le style des scènes existantes, plus festive :

```json
{
  "id": "scene-evenement",
  "description": "a grand festive street fair avenue seen from a slight distance, strings of bunting and paper garlands overhead, banners, distant dense joyful crowd between stalls, warm late-summer golden light, celebratory atmosphere"
}
```

Run : la commande du pipeline scènes (voir en tête de `scripts/generate-brocante-scenes.mjs` — probablement `node scripts/generate-brocante-scenes.mjs -- scene-evenement` ou équivalent), puis `npm run gen:webp`.
Attendu : `public/brocantes/scenes/scene-evenement.webp`, 1024×1024, même gamme de poids que `scene-tier-*.webp`. Si la clé Gemini manque ou 2 échecs : BLOCKED, pas d'image de substitution.

- [ ] **Step 2: Commit**

```bash
git add scripts/brocante-scenes-prompts.json public/brocantes/scenes/scene-evenement.webp
git commit -m "feat(braderie): fond de scène festif de l'onglet Événement (pipeline Gemini)"
```

(le `.png` intermédiaire suit la convention des autres scènes — l'inclure seulement si les `scene-tier-*.png` sont trackés ; vérifier avec `git ls-files public/brocantes/scenes/`.)

---

### Task 5: Vérification visuelle mesurée (dev server)

**Files:**
- Modify (si besoin) : `src/components/mobile/brocante-pano/brocantePanoramaLayout.ts` (coords du cadre événement), `src/components/mobile/GazetteSheet.tsx` (couleurs du coin corné)

- [ ] **Step 1: Préparer le banc**

Le banc de test existe : `scripts/_gen-saves-evenements.ts` (non commité) + page `public/dev-save-evenements.html`. Slots : 1 = jour 88 (lundi 1ᵉʳ sept, annonce gazette), 2 = jour 93 (samedi de braderie), 3 = jour 371. Serveur : vérifier `lsof -ti:3000` (il tourne peut-être déjà) sinon `npm run dev` ; `http://localhost:3000` exclusivement.

- [ ] **Step 2: Vérifier en Playwright (mesures + captures)**

1. **Gazette jour 88** : ouvrir la gazette — le texte ne dépasse plus du papier (mesurer : le rect du dernier bloc visible est contenu dans le rect de l'image du journal, marge basse ≥ 3 % de la hauteur papier) ; coin corné présent si ≥ 2 pages ; tourner → page 2 affiche les sections restantes ; revenir ; indicateur « 1/2 » correct.
2. **Gazette jour 93** (slot 2) : idem avec le texte « en cours ».
3. **Panorama jour 93** : 5 plaques ; la plaque Megaphone pulse (vérifier `getComputedStyle(...).animationName === "aura-evenement"`) ; scroll jusqu'à la scène événement : fond festif chargé (naturalWidth 1024), cadre braderie centré (rect ~50 % de large), badge « Événement » ; scène 1 : 5 cadres, AUCUN braderie.
4. **Panorama jour 92** : 4 plaques, aucune scène événement (forcer le slot 1 puis avancer, ou régénérer une save jour 92 via le script du banc).
5. Ajuster coords/couleurs si une mesure est mauvaise ; re-vérifier ; reporter les valeurs finales dans le code.

- [ ] **Step 3: Suite complète + commit d'ajustement éventuel**

Run: `npx vitest run --maxWorkers=4 && npx tsc --noEmit`
Attendu : tout vert.

```bash
git add src/components/mobile/brocante-pano/brocantePanoramaLayout.ts src/components/mobile/GazetteSheet.tsx
git commit -m "fix(braderie): ajustements mesurés — cadre de la scène événement et coin corné"
```

(commit uniquement s'il y a eu ajustement ; sinon sauter.)

---

### Task 6: Filet final

- [ ] **Step 1:** `npx vitest run --maxWorkers=4 && npx tsc --noEmit && npx eslint src` — zéro échec.
- [ ] **Step 2:** Relire `git diff 3d98695..HEAD` : pas de console.log, pas de chaîne FR en dur hors dictionnaires, pas de fichier de banc de test commité (`dev-save-evenements.html` et `_gen-saves-evenements.ts` restent non commités).
- [ ] **Step 3:** `git push` (la branche `feat/evenements-calendaires` suit déjà origin).
