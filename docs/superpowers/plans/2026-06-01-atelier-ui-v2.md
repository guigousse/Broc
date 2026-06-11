# Atelier UI v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal :** Refondre l'UI de la page Atelier : header 3 colonnes (`Établi N/M · — ATELIER — · ↑ LVL2/cout`), engrenages stylisés via `<Cog />` lucide, suppression du bandeau LVL redondant, lignes objet façon Stockage (thumbnail rareté + étoiles + actions iconographiques).

**Architecture :** Toute la logique métier (helpers `coutAmelioration`, `rendementDemantelement`, actions `restaurerObjet`, `demantelerObjet`) reste inchangée. Trois fichiers UI touchés : `PiecesInventoryBar` (gear visuel), nouveau composant `AtelierItemRow` (variant `travaux | restauration | demantelement`), refonte de `src/app/atelier/page.tsx` (header + suppression bandeau + usage du nouveau composant).

**Tech Stack :** Next.js 16, React 19, TypeScript, lucide-react 1.16.0.

**Spec :** `docs/superpowers/specs/2026-06-01-atelier-ui-v2-design.md`

---

### Task 1 : PiecesInventoryBar — engrenage Cog

**Files :**
- Modify : `src/components/atelier/PiecesInventoryBar.tsx`

- [ ] **Step 1 : Réécrire le composant**

Remplacer intégralement le contenu de `src/components/atelier/PiecesInventoryBar.tsx` par :

```tsx
"use client";

import { Cog } from "lucide-react";
import type { CategorieObjet } from "@/types/game";
import { CATEGORIES } from "@/data/categories";
import { CategorieIcon } from "@/components/ui/CategorieIcon";

interface PiecesInventoryBarProps {
  pieces: Record<CategorieObjet, number>;
}

const COG_SIZE = 42;
const ICON_SIZE = 18;

/**
 * Bandeau horizontal des 7 catégories sous forme d'engrenages laiton.
 * Chaque case = <Cog /> lucide (stroke laiton) + <CategorieIcon /> centrée
 * + compteur monospace en dessous. Scroll horizontal sur viewport étroit.
 */
export function PiecesInventoryBar({ pieces }: PiecesInventoryBarProps) {
  return (
    <div
      role="list"
      aria-label="Inventaire de pièces d'amélioration"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "6px 2px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CATEGORIES.map((cat) => (
        <div
          key={cat}
          role="listitem"
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            flex: "0 0 auto",
            width: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "relative",
              width: COG_SIZE,
              height: COG_SIZE,
              display: "grid",
              placeItems: "center",
              filter: "drop-shadow(0 1px 1px rgba(40,25,5,0.30))",
            }}
          >
            <Cog
              size={COG_SIZE}
              strokeWidth={1.5}
              color="var(--brass-700)"
              fill="var(--paper-100)"
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "grid",
                placeItems: "center",
                lineHeight: 0,
              }}
            >
              <CategorieIcon
                categorie={cat}
                size={ICON_SIZE}
                strokeWidth={1.6}
                color="var(--forest-800)"
              />
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-700)",
              letterSpacing: "0.04em",
            }}
          >
            {pieces[cat] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/atelier/PiecesInventoryBar.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): engrenage Cog lucide + drop-shadow remplace le cercle

PiecesInventoryBar utilise désormais <Cog /> lucide (42px, stroke laiton,
fill paper-100) comme silhouette d'arrière-plan, avec <CategorieIcon />
centrée (forest-800). Drop-shadow discret pour la profondeur. Largeur
de case 50px → tient sur 360px de viewport avec léger scroll.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Composant `AtelierItemRow`

**Files :**
- Create : `src/components/atelier/AtelierItemRow.tsx`

- [ ] **Step 1 : Créer le composant partagé**

Créer `src/components/atelier/AtelierItemRow.tsx` avec :

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { Star } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import type { EtatObjet, Objet } from "@/types/game";

interface AtelierItemRowProps {
  objet: Objet;
  /** Ligne contextuelle (état → cible, durée, prix, etc.). */
  metaLigne: ReactNode;
  /** Zone d'action à droite (bouton ou badge texte). */
  action: ReactNode;
  /** Affiche un séparateur sous la ligne (false sur la dernière). */
  isLast: boolean;
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "48px 1fr auto",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
};

const thumbBase: CSSProperties = {
  width: 48,
  height: 48,
  display: "grid",
  placeItems: "center",
};

function etoileCount(etat: EtatObjet): number {
  switch (etat) {
    case "Mauvais":
      return 0;
    case "Bon":
      return 1;
    case "Très bon":
      return 2;
    case "Pristin état":
      return 3;
  }
}

/**
 * Ligne d'objet réutilisable par les 3 sections de la page Atelier
 * (Travaux en cours, Restaurations possibles, Démantèlement).
 * Layout calqué sur `StockageItemRow` (thumb 48×48 + nom + étoiles +
 * CategorieIcon) mais sans swipe — l'action droite est toujours visible.
 */
export function AtelierItemRow({
  objet,
  metaLigne,
  action,
  isLast,
}: AtelierItemRowProps) {
  const isUnique = !!getTemplate(objet.templateId)?.unique;
  const rarityColors = getRarityColors(objet.rarete, isUnique);
  const thumbStyle: CSSProperties = {
    ...thumbBase,
    background: rarityColors.thumbBg,
    border: `1px solid ${rarityColors.outer}`,
  };

  return (
    <div
      style={{
        ...row,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div style={thumbStyle}>
        <ItemImage
          templateId={objet.templateId}
          categorie={objet.categorie}
          fit="cover"
          fallbackIconSize={20}
          fallbackIconColor={rarityColors.thumbIcon}
          alt={objet.nom}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--forest-800)",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {objet.nom}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
          aria-label={`État ${objet.etat}, catégorie ${objet.categorie}`}
        >
          <span style={{ display: "flex", gap: 1 }} aria-label={`État : ${objet.etat}`}>
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                size={12}
                strokeWidth={1.8}
                fill={
                  i < etoileCount(objet.etat)
                    ? rarityColors.outer
                    : "transparent"
                }
                color={rarityColors.outer}
              />
            ))}
          </span>
          <CategorieIcon
            categorie={objet.categorie}
            size={14}
            strokeWidth={1.5}
            color="var(--brass-700)"
          />
        </div>
        <div style={{ marginTop: 4 }}>{metaLigne}</div>
      </div>
      <div>{action}</div>
    </div>
  );
}
```

