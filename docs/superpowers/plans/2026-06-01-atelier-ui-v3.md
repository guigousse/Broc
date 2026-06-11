# Atelier UI v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal :** Introduire sous-onglets Restaurations/Démantèlement, filtrer la liste Restauration aux objets effectivement réalisables, confirmer toute action via BottomSheet, animer la transition vers Travaux ou vers l'engrenage, et ajouter deux sons (marteau / cassure).

**Architecture :** Aucune modif logique métier. Tout côté UI : 2 nouvelles méthodes son dans `audioManager`, 2 marqueurs DOM `data-fly-target` pour les cibles d'animation, refonte de la zone sous "Travaux en cours" en sous-onglets, BottomSheet de confirmation pour la restauration, helper d'animation custom pour le démantèlement (clone du `PieceIcon` qui vole + badge `+N` à l'arrivée).

**Tech Stack :** Next.js 16, React 19, TypeScript, lucide-react, AudioContext WebAudio API.

**Spec :** `docs/superpowers/specs/2026-06-01-atelier-ui-v3-design.md`

---

### Task 1 : Sons + assets MP3

**Files :**
- Copy : `~/Desktop/freesound_community-repair_metal-85833.mp3` → `public/sounds/repair.mp3`
- Copy : `~/Desktop/nematoki-wooden-branch-breaks-493323.mp3` → `public/sounds/break.mp3`
- Modify : `src/lib/audio/audioManager.ts`

- [ ] **Step 1 : Copier les MP3 dans `public/sounds/`**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
cp "/Users/guillaume/Desktop/freesound_community-repair_metal-85833.mp3" public/sounds/repair.mp3
cp "/Users/guillaume/Desktop/nematoki-wooden-branch-breaks-493323.mp3" public/sounds/break.mp3
ls -la public/sounds/
```

Attendu : 4 fichiers (`break.mp3`, `cash.mp3`, `crowd.mp3`, `repair.mp3`).

- [ ] **Step 2 : Ajouter `playRepair()` et `playBreak()` au manager**

Dans `src/lib/audio/audioManager.ts`, juste après la méthode `playCash()` (autour de la ligne 178), insérer :

```ts
  async playRepair(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/repair.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }

  async playBreak(): Promise<void> {
    if (!this.prefs.clic) return;
    this.ensureCtx();
    if (!this.ctx || !this.master) return;
    const buf = await this.loadBuffer("/sounds/break.mp3");
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
  }
```

- [ ] **Step 3 : Typecheck**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add public/sounds/repair.mp3 public/sounds/break.mp3 src/lib/audio/audioManager.ts
git commit -m "$(cat <<'EOF'
audio(atelier): sons repair et break + méthodes playRepair/playBreak

Assets MP3 ajoutés à public/sounds/. audioManager expose deux nouvelles
méthodes asynchrones sur le même pattern que playCash (loadBuffer +
BufferSource → master). Gating par prefs.clic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Marqueurs DOM `data-fly-target`

**Files :**
- Modify : `src/components/atelier/PiecesInventoryBar.tsx`
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Ajouter `data-fly-target="piece-{cat}"` sur chaque cellule de PiecesInventoryBar**

Dans `src/components/atelier/PiecesInventoryBar.tsx`, sur le `<div role="listitem"`, ajouter l'attribut data :

```tsx
        <div
          key={cat}
          role="listitem"
          data-fly-target={`piece-${cat}`}
          title={`${cat} : ${pieces[cat] ?? 0} pièces`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 0,
          }}
        >
```

(Juste insérer la ligne `data-fly-target={`piece-${cat}`}` après `role="listitem"`. Garder le reste intact.)

- [ ] **Step 2 : Ajouter `data-fly-target="travaux"` sur le titre de section**

Dans `src/app/atelier/page.tsx`, trouver `<h2 style={sectTitle}>— Travaux en cours —</h2>` et le remplacer par :

```tsx
      <h2 style={sectTitle} data-fly-target="travaux">— Travaux en cours —</h2>
