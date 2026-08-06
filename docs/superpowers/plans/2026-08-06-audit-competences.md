# Audit compétences — Implémentation R1/R2a/R3/R5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer les 4 décisions de l'audit compétences du 2026-08-06 : R1 remplacer la branche thématique « Œil aiguisé » (tolérance vente redondante) par « Marchandage » (plancher vendeur réduit en chine), R2a Diplomate accepte 110 % du plafond révélé + Boniment 105 % avant N50, R3 Le Flair révèle le prix plancher quand la cote est déjà connue, R5 Estimateur de bourse affiche aussi les catégories aimées/évitées du client.

**Architecture:** La branche `oeil_aiguise` des 7 arbres thématiques devient `marchandage` dans `data/competences.ts` (ids `cat.<Cat>.marchandage.1-3`) ; le bonus (−4/−8/−12 points de % du prix affiché sur le plancher vendeur) s'applique à l'OUVERTURE de la négo d'achat (ChineNegoDrawer), jamais dans `instancier()`. Migration v18 : retirer les ids legacy AVANT la purge générique (qui sinon reset TOUTES les compétences) et rembourser au barème payé (1/2/3 pour saves v9-14, 1 pour v15-17), écrêtage inchangé via `appliquerRefonteCoutsV15`.

**Tech Stack:** Next.js/TS, vitest (`--maxWorkers=4` OBLIGATOIRE sur ce Mac Intel), i18n par overlays FR-canonique (`src/lib/i18n/contenu/{en,es,el}/competences.ts`, clés = ids).

## Global Constraints

- `npx vitest run --maxWorkers=4` pour TOUTE exécution de tests (sinon ~41 faux échecs).
- Jamais de chaîne localisée en save.
- Chiffres d'équilibrage identiques dans les 4 langues, chiffres clés dans les descriptions.
- `npm run lint` cassé → `npx eslint src`.
- Branche de travail : `feat/audit-competences` (depuis HEAD de `feat/evenements-calendaires`).
- `COUT_TOTAL_COMPETENCES` reste 96 (branche 3 paliers remplacée par 3 paliers).

---

### Task 1 : Spec + branche

**Files:**
- Create: `docs/superpowers/specs/2026-08-06-audit-competences-design.md`

- [ ] `git checkout -b feat/audit-competences`
- [ ] Écrire la spec (décisions R1/R2a/R3/R5, chiffres, lien artifact audit)
- [ ] Commit `docs(spec): audit compétences — Marchandage, Diplomate 110 %, Flair v2, Estimateur enrichi`

### Task 2 : R1 — données + retrait tolérance catégorielle (vente)

**Files:**
- Modify: `src/data/competences.ts` (brancheOeilAiguise → brancheMarchandage, id `marchandage`)
- Modify: `src/lib/competences.ts` (retirer `BONUS_TOLERANCE_CATEGORIE`/`bonusToleranceCategorie`, ajouter `BONUS_MARCHANDAGE = [0.04, 0.08, 0.12]` + `bonusMarchandageCategorie`)
- Modify: `src/lib/vitrine.ts` (VitrineModifiers sans `bonusToleranceParCategorie`, `toleranceBoost = modifiers.bonusToleranceNego`)
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (ne plus construire la map)
- Modify: `src/lib/competences.test.ts`, `src/lib/vitrine.test.ts`
- Modify: `src/data/competencesVisuels.test.ts` (BRANCHES_THEME), `scripts/competences-prompts.json` (id `theme.oeil_aiguise.*` → `theme.marchandage.*`)
- Rename: `public/competences/theme.oeil_aiguise.{1,2,3}.webp` → `theme.marchandage.{1,2,3}.webp` (git mv, visuels réutilisés)

**Interfaces:**
- Produces: `bonusMarchandageCategorie(state, cat): number` (0 | 0.04 | 0.08 | 0.12), ids `cat.<Cat>.marchandage.<1-3>`.