- [ ] **Step 2 : Typecheck**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/atelier/AtelierItemRow.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): composant AtelierItemRow (thumb + meta + action)

Layout calqué sur StockageItemRow (48×48 thumbnail couleur rareté,
nom en display uppercase, étoiles + CategorieIcon). metaLigne et
action passés en ReactNode pour adapter chaque section
(travaux / restauration / démantèlement) sans dupliquer le markup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Refonte header + suppression bandeau LVL

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Ajouter l'import `ArrowUp` lucide**

Dans `src/app/atelier/page.tsx`, trouver la ligne d'imports lucide (s'il y en a). Sinon, après la ligne `import { BottomSheet } from "@/components/mobile/BottomSheet";`, ajouter :

```ts
import { ArrowUp } from "lucide-react";
```

- [ ] **Step 2 : Réécrire le contenu de `<StickyTop>` en 3 colonnes**

Trouver le bloc `stickyTop={ <StickyTop> ... </StickyTop> }` (autour des lignes 121-167 actuellement). Le remplacer **intégralement** par :

```tsx
      stickyTop={
        <StickyTop>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--forest-800)",
                textAlign: "left",
              }}
            >
              Établi {enCours.length}/{ATELIER_SLOTS[state.niveauAtelier]}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--brass-700)",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              — Atelier —
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {(() => {
                const up = getProchaineUpgrade(state.niveauAtelier);
                if (!up) {
                  return (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--brass-700)",
                        padding: "6px 10px",
                      }}
                    >
                      MAX
                    </span>
                  );
                }
                const peut = state.budget >= up.cout;
                return (
                  <button
                    type="button"
                    disabled={!peut}
                    onClick={() => {
                      const res = ameliorerAtelier();
                      if (!res.ok) setFlash(res.raison ?? "Impossible");
                      else setFlash(`Atelier amélioré au LVL ${up.niveauCible}.`);
                      setTimeout(() => setFlash(null), 2500);
                    }}
                    aria-label={`Améliorer atelier vers LVL ${up.niveauCible} (${up.cout} €)`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      padding: "4px 10px",
                      border: "1px solid var(--brass-500)",
                      background: peut ? "var(--forest-800)" : "var(--paper-200)",
                      color: peut ? "var(--brass-300)" : "var(--ink-500)",
                      cursor: peut ? "pointer" : "not-allowed",
                      opacity: peut ? 1 : 0.6,
                      lineHeight: 1.1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 9.5,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <ArrowUp size={11} strokeWidth={2} />
                      LVL{up.niveauCible}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {up.cout} €
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>
        </StickyTop>
      }
```

- [ ] **Step 3 : Supprimer le bandeau "Atelier LVL X"**

Toujours dans `src/app/atelier/page.tsx`, juste après `<PiecesInventoryBar pieces={state.piecesAmelioration} />`, supprimer **entièrement** le bloc qui suit :

```tsx
          <div
            style={{
              border: "1px solid var(--brass-500)",
              background: "var(--paper-100)",
              padding: "10px 14px",
              ...
            }}
          >
            <div>
              <div style={{ ... fontSize: 11 ... }}>
                Atelier LVL {state.niveauAtelier}
              </div>
              ...
            </div>
            {(() => {
              const up = getProchaineUpgrade(state.niveauAtelier);
              ...
            })()}
          </div>
```

