# Niveau de Brocanteur — Plan 4/4 : UI de progression + suppression des arbres d'XP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le Niveau de Brocanteur devient visible et célébré — barre d'XP persistante dans le header, « +XP » flottant en session, écran de level-up avec son et preview du prochain déblocage (données `DEBLOCAGES_PAR_NIVEAU`), onboarding (l'onglet Compétences apparaît au niveau 1) — et le squelette mort `competenceTrees` est supprimé (migration v10), plus les reliquats triés « plan 4 » par les revues des plans 2-3.

**Architecture:** Détection de level-up par **état persistant**, pas par événement : nouveau champ `GameState.niveauVu` (dernier niveau célébré) ; un overlay global monté dans le root layout affiche la célébration dès que `brocanteur.niveau > niveauVu` (séquentiellement si plusieurs niveaux), `marquerNiveauVu()` avance d'un cran. Aucun des 5 sites de crédit d'XP n'est instrumenté. La migration backfille `niveauVu = brocanteur.niveau` (pas de spam à la migration). L'overlay se retient pendant les sessions actives (mêmes préfixes de routes que le masquage de la TabBar) — un level-up gagné en pleine brocante se célèbre au retour. `competenceTrees` disparaît du type et du state (SAVE_VERSION 10) ; la migration continue de LIRE le champ des vieilles saves (cast) pour la conversion pré-v9, et `Session.xpGagne`/`CompetenceTreeId` restent (replay des archives).

**Tech Stack:** identique (Next.js App Router, React Context, TypeScript, vitest + jsdom + RTL, Web Audio synthé via `audioManager`).