```

- [ ] **Step 3 : Typecheck**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/atelier/PiecesInventoryBar.tsx src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): cibles data-fly-target pour les animations

PiecesInventoryBar : chaque cellule porte data-fly-target=piece-{cat}.
H2 "Travaux en cours" : data-fly-target=travaux.
Pas de changement visuel, ces marqueurs servent aux animations
de la v3 (vol pièce vers engrenage, vol objet vers Travaux).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3 : Sous-onglets + filtre Restaurations

**Files :**
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Ajouter le state d'onglet**

Dans `AtelierPage`, juste après les `useState` existants (autour des states `flash` et `demantelerCible`), ajouter :

```ts
  const [onglet, setOnglet] = useState<"restaurations" | "demantelement">("restaurations");
```

- [ ] **Step 2 : Renforcer le filtre `restaurables`**

Trouver le `useMemo` qui calcule `restaurables` (vers la ligne 56). Le remplacer **intégralement** par :

```ts
  const restaurables = useMemo(() => {
    if (!state) return [];
    return state.inventaireJoueur.filter((o) => {
      if (o.enRestauration) return false;
      const cible =
        o.etat === "Mauvais"
          ? "Bon"
          : o.etat === "Bon"
            ? "Très bon"
            : o.etat === "Très bon"
              ? "Pristin état"
              : null;
      if (!cible) return false;
      const peutCompetence =
        (o.etat === "Mauvais" &&
          peutRestaurerMauvaisVersBon(state, o.categorie)) ||
        (o.etat === "Bon" &&
          peutRestaurerBonVersTresBon(state, o.categorie)) ||
        (o.etat === "Très bon" &&
          peutRestaurerTresBonVersPristin(state, o.categorie));
      if (!peutCompetence) return false;
      const cout = coutAmelioration(o, cible);
      const dispo = state.piecesAmelioration[o.categorie] ?? 0;
      return dispo >= cout;
    });
  }, [state]);
```

- [ ] **Step 3 : Remplacer la zone "Restaurations possibles" + "Démantèlement" par les sous-onglets**

Trouver le bloc qui commence par `<h2 style={sectTitle}>— Restaurations possibles —</h2>` jusqu'à la fin du rendu de la section Démantèlement (juste avant le `<BottomSheet ...>` qui gère `demantelerCible`).

Remplacer **intégralement** ce bloc par :

```tsx
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          marginTop: 14,
          marginBottom: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setOnglet("restaurations")}
          aria-pressed={onglet === "restaurations"}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--brass-500)",
            background:
              onglet === "restaurations"
                ? "var(--forest-800)"
                : "var(--paper-100)",
            color:
              onglet === "restaurations"
                ? "var(--brass-300)"
                : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Restaurations
        </button>
        <button
          type="button"
          onClick={() => setOnglet("demantelement")}
          aria-pressed={onglet === "demantelement"}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--brass-500)",
            background:
              onglet === "demantelement"
                ? "var(--forest-800)"
                : "var(--paper-100)",
            color:
              onglet === "demantelement"
                ? "var(--brass-300)"
                : "var(--ink-500)",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Démantèlement
        </button>
      </div>

      {onglet === "restaurations" ? (
        restaurables.length === 0 ? (
          <div style={cardWrap}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--ink-500)",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              Aucune pièce à restaurer.
            </p>
          </div>
        ) : (
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
              const disabled = pleine;
              return (
                <AtelierItemRow
                  key={o.id}
                  objet={o}
                  etatCible={cible}
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
                      {duree} j. · valeur {o.prixReferenceReel} →{" "}
                      <span style={{ color: "var(--brass-700)" }}>
                        {prixApres} €
                      </span>
                    </div>
                  }
                  action={
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        const rowEl = (e.currentTarget as HTMLElement).closest(
                          "[data-atelier-row]",
                        ) as HTMLElement | null;
                        const thumb = rowEl?.querySelector(
                          "[data-atelier-thumb]",
                        ) as HTMLElement | null;
                        setRestaurerCible({
                          objet: o,
                          etatCible: cible,
                          cout,
                          thumbRect: thumb?.getBoundingClientRect() ?? null,
                        });
                      }}
                      aria-label={`Confirmer la restauration — coût ${cout} pièces ${o.categorie}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 6px",
                        border: "1px solid var(--brass-500)",
                        background: disabled
                          ? "var(--paper-200)"
                          : "var(--forest-800)",
                        color: disabled ? "var(--ink-500)" : "var(--brass-300)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.7 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        −{cout}
                      </span>
                      <PieceIcon categorie={o.categorie} size={22} />
                    </button>
                  }
                />
              );
            })}
          </div>
        )
      ) : demantelables.length === 0 ? (
        <div style={{ ...cardWrap, borderColor: "var(--vermillion-600)" }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "var(--ink-500)",
              textAlign: "center",
              padding: "12px 0",
            }}
          >
            Aucun objet à démanteler en stock.
          </p>
        </div>
      ) : (
        <div style={{ ...cardWrap, borderColor: "var(--vermillion-600)" }}>
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
                    valeur {o.prixReferenceReel} €
                  </span>
                }
                action={
                  <button
                    type="button"
                    onClick={(e) => {
                      const rowEl = (e.currentTarget as HTMLElement).closest(
                        "[data-atelier-row]",
                      ) as HTMLElement | null;
                      const thumb = rowEl?.querySelector(
                        "[data-atelier-thumb]",
                      ) as HTMLElement | null;
                      setDemantelerCible({
                        objet: o,
                        yieldPieces,
                        thumbRect: thumb?.getBoundingClientRect() ?? null,
                      });
                    }}
                    aria-label={`Démanteler — rendement ${yieldPieces} pièces ${o.categorie}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 6px",
                      border: "1px solid var(--brass-500)",
                      background: "var(--brass-600)",
                      color: "var(--paper-100)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      +{yieldPieces}
                    </span>
                    <PieceIcon categorie={o.categorie} size={22} />
                  </button>
                }
              />
            );
          })}
        </div>
      )}