Noms/descriptions FR (canonique) :
- P1 « Marchandeur — {cat} » : « En chine, le prix plancher des vendeurs baisse de 4 points de % (de leur prix affiché) sur les objets « {cat} ». »
- P2 « Fin marchandeur — {cat} » : idem 8 points de % (remplace Marchandeur).
- P3 « Roi du marchandage — {cat} » : idem 12 points de % (remplace Fin marchandeur).

- [ ] Tests d'abord (bonusMarchandageCategorie 0/0.04/0.08/0.12, écrasement par palier max) → FAIL
- [ ] Implémenter data + lib + vitrine + page ; adapter les tests existants de tolérance catégorielle
- [ ] `npx vitest run --maxWorkers=4 src/lib/competences.test.ts src/lib/vitrine.test.ts src/data` → PASS
- [ ] Commit `feat(competences): branche Marchandage remplace la tolérance catégorielle`

### Task 3 : R1 — application côté achat

**Files:**
- Modify: `src/lib/chine.ts` (helper), `src/app/chiner/[brocanteId]/ClientPage.tsx`, `src/components/mobile/chine/ChineNegoDrawer.tsx`
- Test: `src/lib/chine.test.ts`

**Interfaces:**
- Produces: `prixMinAvecMarchandage(prixVendeur, prixMinAccept, bonus): number` = `max(1, prixMinAccept − round(prixVendeur × bonus))` ; prop `prixMinEffectif?: number` sur ChineNegoDrawer, utilisée dans `ouvrirNegociation("achat", prixVendeur, prixMinEffectif ?? item.prixMinAccept, …)`.

- [ ] Tests helper (bonus 0 → inchangé ; 0.12 → plancher réduit ; plancher ≥ 1) → FAIL → implémenter → PASS
- [ ] ClientPage chiner : calcule `prixMinEffectif` via `bonusMarchandageCategorie` et le passe au drawer
- [ ] Commit `feat(chine): le Marchandage abaisse le plancher des vendeurs à l'ouverture de la négo`

### Task 4 : R1 — migration v18

**Files:**
- Modify: `src/lib/migrations.ts` (SAVE_VERSION 17→18)
- Test: `src/lib/migrations.test.ts`

Logique (AVANT la purge générique ligne ~349, sinon `idsObsoletes` → reset TOTAL des compétences) :
```ts
const RX_MARCHANDAGE_LEGACY = /^cat\..+\.oeil_aiguise\.([123])$/;
const dejaV18 = typeof loaded.version === "number" && loaded.version >= 18;
const idsLegacyMarchandage = (loaded.competencesDebloquees ?? []).filter((id) => RX_MARCHANDAGE_LEGACY.test(id));
// Remboursement au barème PAYÉ : v9-14 → palierNumero (1/2/3), v15-17 → 1 ; <v9 → 0 (recalc) ; ≥18 → 0.
const remboursementV18 = !dejaV9 || dejaV18 ? 0 : idsLegacyMarchandage.reduce((acc, id) => acc + (dejaV15 ? 1 : Number(RX_MARCHANDAGE_LEGACY.exec(id)![1])), 0);
```
puis filtrer ces ids de la liste passée à la purge, et ajouter `remboursementV18` au `pointsDisponibles` du brocanteur v9+ AVANT `appliquerRefonteCoutsV15` (écrêtage inconditionnel inchangé). ⚠ `dejaV9`/`dejaV15` existent déjà plus bas dans la fonction : les remonter ou calculer localement à l'identique.

- [ ] Tests : v17 avec 3 ids legacy (+autres comps) → ids retirés, +3 pts, PAS de reset des autres ; v10 palier 1..3 → +6 ; v18 → +0 (idempotence) ; écrêtage respecté → FAIL → implémenter → PASS
- [ ] Commit `feat(migrations): v18 — remboursement de la branche Œil aiguisé remplacée`

### Task 5 : R1 — i18n EN/ES/EL