Concrètement : retirer toutes les lignes entre `<PiecesInventoryBar pieces={state.piecesAmelioration} />` (gardé) et `{flash && (` (gardé). Ce qui supprime ~85 lignes contenant le grand cadre laiton du LVL.

- [ ] **Step 4 : Typecheck + build**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
npm run build 2>&1 | tail -10
```

Attendu : 0 erreur, build OK.

- [ ] **Step 5 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): header 3 colonnes (Établi/Titre/Upgrade) + drop bandeau LVL

StickyTop : grid 3 colonnes. Gauche Établi N/M, centre — Atelier —,
droite bouton upgrade vertical (↑ LVL2 / 500 €) ou MAX. Suppression du
gros bandeau redondant qui affichait LVL + slots + bouton upgrade —
toute l'info est désormais dans le header.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : Sections Travaux / Restauration / Démantèlement via `AtelierItemRow`

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Imports**

Dans la zone d'imports de `src/app/atelier/page.tsx`, ajouter :

```ts
import { Hammer, Pickaxe } from "lucide-react";
import { AtelierItemRow } from "@/components/atelier/AtelierItemRow";
```

(Si `ArrowUp` est déjà importé via Task 3, fusionner sur la même ligne : `import { ArrowUp, Hammer, Pickaxe } from "lucide-react";`.)

- [ ] **Step 2 : Réécrire la section "Travaux en cours"**

Trouver le bloc qui rend `enCours.map((o, i) => { ... })` (avec le `<h2 style={sectTitle}>— Travaux en cours —</h2>` au-dessus). Remplacer **intégralement** le `<div style={cardWrap}>...</div>` (le wrapper conditionnel après le `enCours.length === 0 ? ... :`) par :

```tsx
        <div style={cardWrap}>
          {enCours.map((o, i) => {
            const fin = o.enRestauration!.jourFin;
            const restant = Math.max(0, fin - state.jourActuel);
            const ready = state.jourActuel >= fin;
            return (
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === enCours.length - 1}
                metaLigne={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {o.etat} → {o.enRestauration!.etatCible}
                    {" · "}
                    {ready ? "prêt ✓" : `fin jour N°${String(fin).padStart(3, "0")}`}
                  </span>
                }
                action={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: ready ? "var(--forest-700)" : "var(--brass-700)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ready ? "Prêt ✓" : `${restant} j. rest.`}
                  </span>
                }
              />
            );
          })}
        </div>
```

- [ ] **Step 3 : Réécrire la section "Restaurations possibles"**

Trouver `restaurables.map((o, i) => { ... })`. Remplacer **intégralement** le `<div style={cardWrap}>...</div>` conditionnel par :

```tsx
        <div style={cardWrap}>
          {restaurables.map((o, i) => {
            const cible: EtatObjet =
              o.etat === "Mauvais"
                ? "Bon"
                : o.etat === "Bon"
                  ? "Très bon"
                  : "Pristin état";
            const duree = dureeRestauration(state, o.categorie, cible);
            const prixApres = recalculerPrixReference(
              o.prixReferenceReel,
              o.etat,
              cible,
            );
            const cout = coutAmelioration(o, cible);
            const dispo = state.piecesAmelioration[o.categorie] ?? 0;
            const manquePieces = dispo < cout;
            const disabled = pleine || manquePieces;
            return (
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === restaurables.length - 1}
                metaLigne={
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {o.etat} → {cible} · {duree} j. · réf. {o.prixReferenceReel} →{" "}
                    <span style={{ color: "var(--brass-700)" }}>{prixApres} €</span>
                  </div>
                }
                action={
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRestaurer(o, cible)}
                    aria-label={`Lancer la restauration — coût ${cout} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      border: "1px solid var(--brass-500)",
                      background: disabled
                        ? "var(--paper-200)"
                        : "var(--forest-800)",
                      color: disabled ? "var(--ink-500)" : "var(--brass-300)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.7 : 1,
                    }}
                  >
                    <Hammer size={18} strokeWidth={1.5} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: manquePieces
                          ? "var(--rouge-700, #8b1a1a)"
                          : "inherit",
                      }}
                    >
                      {cout}
                      <CategorieIcon
                        categorie={o.categorie}
                        size={12}
                        strokeWidth={1.6}
                        color="currentColor"
                      />
                    </span>
                  </button>
                }
              />
            );
          })}
        </div>
```

Note : `CategorieIcon` doit être importé en haut du fichier. Ajouter à la zone d'imports si absent :
```ts
import { CategorieIcon } from "@/components/ui/CategorieIcon";
```

- [ ] **Step 4 : Réécrire la section "Démantèlement"**

Trouver `demantelables.map((o, i) => { ... })`. Remplacer **intégralement** le `<div style={cardWrap}>...</div>` conditionnel par :

```tsx
        <div style={cardWrap}>
          {demantelables.map((o, i) => {
            const yieldPieces = rendementDemantelement(o);
            return (
              <AtelierItemRow
                key={o.id}
                objet={o}
                isLast={i === demantelables.length - 1}
                metaLigne={
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9.5,
                      color: "var(--ink-500)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    réf. {o.prixReferenceReel} €
                  </span>
                }
                action={
                  <button
                    type="button"
                    onClick={() => setDemantelerCible(o)}
                    aria-label={`Démanteler — rendement ${yieldPieces} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 10px",
                      border: "1px solid var(--brass-500)",
                      background: "var(--brass-600)",
                      color: "var(--paper-100)",
                      cursor: "pointer",
                    }}
                  >
                    <Pickaxe size={18} strokeWidth={1.5} />
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      +{yieldPieces}
                      <CategorieIcon
                        categorie={o.categorie}
                        size={12}
                        strokeWidth={1.6}
                        color="currentColor"
                      />
                    </span>
                  </button>
                }
              />
            );
          })}
        </div>