```

Note 1 : ce bloc utilise un nouveau state `restaurerCible` et change le type de `demantelerCible`. Voir Task 4 pour la déclaration.

Note 2 : il utilise les attributs `data-atelier-row` et `data-atelier-thumb` qui sont ajoutés en Task 4 sur `AtelierItemRow`.

- [ ] **Step 4 : Vérifier**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit 2>&1 | head -20
```

Attendu : il y aura des erreurs car `restaurerCible`, `setRestaurerCible`, `data-atelier-row`, `data-atelier-thumb` ne sont pas encore définis. C'est normal — ces erreurs seront résolues par Task 4. Vérifier que les erreurs portent UNIQUEMENT sur ces noms (pas d'autre régression).

- [ ] **Step 5 : Commit (intermédiaire)**

```bash
git add src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
ui(atelier): sous-onglets Restaurations/Démantèlement + filtre pièces

State onglet (restaurations | demantelement, défaut restaurations).
Liste restaurables désormais filtrée aux objets avec pièces suffisantes
(et compétence). Empty state "Aucune pièce à restaurer.".
La carte d'objets Démantèlement reçoit une bordure rouge vermillon
quand l'onglet est actif.

Note: introduit des références à restaurerCible/setRestaurerCible et
data-atelier-row/thumb qui seront définis dans le commit suivant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4 : State + marqueurs DOM pour AtelierItemRow + BottomSheet restauration + animation

**Files :**
- Modify : `src/components/atelier/AtelierItemRow.tsx`
- Modify : `src/app/atelier/page.tsx`

- [ ] **Step 1 : Ajouter les attributs DOM à `AtelierItemRow`**

Dans `src/components/atelier/AtelierItemRow.tsx`, trouver le `<div>` racine de la ligne (celui qui a `style={{ ...row, borderBottom: ... }}`) et ajouter l'attribut `data-atelier-row`. Puis ajouter `data-atelier-thumb` sur le `<div style={thumbStyle}>`.

Concrètement, modifier les deux div en :

```tsx
    <div
      data-atelier-row
      style={{
        ...row,
        borderBottom: isLast ? "none" : "1px dotted var(--paper-500)",
      }}
    >
      <div data-atelier-thumb style={thumbStyle}>