**Files:**
- Modify: `src/lib/i18n/contenu/{en,es,el}/competences.ts` (paliers `cat.<cat>.marchandage.*`, branches `cat.<cat>/marchandage`)

Noms : EN Bargainer / Shrewd bargainer / Bargain king, branche « Bargaining » ; ES Regateador / Fino regateador / Rey del regateo, branche « Regateo » ; EL au même moule. Descriptions calquées sur le FR, chiffres identiques.

- [ ] `npx vitest run --maxWorkers=4 src/lib/i18n` → PASS (les tests de couverture par id imposent la mise à jour)
- [ ] Commit `feat(i18n): branche Marchandage en 4 langues`

### Task 6 : R2a — Diplomate 110 % / Boniment 105→115 %

**Files:**
- Modify: `src/lib/vitrine.ts`, `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`, `src/data/competences.ts` (description Diplomate), overlays i18n
- Test: `src/lib/vitrine.test.ts`

**Interfaces:**
- Produces: `DIPLOMATE_MARGE = 1.10` ; `proposerOffreVente(..., options: { plafondRevele?: boolean })` → conclu si `plafondRevele && offre ≤ round(cibleSecrete × DIPLOMATE_MARGE)` ; `margeBoniment(niveau)` = 1.05 sous N50 (`NIVEAU_USAGE_2.boniment`), 1.15 sinon ; `appliquerBoniment(nego, offre, marge)`.

- [ ] Tests : post-révélation offre ≤ 110 % → conclu au montant offert ; > 110 % → flux normal ; margeBoniment(49)=1.05 / (50)=1.15 → FAIL → implémenter → PASS
- [ ] Page journee : passer `plafondRevele: revelationFaite` ; `appliquerBoniment(negoVente, offreJoueur, margeBoniment(niveau))`
- [ ] Descriptions (Diplomate FR + 3 langues : mentionner « jusqu'à 110 % de ce plafond »)
- [ ] Commit `feat(vente): Diplomate accepte 110 % du plafond révélé, Boniment 105 % avant N50`

### Task 7 : R3 — Le Flair v2 (plancher vendeur)

**Files:**
- Modify: `src/app/chiner/[brocanteId]/ClientPage.tsx` (état `flairPlancherIds`, `jouerFlair` bi-mode), `src/components/mobile/chine/ChineSlide.tsx` (affichage plancher), `src/lib/i18n/ui/{fr,en,es,el}.ts` (libellés)
- Test: test du composant ou de la page selon l'existant (`src/components/mobile/chine/*.test.tsx`)

Logique : si la cote de l'objet courant n'est pas connue → révéler la cote (mode actuel) ; sinon → révéler le plancher (`prixMinAccept`, affiché à côté de la cote). Le bouton du dock n'est bloqué que si cote ET plancher sont connus.

- [ ] Tests → FAIL → implémenter → PASS
- [ ] Commit `feat(chine): le Flair révèle le prix plancher quand la cote est déjà connue`

### Task 8 : R5 — Estimateur de bourse enrichi

**Files:**
- Modify: `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` (info persona → catégories), `src/components/mobile/PersonaInfoOverlay.tsx` (lignes Aime/Évite), `src/lib/i18n/ui/{fr,en,es,el}.ts`, description du palier (data + overlays)
- Test: existant sur PersonaInfoOverlay si présent, sinon test ciblé

Affichage dans la fiche, sous la bourse : « Aime : {cats} » / « Évite : {cats} » (listes du persona, localisées via les libellés de catégorie existants ; masqué si liste vide).

- [ ] Tests → FAIL → implémenter → PASS
- [ ] Commit `feat(vente): l'Estimateur de bourse révèle aussi les goûts du client`

### Task 9 : Passe finale

- [ ] `npx vitest run --maxWorkers=4` (suite complète, ~1851+ tests) → PASS
- [ ] `npx eslint src` → clean
- [ ] Mettre à jour la mémoire (audit-competences-2026-08-06.md → statut implémenté)
- [ ] Push `feat/audit-competences` (PR à la main par Guillaume)