```

- [ ] **Step 5 : Typecheck + build**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
npm run build 2>&1 | tail -10
```

Attendu : 0 erreur, build OK.

- [ ] **Step 6 : Commit**

```bash
git add src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): sections Travaux/Restauration/Démantèlement via AtelierItemRow

Les 3 sections utilisent désormais AtelierItemRow (thumbnail rareté +
étoiles + CategorieIcon). Boutons d'action iconographiques :
Restauration = <Hammer /> + N ⚙ catégorie (rouge si pièces manquantes).
Démantèlement = <Pickaxe /> + +N ⚙ catégorie (toujours actif).
Travaux affiche un badge texte "Prêt ✓" ou "N j. rest." à droite.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5 : Vérification manuelle

**Files :** aucun.

- [ ] **Step 1 : Lancer le dev server**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npm run dev
```

Ouvrir http://localhost:3000/atelier en viewport mobile 360×640 (DevTools responsive).

- [ ] **Step 2 : Scénarios à valider**

1. **Header 3 colonnes** : `Établi N/M` à gauche bien lisible, `— ATELIER —` centré, bouton upgrade vertical à droite (`↑ LVL2` au-dessus, `500 €` en dessous). Pas de chevauchement, pas de saut de ligne.
2. **Bouton upgrade désactivé** : si budget < cout, fond paper-200, ink-500, opacity ~0.6, cursor not-allowed. Aucun click ne se produit.
3. **Bouton upgrade MAX** : passer au LVL 3 (cheat localStorage si besoin) → la zone droite affiche juste `MAX`, plus de bouton.
4. **Engrenages** : 7 `<Cog />` visibles (ou scrollables) sous le header. Drop-shadow discret. `<CategorieIcon />` centrée par-dessus. Compteur sous l'engrenage.
5. **Suppression bandeau LVL** : aucun bloc "Atelier LVL X / N slots" entre le bandeau pièces et "Travaux en cours". L'enchaînement visuel doit être propre.
6. **Travaux en cours** : ligne avec thumbnail rareté (couleur correcte), étoiles selon état actuel, CategorieIcon, métaligne `état → cible · fin jour N°XXX`, badge droit `N j. rest.` ou `Prêt ✓` (vert quand prêt).
7. **Restaurations possibles** : ligne complète avec coût en pièces dans le bouton (rouge si insuffisant). Bouton désactivé en gris si pièces insuffisantes OU atelier plein. Tap → restauration lancée (flash + pièces décrémentées + bouton Lancer disparaît car objet passe en "Travaux en cours").
8. **Démantèlement** : ligne complète avec rendement dans le bouton. Tap → BottomSheet de confirmation s'ouvre comme avant. Confirmer démantèle, flash apparaît.
9. **Pastille TabBar** : objet prêt → onglet Atelier affiche son badge rouge (logique inchangée, vérifier pas de régression).
10. **Largeur 360** : aucun élément ne déborde horizontalement (sauf le bandeau pièces si on a 7 engrenages sur 360 — scroll horizontal OK).

- [ ] **Step 3 : Fixes éventuels**

Si un point échoue, corriger en commits séparés et concis. Pas de bundle de fixes.

- [ ] **Step 4 : Récap `git log`**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git log --oneline main..HEAD
```

Attendu : 4-6 commits selon ajustements, prêts pour merge.

---

## Hors-scope

- Animation flyToTab depuis l'atelier.
- Tap sur ligne objet → ouverture overlay détail.
- Drag-to-reorder ou swipe actions sur les lignes.
- Génération d'un PNG d'engrenage via Gemini (à tester plus tard si rendu lucide insuffisant).