```

- [ ] **Step 2 : Mettre à jour les states dans la page**

Dans `src/app/atelier/page.tsx`, trouver le state existant :

```ts
  const [demantelerCible, setDemantelerCible] = useState<Objet | null>(null);
```

Et le remplacer par les 2 states suivants :

```ts
  const [restaurerCible, setRestaurerCible] = useState<{
    objet: Objet;
    etatCible: EtatObjet;
    cout: number;
    thumbRect: DOMRect | null;
  } | null>(null);
  const [demantelerCible, setDemantelerCible] = useState<{
    objet: Objet;
    yieldPieces: number;
    thumbRect: DOMRect | null;
  } | null>(null);
```

- [ ] **Step 3 : Mettre à jour les handlers**

Le handler `handleConfirmDemanteler` existant (autour des lignes 93-103) doit être adapté car le shape de `demantelerCible` a changé. Le remplacer par :

```ts
  const handleConfirmDemanteler = () => {
    if (!demantelerCible) return;
    const { objet, yieldPieces, thumbRect } = demantelerCible;
    void audioManager.playBreak();
    setDemantelerCible(null);
    if (thumbRect) {
      const target = document.querySelector(
        `[data-fly-target="piece-${objet.categorie}"]`,
      ) as HTMLElement | null;
      if (target) {
        const toRect = target.getBoundingClientRect();
        const clone = document.createElement("div");
        const COG_SIZE = 28;
        Object.assign(clone.style, {
          position: "fixed",
          left: `${thumbRect.left + thumbRect.width / 2 - COG_SIZE / 2}px`,
          top: `${thumbRect.top + thumbRect.height / 2 - COG_SIZE / 2}px`,
          width: `${COG_SIZE}px`,
          height: `${COG_SIZE}px`,
          borderRadius: "50%",
          background: "var(--paper-100)",
          border: "1.5px solid var(--brass-700)",
          boxShadow: "0 4px 10px rgba(40,25,5,0.30)",
          zIndex: "9999",
          pointerEvents: "none",
          transition:
            "left 620ms cubic-bezier(0.55,0,0.45,1), top 620ms cubic-bezier(0.45,0,0.55,1), opacity 250ms ease-in 400ms, transform 620ms ease-in-out",
        });
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            clone.style.left = `${toRect.left + toRect.width / 2 - COG_SIZE / 2}px`;
            clone.style.top = `${toRect.top + toRect.height / 2 - COG_SIZE / 2}px`;
            clone.style.transform = "scale(0.6) rotate(-90deg)";
            clone.style.opacity = "0";
          });
        });
        window.setTimeout(() => {
          clone.remove();
          target.classList.remove("broc-pulse-once");
          void target.offsetWidth;
          target.classList.add("broc-pulse-once");
          void audioManager.playPickup();
          window.setTimeout(
            () => target.classList.remove("broc-pulse-once"),
            650,
          );
        }, 620);
      }
    }
    window.setTimeout(() => {
      const res = demantelerObjet(objet.id);
      if (res.ok) {
        setFlash(`${objet.nom} démantelé · +${res.pieces} ⚙ ${objet.categorie}.`);
      } else {
        setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
      }
      setTimeout(() => setFlash(null), 2500);
    }, 620);
  };