**Références design :** rapport « Refonte du système de niveau » §06 couche 1 (« barre d'XP persistante, +XP flottant, écran de level-up court, son dédié ») + §08 (règles de composition : toujours afficher le prochain déblocage). Décisions utilisateur 2026-07-06 (par défaut recommandé, réversibles) : onboarding = onglet Compétences masqué avant N1 ; ancienne donation masquée aussi dans ConfirmReplaceModal.

## Global Constraints

- Nommage français ; valeurs d'équilibrage = constantes nommées exportées.
- `SAVE_VERSION` 9 → **10**. La migration reste pure et idempotente ; `niveauVu` backfillé à `brocanteur.niveau` pour toute save existante ; la conversion pré-v9 (Σ XP des arbres) continue de fonctionner en lisant `loaded.competenceTrees` par cast.
- Le replay des vieilles sessions ne casse pas : `Session.xpGagne: Record<CompetenceTreeId, number>` et le type `CompetenceTreeId` sont CONSERVÉS ; seuls `GameState.competenceTrees`, `CompetenceTreeState`, `emptyTreeState`, `emptyAllTrees`, `XP_PAR_NIVEAU`, `xpRequisPourNiveau`, `appliquerGainXP`, `progressionNiveau` disparaissent.
- Sons : synthé placeholder via `audioManager` (pattern `playRarete`), gaté par la préférence `clic` ; pas de nouvel asset.
- Z-index : overlay de level-up = **60** (au-dessus des sheets 50/51, sous le Toast 200).
- Tokens visuels existants (`--font-display`, `--font-mono`, `--brass-500/700`, `--paper-*`, `--forest-800`, `--vermillion-600`) — pas de nouvelle palette.
- Chaque tâche : `npx tsc --noEmit` 0 ; `npx vitest run` verte avant commit ; commits `feat(niveau):` / `fix(niveau):` / `chore(niveau):`.
- Les numéros de ligne datent du commit cf4ab24 et glissent — se repérer aux noms.

---

### Task 1: Suppression de `competenceTrees` — migration v10

**Files:**
- Modify: `src/types/game.ts` (champ ~229, `CompetenceTreeState` ~290-294 ; `CompetenceTreeId` ~288 RESTE)
- Modify: `src/lib/xp.ts` (lignes ~6-33 : constantes/fonctions d'arbres), `src/lib/xp.test.ts` (describes des fonctions supprimées)
- Modify: `src/data/competences.ts` (`emptyTreeState` ~20, `emptyAllTrees` ~24)
- Modify: `src/context/GameContext.tsx` (`nouvellePartie` ~495)
- Modify: `src/lib/migrations.ts` (SAVE_VERSION ~93, bloc `trees` ~284-298 + écriture ~506, fallback totalXP ~449-456)
- Modify: `src/lib/__test-fixtures__/gameState.ts` (~38), `src/lib/migrations.test.ts` (fixtures + versions pinnées)

**Interfaces:**
- Consumes: rien.
- Produces: `GameState` sans `competenceTrees` ; `SAVE_VERSION = 10` ; le reste du plan repose sur ce state allégé.

- [ ] **Step 1: Tests qui échouent** — dans `src/lib/migrations.test.ts`, à la suite des tests v9 :

```ts
describe("migration v10 — suppression de competenceTrees", () => {
  it("SAVE_VERSION vaut 10", () => {
    expect(SAVE_VERSION).toBe(10);
  });

  it("une save v9 avec competenceTrees le perd, brocanteur intact", () => {
    const v9 = migrerAvecVersion(fabriqueSaveV7(), 9); // helper local : migre puis force version 9 + réinjecte competenceTrees
    (v9 as Record<string, unknown>).competenceTrees = { general: { xp: 500, niveau: 5, pointsDisponibles: 2 } };
    v9.brocanteur = { xp: 1100, niveau: 5, pointsDisponibles: 2 };
    const migre = migrerSauvegarde(v9);
    expect("competenceTrees" in migre).toBe(false);
    expect(migre.version).toBe(10);
    expect(migre.brocanteur).toEqual({ xp: 1100, niveau: 5, pointsDisponibles: 2 });
  });

  it("la conversion pré-v9 lit toujours les arbres des vieilles saves", () => {
    const save = fabriqueSaveV7();
    (save as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    const migre = migrerSauvegarde(save);
    expect(migre.brocanteur.niveau).toBe(5); // 1100 XP → N5 (30n²+70n)
  });
});
```

(`migrerAvecVersion` : petit helper de test `const m = migrerSauvegarde(s); return { ...m, version: v };` — adapter aux helpers existants du fichier. ⚠ Les fixtures existantes qui font `save.competenceTrees = {...}` devront passer par un cast `(save as Record<string, unknown>)` une fois le champ retiré du type.)

- [ ] **Step 2: RED** — `npx vitest run src/lib/migrations.test.ts`.

- [ ] **Step 3: Implémenter.**

`src/types/game.ts` : supprimer le champ `competenceTrees` de `GameState` et l'interface `CompetenceTreeState`. `CompetenceTreeId` reste (utilisé par `Session.xpGagne`, `getTreeMeta`, TreePicker).

`src/lib/xp.ts` : supprimer `XP_PAR_NIVEAU`, `xpRequisPourNiveau`, `appliquerGainXP`, `progressionNiveau` (fonctions d'arbres, 0 appelant de production). `src/lib/xp.test.ts` : supprimer leurs describes ; garder tous les tests Brocanteur.

`src/data/competences.ts` : supprimer `emptyTreeState`/`emptyAllTrees` (leurs 2 seuls appelants disparaissent).

`src/context/GameContext.tsx` : retirer `competenceTrees: emptyAllTrees()` de `nouvellePartie` + purger l'import.

`src/lib/migrations.ts` :
- `SAVE_VERSION = 10`.
- Supprimer le calcul `trees` (~284-296) et l'écriture `competenceTrees: trees` (~506). ⚠ CONSERVER la détection d'IDs/catégories obsolètes qui reset `competencesDebloquees` (~298) — elle est indépendante de l'objet trees ; la garder telle quelle (elle lit le catalogue, pas les arbres).
- Fallback totalXP pré-v9 (~449-456) : remplacer `loaded.competenceTrees` par un cast local :

```ts
const arbresLegacy = (loaded as { competenceTrees?: Record<string, { xp?: number }> }).competenceTrees;
const totalXP = xpValide
  ? b!.xp
  : Object.values(arbresLegacy ?? {}).reduce(
      (acc, t) => acc + (Number.isFinite(t?.xp) && (t!.xp as number) > 0 ? (t!.xp as number) : 0),
      0,
    );
```

- Le gate `dejaV9 = version >= 9` ne change PAS (une save v9 ET v10 a un `brocanteur` de confiance).

`src/lib/__test-fixtures__/gameState.ts` : supprimer la ligne `competenceTrees: {}`.

`src/lib/migrations.test.ts` : mettre à jour les pins de version (`SAVE_VERSION incrémenté à 9` → `10` ; les `expect(migre.version).toBe(9)` littéraux → `SAVE_VERSION`) et caster les écritures `save.competenceTrees` des fixtures pré-v9.

- [ ] **Step 4: GREEN + suite complète + tsc** — chasser tout usage restant (`grep -rn "competenceTrees\|CompetenceTreeState\|emptyAllTrees\|appliquerGainXP\b\|XP_PAR_NIVEAU" src` : seuls doivent rester les casts de migration/tests et `CompetenceTreeId`).
- [ ] **Step 5: Commit** — `git commit -m "chore(niveau): suppression de competenceTrees (migration v10), les arbres ne sont plus qu'un catalogue"`

---

### Task 2: `niveauVu` — l'état « dernier niveau célébré »

**Files:**
- Modify: `src/types/game.ts` (nouveau champ), `src/context/GameContext.tsx` (init + action `marquerNiveauVu`), `src/lib/migrations.ts` (backfill)
- Test: `src/lib/migrations.test.ts`, `src/context/GameContext.marquerNiveauVu.test.tsx` (créer)

**Interfaces:**
- Consumes: `state.brocanteur.niveau`.
- Produces: `GameState.niveauVu: number` ; action contexte `marquerNiveauVu: () => void` (avance d'UN niveau, clampé au niveau courant) ; invariant `0 ≤ niveauVu ≤ brocanteur.niveau` garanti par la migration.

- [ ] **Step 1: Tests qui échouent.**

`src/lib/migrations.test.ts` :

```ts
describe("niveauVu (célébration de level-up)", () => {
  it("backfillé au niveau courant pour toute save existante (pas de spam)", () => {
    const save = fabriqueSaveV7();
    (save as Record<string, unknown>).competenceTrees = { general: { xp: 1100, niveau: 11, pointsDisponibles: 4 } };
    const migre = migrerSauvegarde(save);
    expect(migre.niveauVu).toBe(migre.brocanteur.niveau); // 5
  });
  it("clampé au niveau courant si corrompu au-dessus", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const migre = migrerSauvegarde({ ...m1, niveauVu: 99 });
    expect(migre.niveauVu).toBe(migre.brocanteur.niveau);
  });
  it("préservé s'il est valide et en retard (célébration en attente)", () => {
    const m1 = migrerSauvegarde(fabriqueSaveV7());
    const enAttente = { ...m1, brocanteur: { xp: 1100, niveau: 5, pointsDisponibles: 5 }, niveauVu: 3 };
    expect(migrerSauvegarde(enAttente).niveauVu).toBe(3);
  });
});
```

`src/context/GameContext.marquerNiveauVu.test.tsx` — même harnais que `GameContext.utiliserActive.test.tsx` (vrai provider, mocks next/navigation + timeSource, seeding par `gagnerXPBrocanteur` avec la courbe exacte) :

```ts
it("nouvelle partie : niveauVu 0, rien en attente", ...);            // niveauVu === 0 === niveau
it("un gain d'XP crée l'écart, marquerNiveauVu avance d'UN cran", ...); // seed N2 → niveauVu 0 ; 1er appel → 1 ; 2e → 2 ; 3e → no-op (reste 2)
it("atomique : deux appels même tick n'avancent que d'un cran", ...);   // 2 appels dans un act() → niveauVu 1
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter.**

`src/types/game.ts` (près de `bossDebloqueSeen`) :

```ts
  /** Dernier Niveau de Brocanteur déjà célébré par l'écran de level-up. Toujours ≤ brocanteur.niveau. */
  niveauVu: number;
```

`GameContext.tsx` : `nouvellePartie` → `niveauVu: 0` ; action :

```ts
const marquerNiveauVu = useCallback(() => {
  setState((prev) =>
    prev && prev.niveauVu < prev.brocanteur.niveau
      ? { ...prev, niveauVu: Math.min(prev.niveauVu + 1, prev.brocanteur.niveau) }
      : prev,
  );
}, []);
```

(exposée dans l'interface + values + deps — la garde vit ENTIÈREMENT dans l'updater : atomique par construction.)

`migrations.ts` — bloc à placer APRÈS le calcul de `brocanteurConverti`/final (le backfill en dépend) :

```ts
    niveauVu: (() => {
      const v = (loaded as Partial<GameState>).niveauVu;
      const niveauFinal = /* le niveau du bloc brocanteur final calculé plus haut */;
      if (Number.isFinite(v) && (v as number) >= 0) return Math.min(Math.floor(v as number), niveauFinal);
      return niveauFinal; // saves d'avant la feature : tout est déjà « vu »
    })(),
```

(réutiliser la variable locale du brocanteur final exactement comme le clamp d'énergie de la Task 2 du plan 3 — même contrainte d'ordre des blocs.)

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): niveauVu — état persistant du dernier level-up célébré + action marquerNiveauVu"`

---

### Task 3: Son de level-up (synthé)

**Files:**
- Modify: `src/lib/audio/audioManager.ts` (nouvelle méthode, après `playRarete`)
- Test: `src/lib/audio/audioManager.test.ts`

**Interfaces:**
- Consumes: infra `ensureCtx`/`master`/prefs existante.
- Produces: `audioManager.playLevelUp(): void` — fanfare synthé ~0,9 s, gatée par `prefs.clic`.

- [ ] **Step 1: Test qui échoue** — dans `audioManager.test.ts`, suivre le pattern exact de `"playRarete joue un arpège de 3 notes"` (FakeAudioContext, `freshManager()`) :

```ts
it("playLevelUp joue une fanfare de 4 notes montantes", async () => {
  const manager = await freshManager();
  manager.playLevelUp();
  const ctx = FakeAudioContext.instances[0];
  expect(ctx.oscillators.length).toBe(4);
});

it("playLevelUp est muet quand la préférence clic est désactivée", async () => {
  // reprendre le pattern du test existant « les sons de chinage sont muets… »
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter** dans `audioManager.ts` (modelé sur `playRarete`, mêmes conventions d'enveloppe) :

```ts
  /** Fanfare de level-up : arpège majeur montant C5-E5-G5-C6, triangle, ~0,9 s. Placeholder synthé. */
  playLevelUp(): void {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t0 = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = t0 + i * 0.11;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(i === notes.length - 1 ? 0.3 : 0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 0.55 : 0.28));
      osc.connect(gain).connect(this.master!);
      osc.start(t);
      osc.stop(t + (i === notes.length - 1 ? 0.6 : 0.32));
    });
  }
```

(Adapter les noms exacts d'enveloppe aux helpers privés du fichier s'il en existe — reprendre ce que fait `playRarete` plutôt que d'inventer.)

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): son de level-up (fanfare synthé placeholder, pref clic)"`

---

### Task 4: `LevelUpOverlay` — l'écran de level-up global

**Files:**
- Create: `src/components/mobile/LevelUpOverlay.tsx`
- Modify: `src/app/layout.tsx` (montage à côté de TabBar), `src/components/mobile/TabBar.tsx` (exporter les préfixes de routes de session)
- Test: `src/components/mobile/LevelUpOverlay.test.tsx` (créer)

**Interfaces:**
- Consumes: `useGame()` (`state.niveauVu`, `state.brocanteur.niveau`, `marquerNiveauVu`), `deblocagesPourNiveau`/`prochainDeblocage` (`@/data/deblocagesNiveau`), `audioManager.playLevelUp`, `usePathname`.
- Produces: overlay autonome, aucun autre composant n'a besoin de le piloter.

- [ ] **Step 1: Tests qui échouent** — RTL, en mockant `useGame` (pas besoin du vrai provider ici : le composant est un pur lecteur + 1 action) et `next/navigation` (`usePathname`) et `audioManager` :

```ts
it("rien à célébrer : ne rend rien", ...);                       // niveauVu === niveau → null
it("niveau en attente : titre « Niveau 1 », déblocages du niveau, preview du prochain", ...);
   // niveauVu 0 / niveau 1 → « Niveau 1 » + titres de deblocagesPourNiveau(1) + « Prochain — Niv. 2 : … »
it("Continuer appelle marquerNiveauVu et joue le son une fois par niveau", ...);
it("retenu pendant une session : pathname /chiner/xxx → null même avec un niveau en attente", ...);
it("multi-niveaux : célèbre niveauVu+1, pas le niveau final", ...); // niveauVu 3 / niveau 5 → « Niveau 4 »
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter.**

`TabBar.tsx` : exporter la liste existante des préfixes de session (`HIDDEN_PREFIXES` ou équivalent) sous un nom parlant, ex. `export const ROUTES_SESSION_PREFIXES = ["/chiner/", "/vitrine/"];` et l'utiliser en interne (pas de duplication).

`LevelUpOverlay.tsx` :

```tsx
export function LevelUpOverlay() {
  const { state, marquerNiveauVu } = useGame();
  const pathname = usePathname();
  const enSession = ROUTES_SESSION_PREFIXES.some((p) => pathname?.startsWith(p));
  const niveauACelebrer =
    state && state.brocanteur.niveau > state.niveauVu ? state.niveauVu + 1 : null;

  useEffect(() => {
    if (niveauACelebrer !== null && !enSession) audioManager.playLevelUp();
  }, [niveauACelebrer, enSession]);

  if (niveauACelebrer === null || enSession) return null;
  const deblocages = deblocagesPourNiveau(niveauACelebrer);
  const prochain = prochainDeblocage(niveauACelebrer);
  return (
    <div style={scrim} role="dialog" aria-label={`Niveau ${niveauACelebrer} atteint`}>
      <div style={carte}>
        <div style={eyebrow}>— niveau de brocanteur —</div>
        <div style={titre}>Niveau {niveauACelebrer} !</div>
        <div style={sousTitre}>+1 point de compétence</div>
        {deblocages.map((d) => (
          <div key={d.titre} style={ligneDeblocage}>
            <span style={chipFamille(d.famille)}>{LIBELLE_FAMILLE[d.famille]}</span> {d.titre}
          </div>
        ))}
        {prochain && (
          <div style={lignProchain}>Prochain — Niv. {prochain.niveau} : {prochain.titre}</div>
        )}
        <button style={btnContinuer} onClick={marquerNiveauVu}>Continuer</button>
      </div>
    </div>
  );
}
```

Styles : scrim `position:fixed; inset:0; zIndex:60; background:rgba(20,20,16,0.72)`, carte papier centrée (`--paper-100`, bordure `3px solid var(--brass-500)`, padding 20, max-width 320), titre `--font-display` ~28, eyebrow mono uppercase `--brass-700`, chips de famille aux couleurs douces existantes (`LIBELLE_FAMILLE: Record<FamilleDeblocage, string>` = jalon → « Jalon », contenu → « Contenu », economie → « Économie », confort → « Confort », active → « Active »), bouton pleine largeur style des boutons primaires du projet. Quand `deblocages` est vide (niveaux > 20) le corps se réduit à « +1 point de compétence ». Le son se rejoue à chaque `niveauACelebrer` (dep de l'effet) — c'est voulu pour l'enchaînement multi-niveaux.

`src/app/layout.tsx` : monter `<LevelUpOverlay />` à côté de `<TabBar />` (composant client, même niveau d'arbre — vérifier que le root layout rend TabBar dans un boundary client et faire pareil).

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): écran de level-up global (déblocages du niveau, preview du prochain, son, retenue en session)"`

---

### Task 5: Barre d'XP persistante (header) + preview dans Compétences + données niveau 1

**Files:**
- Modify: `src/components/mobile/MobileHeader.tsx` (cellule spacer `1fr`)
- Modify: `src/app/bibliotheque/page.tsx` (ligne « Prochain déblocage » sous le bloc niveau)
- Modify: `src/data/deblocagesNiveau.ts` (ligne niveau 1), `src/data/deblocagesNiveau.test.ts`
- Test: `src/data/deblocagesNiveau.test.ts` (test croisé actives)

**Interfaces:**
- Consumes: `progressionNiveauBrocanteur`, `prochainDeblocage`, `NIVEAU_ACTIVES` (`@/lib/actives`), `useGame` (déjà utilisé par MobileHeader).
- Produces: header avec chip `N{niveau}` + mini-barre cliquables (lien `/bibliotheque`) sur toutes les pages qui montent MobileHeader.

- [ ] **Step 1: Données niveau 1 + tests croisés (RED d'abord).** `deblocagesNiveau.test.ts` :

```ts
it("le niveau 1 ouvre l'écran Compétences (effectif — onboarding)", () => {
  const l1 = deblocagesPourNiveau(1);
  expect(l1).toHaveLength(1);
  expect(l1[0].effectif).toBe(true);
  expect(l1[0].titre).toContain("Compétences");
});

it("les lignes famille active correspondent exactement à NIVEAU_ACTIVES", () => {
  const parNiveau = DEBLOCAGES_PAR_NIVEAU.filter((d) => d.famille === "active").map((d) => d.niveau).sort((a, b) => a - b);
  expect(parNiveau).toEqual(Object.values(NIVEAU_ACTIVES).sort((a, b) => a - b));
});
```

Mettre à jour le test des effectifs : `[1, 4, 5, 7, 8, 9, 10, 13, 14, 15, 17, 20]`. Implémenter : ligne 1 devient `{ niveau: 1, titre: "Ouverture de l'écran Compétences (+1 point)", famille: "jalon", effectif: true }`.

- [ ] **Step 2: Header.** Dans `MobileHeader.tsx`, remplacer la cellule spacer `<span />` par un bloc niveau (le composant lit déjà `state` pour l'énergie) :

```tsx
{state ? (
  <Link href="/bibliotheque" style={xpBlocStyle} aria-label={`Niveau de Brocanteur ${state.brocanteur.niveau}`}>
    <span style={xpNiveauStyle}>N{state.brocanteur.niveau}</span>
    <span style={xpTrackStyle}>
      <span style={{ ...xpFillStyle, width: `${Math.round(progressionNiveauBrocanteur(state.brocanteur) * 100)}%` }} />
    </span>
  </Link>
) : (
  <span />
)}
```

Styles (fond header `--forest-800`) : `xpBlocStyle` = flex align-center gap 6, `justifySelf:"center"`, `minWidth:0` ; `xpNiveauStyle` = `--font-display` 13, couleur `--paper-100` ; `xpTrackStyle` = `width:56px; height:5px; background:rgba(247,244,238,0.18); border:1px solid var(--brass-500); overflow:hidden` ; `xpFillStyle` = `display:block; height:100%; background:var(--brass-500); transition:width 300ms ease`. Ajouter `data-fly-target="xp-header"` sur le bloc (ancre du +XP flottant, Task 6).

- [ ] **Step 3: Preview dans Compétences.** `bibliotheque/page.tsx`, sous le bloc niveau/barre/points existant, une ligne mono discrète :

```tsx
{prochainDeblocage(state.brocanteur.niveau) && (
  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--brass-700)", letterSpacing: "0.06em", padding: "4px 2px 0" }}>
    Prochain — Niv. {prochainDeblocage(state.brocanteur.niveau)!.niveau} : {prochainDeblocage(state.brocanteur.niveau)!.titre}
  </div>
)}
```

(mettre le résultat dans une variable locale plutôt que 3 appels.)

- [ ] **Step 4: GREEN + suite + tsc** (les tests RTL existants qui rendent MobileHeader avec un mock `state` sans `brocanteur` casseront — compléter les fixtures, jamais affaiblir).
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): barre d'XP persistante dans le header + preview du prochain déblocage (Compétences, données N1)"`

---

### Task 6: « +XP » flottant en session

**Files:**
- Create: `src/components/mobile/XpFloats.tsx`
- Modify: `src/app/globals.css` (keyframe), `src/app/chiner/[brocanteId]/ClientPage.tsx`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`
- Test: `src/components/mobile/XpFloats.test.tsx` (créer)

**Interfaces:**
- Consumes: rien du contexte (composant purement local).
- Produces:
```ts
export function useXpFloats(): { floats: ReadonlyArray<{ id: number; montant: number }>; pousserXp: (montant: number) => void };
export function XpFloatsVue({ floats }: { floats: ReadonlyArray<{ id: number; montant: number }> }): JSX.Element;
export const XP_FLOAT_DUREE_MS = 900;
```

- [ ] **Step 1: Tests qui échouent** — RTL + fake timers :

```ts
it("pousserXp affiche « +10 XP », qui disparaît après XP_FLOAT_DUREE_MS", ...);
it("plusieurs gains rapprochés s'empilent (2 floats simultanés)", ...);
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter.** `XpFloats.tsx` : le hook garde une liste `{id, montant}` (id = compteur incrémental de ref), `pousserXp` ajoute + programme le retrait à `XP_FLOAT_DUREE_MS` (nettoyer les timeouts au démontage). `XpFloatsVue` : conteneur `position:fixed; top:calc(var(--safe-top) + var(--mobile-header-h) + 6px); right:14px; zIndex:35; pointerEvents:none; display:flex; flexDirection:column; gap:2px; alignItems:flex-end`, chaque float `fontFamily:var(--font-mono); fontSize:11; color:var(--brass-700); background:var(--paper-100); border:1px solid var(--brass-500); padding:"1px 6px"; animation: broc-xp-float 900ms ease-out forwards`. `globals.css` :

```css
@keyframes broc-xp-float {
  0% { opacity: 0; transform: translateY(6px); }
  15% { opacity: 1; transform: translateY(0); }
  70% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-14px); }
}
```

- [ ] **Step 4: Brancher les deux pages de session.** Chinage : dans `gagnerXPLocal`, ajouter `pousserXp(montant)` ; monter `<XpFloatsVue floats={floats} />` au niveau racine du JSX de la page. Vitrine journée : idem dans `gagnerXPLocal` ET `gagnerXPBrocanteurLocal`. (Le juste-prix et la découverte passent déjà par ces wrappers — vérifier, sinon les brancher aussi.)

- [ ] **Step 5: GREEN + suite + tsc.**
- [ ] **Step 6: Commit** — `git commit -m "feat(niveau): +XP flottant pendant les sessions de chine et de vente"`

---

### Task 7: Onboarding — l'onglet Compétences apparaît au niveau 1

**Files:**
- Modify: `src/components/mobile/TabBar.tsx` (filtre par état)
- Test: `src/components/mobile/TabBar.test.tsx` (créer ou étendre s'il existe)

**Interfaces:**
- Consumes: `state.brocanteur.niveau` (TabBar lit déjà le state pour les badges).
- Produces: `TabDef.masque?: (state: GameState) => boolean` ; Bibliothèque masquée tant que `niveau < 1`.

- [ ] **Step 1: Tests qui échouent** — RTL avec le mock d'état des tests de composants existants :

```ts
it("l'onglet Biblio. est absent à niveau 0", ...);       // render TabBar, state.brocanteur.niveau = 0 → pas de tab « Biblio. »
it("l'onglet Biblio. est présent dès le niveau 1", ...);
it("state null (pré-hydratation) : les 5 onglets par défaut", ...); // pas de flash de disparition pour un joueur existant
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implémenter.** `TabDef` gagne `masque?: (state: GameState) => boolean` ; l'entrée Bibliothèque : `masque: (s) => s.brocanteur.niveau < 1`. Au rendu : `TAB_ORDER.filter((t) => !state || !t.masque?.(state))` (state null → tout visible, pas de flash). La grille des onglets s'adapte au nombre (vérifier que le layout est flex/grid auto — sinon ajuster). Navigation directe vers `/bibliotheque` à niveau 0 : non bloquée (l'écran reste fonctionnel, choix assumé — le commenter dans TabBar).

- [ ] **Step 4: GREEN + suite + tsc.**
- [ ] **Step 5: Commit** — `git commit -m "feat(niveau): onboarding — l'onglet Compétences se révèle au premier level-up"`

---

### Task 8: Reliquats des revues des plans 2-3

**Files:**
- Modify: `src/lib/migrations.test.ts` (test clamp énergie)
- Modify: `src/components/mobile/chine/ChineNegoDrawer.tsx`, `src/components/mobile/NegociationSheet.tsx`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (bouton Criée), (Flair/Fouille déjà conformes) — unification des boutons d'actives
- Modify: `src/app/stockage/gerer/page.tsx` + `src/components/mobile/ConfirmReplaceModal.tsx` (ancienne donation)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (updater `setTempsRestant`)

**Interfaces:** aucun nouveau symbole partagé. Convention d'actives unifiée : **masqué si non débloqué (niveau), visible-mais-désactivé avec compteur `(0)` si quota épuisé**.

- [ ] **Step 1: Test clamp énergie dynamique** (`migrations.test.ts`) :

```ts
it("clamp énergie : une save N14 avec 7 d'énergie ne perd rien, 9 est ramené à 7", () => {
  const m1 = migrerSauvegarde(fabriqueSaveV7());
  const n14 = { ...m1, brocanteur: { xp: xpRequisPourNiveauBrocanteur(14), niveau: 14, pointsDisponibles: 0 }, niveauVu: 14, energie: 7 };
  expect(migrerSauvegarde(n14).energie).toBe(7);
  expect(migrerSauvegarde({ ...n14, energie: 9 }).energie).toBe(7);
});
```

(RED possible seulement sur le 2e assert si le clamp est déjà correct — c'est un test de non-régression, l'écrire et vérifier qu'il passe.)

- [ ] **Step 2: Unification des boutons d'actives.** Passer de « caché à 0 » à « désactivé à 0 » (avec compteur visible) pour : Tchatche (`ChineNegoDrawer` — le bouton reste rendu quand `restantes === 0`, `disabled`, opacité ~0.45, libellé `💬 La Tchatche (0)` ; le gate `statut === "fache"`/`refus_poli` de visibilité NE CHANGE PAS), Lot garni et Boniment (`NegociationSheet` — même passage hidden→disabled ; les gates panier<2/objet-ajoutable du Lot garni restent des conditions de MASQUAGE, seul le quota devient disabled), Criée (ClientPage journée — idem). Reprendre le style disabled des boutons voisins (Flair fait déjà ça). ⚠ Mettre à jour le test `ChineNegoDrawer.test.tsx` : le cas « conclu → pas de consommation » reste (visibilité par statut), ajouter « restantes 0 → bouton désactivé, pas caché ».

- [ ] **Step 3: Ancienne donation masquée.** `stockage/gerer/page.tsx` : `ancienneDonation` passe `valeur: connue ? ancienne.valeur : null` (même Set `categoriesConnuesVitrine`, la catégorie du slot est celle de l'objet remplaçant) ; `ConfirmReplaceModal.tsx` : prop `ancienneDonation.valeur: number | null`, rendu `?` pour null (même pattern que `nouvelObjet` fait depuis le plan 3).

- [ ] **Step 4: Updater `setTempsRestant` pur.** Dans le tick de `journee/ClientPage.tsx` : sortir l'écriture `tempsRestantRef.current = ...` et la planification `setTimeout(terminerJournee)` de l'updater. Pattern cible : l'updater devient pur (`setTempsRestant((p) => Math.max(0, p - TICK_S))`) ; la synchro du ref se fait par `useEffect(() => { tempsRestantRef.current = tempsRestant; }, [tempsRestant])` ; la fin de journée par un `useEffect` sur `tempsRestant === 0` (garde `finDeclencheeRef` pour ne tirer qu'une fois). Vérifier qu'aucun comportement ne change : la pause client (`if (clientActuelRef.current) return`) est dans le tick, pas dans l'updater.

- [ ] **Step 5: GREEN + suite + tsc.**
- [ ] **Step 6: Commit** — `git commit -m "fix(niveau): reliquats revues — clamp énergie testé, boutons d'actives unifiés (désactivé à 0), ancienne donation masquée, updater du tick pur"`

---

### Task 9: Vérification de bout en bout

- [ ] **Step 1:** `npx vitest run` → 0 échec ; `npx tsc --noEmit` → 0 erreur.
- [ ] **Step 2: Parcours réel** (dev server + Playwright 375×812, seeding localStorage comme aux plans 2-3 — ⚠ les seeds passent en `version: 10` et SANS `competenceTrees`, avec `niveauVu`) :
  1. **Onboarding + premier level-up** : nouvelle partie → l'onglet Biblio. est absent, la barre d'XP du header affiche N0 ; jouer jusqu'à N1 (2 achats + 1 vente ≈ 100 XP, ou seed xp 99 puis une action) → au retour de session, écran « Niveau 1 ! » avec « Ouverture de l'écran Compétences », Continuer → l'onglet apparaît, `niveauVu` = 1 dans la save.
  2. **Multi-niveaux + retenue en session** : seed `niveauVu: 3, brocanteur.niveau: 5` sur une route de session (`/chiner/...`) → pas d'overlay pendant la session ; retour au QG → « Niveau 4 » puis « Niveau 5 » enchaînés, preview « Prochain — Niv. 6 » sur le 5.
  3. **+XP flottant** : en chinage, un achat fait apparaître « +10 XP » sous le header, qui disparaît ; la barre du header progresse.
  4. **Migration v9 → v10** : seed une save v9 complète AVEC `competenceTrees` et sans `niveauVu` → reload → jeu fonctionnel, save re-stampée v10 sans `competenceTrees`, `niveauVu === niveau` (pas d'overlay), compétences débloquées intactes.
  5. **Reliquats** : bouton d'active à quota épuisé visible et grisé `(0)` (Tchatche sur une négo fâchée après usage) ; modal de remplacement de donation : les deux valeurs à `?` quand la catégorie est inconnue.
  6. **0 pageerror** partout (y compris plus AUCUN console.error « Cannot update a component »).
- [ ] **Step 3: Ledger + commit final éventuel.**

---

## Notes pour l'exécuteur

- **Ordre imposé** : Task 1 (v10) avant Task 2 (niveauVu s'appuie sur les fixtures nettoyées) ; Tasks 2-3 avant 4 ; Task 5 indépendante après 1 ; Tasks 6-8 indépendantes. Task 9 en dernier.
- `CompetenceTreeId`, `Session.xpGagne`, `getTreeMeta`, `TreePicker` et le rendu legacy de `SessionSummary` sont HORS périmètre de suppression — le replay des vieilles archives doit continuer de marcher.
- Dette acceptée (ne pas « corriger » en passant) : `etatCompetence` ne retourne pas la cause du verrouillage (la triple dérivation bannière/raison/etat est alignée et testée depuis le plan 3) ; navigation directe `/bibliotheque` possible à niveau 0.
- Après ce plan : passe d'équilibrage au simulateur (courbe niveau/jour, énergie N8/N14, farm Fouille, re-roll prixMax du Lot garni) — hors périmètre.