```

Et juste après, ajouter le nouveau handler de confirmation restauration :

```ts
  const handleConfirmRestaurer = () => {
    if (!restaurerCible) return;
    const { objet, etatCible, thumbRect } = restaurerCible;
    void audioManager.playRepair();
    setRestaurerCible(null);
    if (thumbRect) {
      const target = document.querySelector(
        '[data-fly-target="travaux"]',
      ) as HTMLElement | null;
      if (target) {
        const toRect = target.getBoundingClientRect();
        const isUnique = !!getTemplate(objet.templateId)?.unique;
        const rarity = getRarityColors(objet.rarete, isUnique);
        const clone = document.createElement("div");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${thumbRect.left}px`,
          top: `${thumbRect.top}px`,
          width: `${thumbRect.width}px`,
          height: `${thumbRect.height}px`,
          background: rarity.thumbBg,
          border: `1.5px solid ${rarity.outer}`,
          boxSizing: "border-box",
          zIndex: "9999",
          pointerEvents: "none",
          boxShadow:
            "0 8px 18px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
          transition:
            "left 620ms cubic-bezier(0.55,0,0.45,1), top 620ms cubic-bezier(0.45,0,0.55,1), width 620ms ease-in, height 620ms ease-in, opacity 620ms ease-in",
        });
        const imgUrl = getItemImageUrl(objet.templateId);
        if (imgUrl) {
          clone.style.backgroundImage = `url(${imgUrl})`;
          clone.style.backgroundSize = "cover";
          clone.style.backgroundPosition = "center";
        }
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const SZ = 18;
            clone.style.left = `${toRect.left + toRect.width / 2 - SZ / 2}px`;
            clone.style.top = `${toRect.top + toRect.height / 2 - SZ / 2}px`;
            clone.style.width = `${SZ}px`;
            clone.style.height = `${SZ}px`;
            clone.style.opacity = "0.4";
          });
        });
        window.setTimeout(() => clone.remove(), 640);
      }
    }
    window.setTimeout(() => {
      const res = restaurerObjet(objet.id, etatCible);
      if (res.ok) {
        setFlash(`${objet.nom} en restauration · ${etatCible} dans 7 j.`);
      } else {
        setFlash(`Impossible : ${res.raison ?? "condition non remplie"}`);
      }
      setTimeout(() => setFlash(null), 2500);
    }, 620);
  };
```

Le handler `handleRestaurer` existant n'est plus appelé depuis le bouton (il est remplacé par la BottomSheet). Il peut être supprimé. Trouver et supprimer la fonction `handleRestaurer` (autour des lignes 105-112).

- [ ] **Step 4 : Imports nécessaires dans `src/app/atelier/page.tsx`**

Ajouter dans la zone d'imports (s'ils ne sont pas déjà là) :

```ts
import { audioManager } from "@/lib/audio/audioManager";
import { getRarityColors } from "@/lib/rarityColors";
import { getItemImageUrl } from "@/lib/itemImages";
import { getTemplate } from "@/data/objetTemplates";
```

- [ ] **Step 5 : BottomSheet de confirmation Restauration**

Trouver le `<BottomSheet>` existant qui gère `demantelerCible !== null`. Juste après sa fermeture `</BottomSheet>`, ajouter un nouveau BottomSheet pour la restauration :

```tsx
      <BottomSheet
        open={restaurerCible !== null}
        onClose={() => setRestaurerCible(null)}
        title="Restauration"
      >
        {restaurerCible && (
          <div style={{ padding: "8px 16px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-700)",
                marginBottom: 10,
              }}
            >
              Restaurer <strong>{restaurerCible.objet.nom}</strong> en{" "}
              <strong>{restaurerCible.etatCible}</strong> prend{" "}
              <strong>7 jours</strong> et coûte{" "}
              <strong>
                {restaurerCible.cout} ⚙ {restaurerCible.objet.categorie}
              </strong>
              .
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setRestaurerCible(null)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-200)",
                  color: "var(--ink-700)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRestaurer}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
```

- [ ] **Step 6 : Mettre à jour le BottomSheet de Démantèlement (shape changé)**

Le BottomSheet existant utilisait `demantelerCible.nom` directement. Maintenant `demantelerCible.objet.nom`. Et il utilisait `rendementDemantelement(demantelerCible)` — maintenant c'est `demantelerCible.yieldPieces`. Trouver le `<BottomSheet open={demantelerCible !== null} ...>` et remplacer le corps `{demantelerCible && (...)}` par :

```tsx
        {demantelerCible && (
          <div style={{ padding: "8px 16px 16px" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13,
                color: "var(--ink-700)",
                marginBottom: 10,
              }}
            >
              Démanteler <strong>{demantelerCible.objet.nom}</strong> rend{" "}
              <strong>
                {demantelerCible.yieldPieces} ⚙ {demantelerCible.objet.categorie}
              </strong>
              . L'objet sera détruit définitivement.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setDemantelerCible(null)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--paper-200)",
                  color: "var(--ink-700)",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDemanteler}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 10.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  border: "1px solid var(--brass-500)",
                  background: "var(--forest-800)",
                  color: "var(--brass-300)",
                  cursor: "pointer",
                }}
              >
                Démanteler
              </button>
            </div>
          </div>
        )}
```

- [ ] **Step 7 : Vérifier (typecheck + build)**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
npx tsc --noEmit
npm run build 2>&1 | tail -10
```

Attendu : 0 erreur, build OK.

- [ ] **Step 8 : Commit**

```bash
git add src/components/atelier/AtelierItemRow.tsx src/app/atelier/page.tsx
git commit -m "$(cat <<'EOF'
feat(atelier): BottomSheet restauration + animations + sons (UI v3)

AtelierItemRow expose data-atelier-row / data-atelier-thumb pour
capturer le rect du thumb depuis le bouton.

restaurerCible / demantelerCible reformés en {objet, ..., thumbRect}.

handleConfirmRestaurer :
- joue audioManager.playRepair()
- clone le thumb, l'anime vers H2 "Travaux en cours" (620ms)
- appelle restaurerObjet à la fin de l'animation
BottomSheet de confirmation : "Restaurer X en Y prend 7j et coûte N ⚙".

handleConfirmDemanteler (refactor) :
- joue audioManager.playBreak()
- crée un clone d'engrenage qui vole vers data-fly-target="piece-{cat}"
- à l'arrivée : pulsation + audioManager.playPickup()
- appelle demantelerObjet à la fin de l'animation.

Suppression du handler handleRestaurer direct (remplacé par la flow
confirm + animation).

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

Ouvrir http://localhost:3000/atelier en viewport mobile 360×640.

- [ ] **Step 2 : Scénarios manuels**

1. **Onglet par défaut** : à l'arrivée sur la page, l'onglet `RESTAURATIONS` est actif (fond forêt), `DÉMANTÈLEMENT` inactif.
2. **Bascule d'onglet** : clic sur `DÉMANTÈLEMENT` → fond se rectangulaire, carte d'objets passe en bordure rouge vermillon, contenu change.
3. **Filtre Restauration** : avoir un objet restaurable avec compétence mais 0 pièce de sa catégorie → l'objet n'apparaît PAS dans la liste. Empty state si liste vide : "Aucune pièce à restaurer.".
4. **Confirmation restauration** : tap sur le bouton `−N ⚙` → BottomSheet s'ouvre avec le texte "Restaurer X en Y prend 7j et coûte N ⚙ catégorie.". Annuler ne change rien.
5. **Animation restauration** : sur Confirmer → son métal (`repair.mp3`), thumb se clone et vole vers le titre "Travaux en cours" (~620ms), BottomSheet se ferme, l'objet apparaît dans Travaux à la fin de l'animation, flash s'affiche.
6. **Animation démantèlement** : depuis l'onglet Démantèlement → tap sur `+N ⚙` → BottomSheet de confirmation, sur Confirmer → son bois cassé (`break.mp3`), clone d'engrenage vole vers la cellule de l'engrenage de la catégorie en haut, pulsation de la cellule à l'arrivée + petit `playPickup` (arpège), compteur incrémenté, flash s'affiche.
7. **Préférence audio désactivée** : couper l'audio (depuis les réglages) → les sons ne se jouent plus mais les animations restent visibles.
8. **Pas de leak DOM** : ouvrir DevTools → Elements, faire 3-4 démantèlements/restaurations enchaînés → vérifier que les clones se nettoient (aucun `<div style="position: fixed">` orphelin).

- [ ] **Step 3 : Fixes éventuels**

Si un scénario échoue, fix en commits séparés (un par bug).

- [ ] **Step 4 : Récap**

```bash
cd "/Users/guillaume/Documents/01_Personnel/07_Loisirs/01_Création/Projet Broc"
git log --oneline fe072bb..HEAD
```

Attendu : 4-5 commits.

---

## Hors-scope v3

- Variation sonore selon rareté.
- Cascade de pièces (un seul vol agrégé adopté).
- Animation au retour d'un objet restauré (fin de chantier — comportement actuel conservé).
- Pastilles compteur sur les sous-onglets.
- Réordonnancement des objets dans Travaux.
