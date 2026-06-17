# Bureau — deux carnets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Sépare l'overlay `CarnetOverlay` en deux objets distincts sur le bureau — un **Cahier de Compte** par journée (avec replay `SessionSummary` au tap) et un **Carnet de Notes** rouge dédié aux missions — et redessine `SessionSummary` avec des vignettes kraft sur fond de papier brun.

**Architecture :**
- Modèle : ajout `templateId` à `ObjetSnapshot` (héritage `AchatHistorique`/`VenteHistorique`) et `xpGagne` à `SessionChinage`/`SessionVente`. Migration bump `SAVE_VERSION` → 4.
- Vue : helper pur `agregerJournees(grandLivre, historique)` → `JourneeHistorique[]` consommé par `CahierDeCompteOverlay`. Replay de `SessionSummary` (mode contextuel `retourLabel`) à l'intérieur de l'overlay.
- Bureau : asset existant `journal` repositionné, deux nouveaux assets (`porte-revues.webp` au sol près du fauteuil, `carnet-rouge.webp` à la place du journal). Nouveaux composants `QgPorteRevues`, `QgCarnetNotes`.
- Refactor : démantèlement de `CarnetOverlay` → `CahierDeCompteOverlay` + `CarnetNotesOverlay`, câblage dans `app/(panorama)/layout.tsx`.

**Tech Stack :** TypeScript / React 19 / Next.js 16 / Vitest + jsdom / CSS-in-JS inline.

**Référence design :** `docs/superpowers/specs/2026-06-18-bureau-deux-carnets-design.md`.

**Assets externes attendus (fournis hors code) :**
- `public/qg/porte-revues.webp` — panier ou support de revues, posé au sol.
- `public/qg/carnet-rouge.webp` — petit calepin cuir bordeaux, fermé par un élastique, ruban marque-page tissu.
- `public/textures/kraft.webp` — petite tile répétable, ton brun chaud, granularité légère.

**File Structure :**

| Fichier | Statut | Responsabilité |
|---|---|---|
| `src/types/game.ts` | Modifier | Ajoute `templateId` à `ObjetSnapshot` ; ajoute `xpGagne` à `SessionChinage`/`SessionVente`. |
| `src/lib/migrations.ts` | Modifier | Bump `SAVE_VERSION` → 4. Backfill `xpGagne: {}` et `templateId` (best-effort via `nom` → templateId si possible, sinon `"legacy"`). |
| `src/lib/migrations.test.ts` | Modifier | Tests de migration des nouveaux champs. |
| `src/lib/__test-fixtures__/gameState.ts` | (inchangé, déjà compatible) | — |
| `src/app/chiner/[brocanteId]/ClientPage.tsx` | Modifier | Passe `templateId` dans `enregistrerSession.achats[]`, passe `xpGagne` à la session, supprime `sousTitre` chinage. Passe `templateId` aux items `SessionSummary`. |
| `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx` | Modifier | Idem côté vente (templateId sur `VenteHistorique` + items SessionSummary + xpGagne dans la session). |
| `src/lib/historiqueJournalier.ts` | Créer | Helper pur `agregerJournees(grandLivre, historique)`. |
| `src/lib/historiqueJournalier.test.ts` | Créer | Tests d'agrégation (journées chinage/vente/repos/vides, tri). |
| `src/components/SessionSummary.tsx` | Modifier | Ajoute prop `retourLabel?`. Ajoute prop `templateId` sur `SummaryItem`. Remplace `CategorieIcon` par `ItemVignetteKraft`. Réduit taille du nom (13 → 11). Empty state XP différencié pour replay. |
| `src/components/ui/ItemVignetteKraft.tsx` | Créer | Composant petit : fond kraft (`/textures/kraft.webp`), image item en `object-fit: contain` avec offset translate(2px, 3px). Fallback `CategorieIcon`. |
| `src/components/ui/ItemVignetteKraft.test.tsx` | Créer | Snapshot/structure : image rendue, fallback si pas d'image. |
| `src/components/mobile/qg/layout.ts` | Modifier | Repositionne `journal` (sur porte-revues) ; ajoute `porteRevues` et `carnetRouge`. |
| `src/components/mobile/qg/QgPorteRevues.tsx` | Créer | Asset cliquable porte-revues. Le tap ouvre la Gazette (équivalent du QgJournal actuel). |
| `src/components/mobile/qg/QgCarnetNotes.tsx` | Créer | Asset cliquable carnet rouge avec deux décorations CSS conditionnelles : ruban dépassant (si livrable) + coin corné (si active non livrable). |
| `src/components/mobile/qg/QgJournal.tsx` | Modifier | Reposition (override taille / décalage) pour apparaître posé sur le porte-revues. Bouton conserve son `onTap`. |
| `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx` | Créer | Overlay parchemin mono-onglet — Historique journalier + replay `SessionSummary` intégré. |
| `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` | Créer | Overlay carnet rouge — missions en cours / terminées. |
| `src/components/mobile/qg/overlays/CarnetOverlay.tsx` | Supprimer | Remplacé. |
| `src/app/(panorama)/layout.tsx` | Modifier | Importe les deux overlays, ajoute `carnetNotesOuvert` state, monte `QgPorteRevues` + `QgCarnetNotes`, branche `livrerMission` sur le carnet de notes. |

---

## Task 1 — Modèle de données : `templateId` sur snapshot + `xpGagne` sur session + migration

**Files:**
- Modify : `src/types/game.ts`
- Modify : `src/lib/migrations.ts`
- Modify : `src/lib/migrations.test.ts`

- [ ] **Step 1 : Étend `ObjetSnapshot`, `SessionChinage`, `SessionVente`**

Dans `src/types/game.ts`, modifie :

```ts
export interface ObjetSnapshot {
  /** templateId source (ex. "out.scie_egoine_stanley"). Ajouté pour
   *  permettre la résolution d'image au replay. Pour les sessions migrées
   *  d'une ancienne save, vaut "legacy" (pas d'image disponible). */
  templateId: string;
  nom: string;
  categorie: CategorieObjet;
  etat: EtatObjet;
  prixReferenceReel: number;
}
```

```ts
export interface SessionChinage {
  id: string;
  type: "chinage";
  jour: number;
  timestamp: number;
  brocanteId: string;
  brocanteNom: string;
  achats: AchatHistorique[];
  /** XP gagné pendant cette session, indexé par arbre. Vide si pré-migration. */
  xpGagne: Record<CompetenceTreeId, number>;
}

export interface SessionVente {
  id: string;
  type: "vente";
  jour: number;
  timestamp: number;
  niveauCamion: NiveauCamion;
  loyer: number;
  ventes: VenteHistorique[];
  invendus: number;
  xpGagne: Record<CompetenceTreeId, number>;
}
```

- [ ] **Step 2 : Migration — bump version + backfill**

Dans `src/lib/migrations.ts`, à la ligne `export const SAVE_VERSION = 3;`, remplace par `= 4;`.

Dans le bloc de migration de `historique` (autour de la ligne 129), enrichis la map :

```ts
const historique = (loaded.historique ?? []).map((s) => {
  if (s.type === "chinage") {
    return {
      ...s,
      achats: s.achats.map((a) => ({
        templateId: (a as { templateId?: string }).templateId ?? "legacy",
        ...a,
        categorie: migrerCategorie(a.categorie),
        etat: migrerEtat(a.etat),
      })),
      xpGagne: (s as { xpGagne?: Record<string, number> }).xpGagne ?? {},
    };
  }
  return {
    ...s,
    ventes: s.ventes.map((v) => ({
      templateId: (v as { templateId?: string }).templateId ?? "legacy",
      ...v,
      categorie: migrerCategorie(v.categorie),
      etat: migrerEtat(v.etat),
    })),
    xpGagne: (s as { xpGagne?: Record<string, number> }).xpGagne ?? {},
  };
});
```

Attention à l'ordre du spread : `templateId` placé AVANT `...a` pour que si `a.templateId` existe il l'écrase (préserve le templateId existant).

- [ ] **Step 3 : Ajoute le test de migration**

Dans `src/lib/migrations.test.ts`, ajoute :

```ts
it("v3 → v4 : backfille xpGagne et templateId sur sessions existantes", () => {
  const v3Save = {
    version: 3,
    historique: [
      {
        id: "s1",
        type: "chinage",
        jour: 2,
        timestamp: 1000,
        brocanteId: "b",
        brocanteNom: "B",
        achats: [{ nom: "Truc", categorie: "Outillage", etat: "Bon", prixReferenceReel: 50, prixPaye: 20 }],
      },
      {
        id: "s2",
        type: "vente",
        jour: 3,
        timestamp: 2000,
        niveauCamion: 1,
        loyer: 5,
        ventes: [{ nom: "Bidule", categorie: "Outillage", etat: "Bon", prixReferenceReel: 100, prixVente: 80, prixAchat: 30 }],
        invendus: 0,
      },
    ],
  };
  const out = migrerSauvegarde(v3Save as never);
  expect(out.version).toBe(4);
  expect(out.historique[0].xpGagne).toEqual({});
  expect(out.historique[1].xpGagne).toEqual({});
  const session0 = out.historique[0] as { achats: Array<{ templateId: string }> };
  expect(session0.achats[0].templateId).toBe("legacy");
  const session1 = out.historique[1] as { ventes: Array<{ templateId: string }> };
  expect(session1.ventes[0].templateId).toBe("legacy");
});
```

- [ ] **Step 4 : Lance les tests**

Run: `npm run test -- migrations.test`
Expected : tous les tests passent (existants + nouveau).

- [ ] **Step 5 : Commit**

```bash
git add src/types/game.ts src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(model): templateId sur ObjetSnapshot + xpGagne sur Session (save v4)"
```

---

## Task 2 — Helper `agregerJournees`

**Files:**
- Create : `src/lib/historiqueJournalier.ts`
- Create : `src/lib/historiqueJournalier.test.ts`

- [ ] **Step 1 : Écris le test (TDD)**

Crée `src/lib/historiqueJournalier.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { agregerJournees } from "./historiqueJournalier";
import type { LedgerEntry, Session } from "@/types/game";

function ledger(jour: number, recette: number, depense: number, kind: LedgerEntry["kind"], designation: string, opts: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: `${jour}-${designation}-${Math.random()}`,
    jour,
    timestamp: jour * 1000 + (opts.timestamp ?? 0),
    kind,
    designation,
    recette,
    depense,
    soldeApres: opts.soldeApres ?? 0,
    ...opts,
  };
}

function chinage(jour: number, brocanteNom: string): Session {
  return { id: `c-${jour}`, type: "chinage", jour, timestamp: jour * 1000, brocanteId: "b", brocanteNom, achats: [], xpGagne: {} };
}

function vente(jour: number): Session {
  return { id: `v-${jour}`, type: "vente", jour, timestamp: jour * 1000, niveauCamion: 1, loyer: 0, ventes: [], invendus: 0, xpGagne: {} };
}

describe("agregerJournees", () => {
  it("renvoie une ligne par jour, du plus récent au plus ancien", () => {
    const out = agregerJournees(
      [ledger(2, 0, 20, "loyer", "Loyer", { soldeApres: 80 }), ledger(5, 100, 0, "session_vente", "Marché", { sessionId: "v-5", soldeApres: 200 })],
      [vente(5)],
    );
    expect(out.map((j) => j.jour)).toEqual([5, 2]);
  });

  it("type=chinage si session chinage du jour", () => {
    const out = agregerJournees(
      [ledger(3, 0, 50, "session_chinage", "Brocante du Lac", { sessionId: "c-3", soldeApres: 950 })],
      [chinage(3, "Brocante du Lac")],
    );
    expect(out[0].type).toBe("chinage");
    expect(out[0].libelle).toBe("Brocante du Lac");
    expect(out[0].net).toBe(-50);
    expect(out[0].session).not.toBeNull();
  });

  it("type=vente, libelle=Marché du jour si session vente", () => {
    const out = agregerJournees(
      [ledger(4, 120, 0, "session_vente", "Marché", { sessionId: "v-4", soldeApres: 1120 })],
      [vente(4)],
    );
    expect(out[0].type).toBe("vente");
    expect(out[0].libelle).toBe("Marché du jour");
    expect(out[0].net).toBe(120);
  });

  it("type=repos, libelle dérivé d'upgrade prioritaire", () => {
    const out = agregerJournees(
      [
        ledger(6, 0, 180, "upgrade_atelier", "Atelier amélioré", { soldeApres: 820 }),
        ledger(6, 0, 5, "loyer", "Loyer", { soldeApres: 815, timestamp: 1 }),
      ],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Atelier amélioré");
    expect(out[0].net).toBe(-185);
  });

  it("type=repos, libelle=Loyer prélevé si seul loyer", () => {
    const out = agregerJournees(
      [ledger(7, 0, 5, "loyer", "Loyer", { soldeApres: 810 })],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Loyer prélevé");
  });

  it("type=repos, libelle=Journée de repos si aucune écriture matchant la priorité", () => {
    const out = agregerJournees(
      [ledger(8, 5, 0, "courrier_recompense", "Lettre", { soldeApres: 815 })],
      [],
    );
    expect(out[0].type).toBe("repos");
    expect(out[0].libelle).toBe("Récompense reçue");
  });

  it("ignore les journées sans aucune écriture", () => {
    const out = agregerJournees([], [chinage(1, "X")]);
    expect(out).toEqual([]);
  });

  it("soldeFin = soldeApres de la dernière écriture par timestamp", () => {
    const out = agregerJournees(
      [
        ledger(9, 0, 10, "loyer", "Loyer", { soldeApres: 800, timestamp: 1 }),
        ledger(9, 100, 0, "courrier_recompense", "Récompense", { soldeApres: 900, timestamp: 2 }),
      ],
      [],
    );
    expect(out[0].soldeFin).toBe(900);
    expect(out[0].entries.map((e) => e.designation)).toEqual(["Loyer", "Récompense"]);
  });
});
```

- [ ] **Step 2 : Lance le test (doit échouer)**

Run : `npm run test -- historiqueJournalier.test`
Expected : FAIL — `Cannot find module ./historiqueJournalier`.

- [ ] **Step 3 : Implémente le helper**

Crée `src/lib/historiqueJournalier.ts` :

```ts
import type { LedgerEntry, LedgerKind, Session } from "@/types/game";

export type TypeJournee = "chinage" | "vente" | "repos";

export interface JourneeHistorique {
  jour: number;
  type: TypeJournee;
  session: Session | null;
  libelle: string;
  entries: LedgerEntry[];
  net: number;
  soldeFin: number;
}

const PRIORITE_REPOS: { kind: LedgerKind; libelle: string }[] = [
  { kind: "upgrade_atelier", libelle: "Atelier amélioré" },
  { kind: "upgrade_stockage", libelle: "Stockage amélioré" },
  { kind: "upgrade_camion", libelle: "Camion amélioré" },
  { kind: "loyer", libelle: "Loyer prélevé" },
  { kind: "gazette", libelle: "Gazette achetée" },
  { kind: "courrier_recompense", libelle: "Récompense reçue" },
  { kind: "mission_recompense", libelle: "Mission récompensée" },
];

function libelleRepos(entries: LedgerEntry[]): string {
  for (const { kind, libelle } of PRIORITE_REPOS) {
    if (entries.some((e) => e.kind === kind)) return libelle;
  }
  return "Journée de repos";
}

export function agregerJournees(
  grandLivre: LedgerEntry[],
  historique: Session[],
): JourneeHistorique[] {
  const parJour = new Map<number, LedgerEntry[]>();
  for (const e of grandLivre) {
    const arr = parJour.get(e.jour);
    if (arr) arr.push(e);
    else parJour.set(e.jour, [e]);
  }

  const sessionsParJour = new Map<number, Session>();
  for (const s of historique) sessionsParJour.set(s.jour, s);

  const result: JourneeHistorique[] = [];
  for (const [jour, entries] of parJour.entries()) {
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const session = sessionsParJour.get(jour) ?? null;
    const net = entries.reduce((s, e) => s + e.recette - e.depense, 0);
    const soldeFin = entries[entries.length - 1].soldeApres;
    let type: TypeJournee;
    let libelle: string;
    if (session?.type === "chinage") {
      type = "chinage";
      libelle = session.brocanteNom;
    } else if (session?.type === "vente") {
      type = "vente";
      libelle = "Marché du jour";
    } else {
      type = "repos";
      libelle = libelleRepos(entries);
    }
    result.push({ jour, type, session, libelle, entries, net, soldeFin });
  }
  result.sort((a, b) => b.jour - a.jour);
  return result;
}
```

- [ ] **Step 4 : Relance les tests**

Run : `npm run test -- historiqueJournalier.test`
Expected : tous PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/historiqueJournalier.ts src/lib/historiqueJournalier.test.ts
git commit -m "feat(historique): helper agregerJournees pour vue Cahier de Compte"
```

---

## Task 3 — Vignette kraft (`ItemVignetteKraft`)

**Files:**
- Create : `src/components/ui/ItemVignetteKraft.tsx`
- Create : `src/components/ui/ItemVignetteKraft.test.tsx`

- [ ] **Step 1 : Écris le test**

Crée `src/components/ui/ItemVignetteKraft.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ItemVignetteKraft } from "./ItemVignetteKraft";

afterEach(cleanup);

describe("ItemVignetteKraft", () => {
  it("rend l'image de l'item quand le templateId est connu", () => {
    const { container } = render(
      <ItemVignetteKraft templateId="out.scie_egoine_stanley" categorie="Outillage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toContain("/items/out.scie_egoine_stanley.webp");
  });

  it("rend un fallback CategorieIcon quand le templateId n'a pas d'image", () => {
    const { container } = render(
      <ItemVignetteKraft templateId="legacy" categorie="Outillage" />,
    );
    const img = container.querySelector("img");
    expect(img).toBeFalsy();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lance le test (doit échouer)**

Run : `npm run test -- ItemVignetteKraft.test`
Expected : FAIL — module introuvable.

- [ ] **Step 3 : Implémente le composant**

Crée `src/components/ui/ItemVignetteKraft.tsx` :

```tsx
import type { CSSProperties } from "react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { getItemImageUrl } from "@/lib/itemImages";
import type { CategorieObjet } from "@/types/game";

interface ItemVignetteKraftProps {
  templateId: string;
  categorie: CategorieObjet;
  /** Largeur en px. Défaut 52. La hauteur suit l'aspect ratio interne. */
  size?: number;
}

const wrapStyle = (size: number): CSSProperties => ({
  position: "relative",
  display: "inline-block",
  width: size,
  height: Math.round(size * 60 / 52),
  backgroundImage: "url('/textures/kraft.webp')",
  backgroundColor: "var(--kraft-base, #8a6f3f)",
  backgroundSize: "cover",
  boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
  flexShrink: 0,
});

const imageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transform: "translate(2px, 3px)",
  pointerEvents: "none",
};

const fallbackStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
};

export function ItemVignetteKraft({ templateId, categorie, size = 52 }: ItemVignetteKraftProps) {
  const url = getItemImageUrl(templateId);
  return (
    <span style={wrapStyle(size)} aria-hidden>
      {url ? (
        <img src={url} alt="" draggable={false} style={imageStyle} />
      ) : (
        <span style={fallbackStyle}>
          <CategorieIcon categorie={categorie} size={Math.round(size * 0.4)} color="var(--paper-100)" />
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4 : Relance le test**

Run : `npm run test -- ItemVignetteKraft.test`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/components/ui/ItemVignetteKraft.tsx src/components/ui/ItemVignetteKraft.test.tsx
git commit -m "feat(ui): ItemVignetteKraft — fond kraft + image item en offset"
```

---

## Task 4 — SessionSummary redesign + props additives

**Files:**
- Modify : `src/components/SessionSummary.tsx`
- Modify : `src/app/chiner/[brocanteId]/ClientPage.tsx`
- Modify : `src/app/vitrine/[brocanteId]/journee/ClientPage.tsx`

- [ ] **Step 1 : Étend `SummaryItem` et props de `SessionSummary`**

Dans `src/components/SessionSummary.tsx` :

```tsx
export interface SummaryItem {
  templateId: string;
  nom: string;
  categorie: import("@/types/game").CategorieObjet;
  prix: number;
}

interface SessionSummaryProps {
  type: "chinage" | "vente";
  titre: string;
  sousTitre?: string;
  items: SummaryItem[];
  xpGagne: Record<CompetenceTreeId, number>;
  /** Si vente : afficher un grand "Bravo!" quand toute la vitrine est écoulée. */
  bravo?: boolean;
  /** Libellé du bouton de retour. Défaut : "Rentrer au QG". */
  retourLabel?: string;
  /** Si vrai, le panel XP affiche "Aucune expérience enregistrée pour cette
   *  session" au lieu de "Aucune expérience gagnée". Utile pour les replays
   *  de sessions migrées (xpGagne vide ≠ session sans XP). */
  xpReplayMode?: boolean;
  onRetour: () => void;
}
```

- [ ] **Step 2 : Remplace le rendu d'icône par la vignette kraft**

Importe en haut de fichier :

```tsx
import { ItemVignetteKraft } from "@/components/ui/ItemVignetteKraft";
```

Dans le `<li>` qui itère sur `items`, remplace le bloc `<CategorieIcon ...>` par :

```tsx
<ItemVignetteKraft templateId={it.templateId} categorie={it.categorie} />
```

Et change la grille pour accommoder la vignette plus haute :

```tsx
style={{
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderBottom: i < arr.length - 1 ? "1px dotted var(--paper-500)" : "none",
}}
```

(inchangée — `auto` accepte la vignette).

- [ ] **Step 3 : Réduit la taille du nom et le libellé du bouton**

Dans le `<span>` qui affiche `it.nom`, change `fontSize: 13` en `fontSize: 11`. Garde le reste (uppercase, letter-spacing).

Dans la `<Button>` finale, remplace le texte par `{retourLabel ?? "Rentrer au QG"}`.

- [ ] **Step 4 : Branche `xpReplayMode` sur l'empty state XP**

Dans le bloc qui affiche « Aucune expérience gagnée cette fois-ci. », remplace par :

```tsx
{xpEntries.length === 0 ? (
  <p
    style={{
      fontFamily: "var(--font-serif)",
      fontStyle: "italic",
      color: "var(--ink-500)",
      textAlign: "center",
      margin: 0,
    }}
  >
    {xpReplayMode
      ? "Aucune expérience enregistrée pour cette session."
      : "Aucune expérience gagnée cette fois-ci."}
  </p>
) : (
  /* ... rendu liste XP inchangé ... */
)}
```

- [ ] **Step 5 : Met à jour `chiner/[brocanteId]/ClientPage.tsx`**

Dans le rendu `<SessionSummary>` (autour de la ligne 205), retire `sousTitre` et ajoute `templateId` :

```tsx
<SessionSummary
  type="chinage"
  titre={brocante.nom}
  items={achats.map((a) => ({
    templateId: a.templateId,
    nom: a.nom,
    categorie: a.categorie,
    prix: a.prixPaye,
  }))}
  xpGagne={xpSession}
  onRetour={handleRetourQg}
/>
```

Dans l'appel à `enregistrerSession` (autour de la ligne 189), ajoute `xpGagne` et vérifie que les `achats` portent bien le `templateId` (ils doivent : `AchatHistorique extends ObjetSnapshot` qui a maintenant `templateId`. Trace en amont où sont créés les `achats` pour t'assurer que chaque achat reçoit son `templateId` depuis l'objet acheté). Si nécessaire, modifie le push d'`achats` dans le hook de chinage pour copier `objet.templateId`.

Exemple de modification du push :

```ts
setAchats((prev) => [
  ...prev,
  {
    templateId: objet.templateId,
    nom: objet.nom,
    categorie: objet.categorie,
    etat: objet.etat,
    prixReferenceReel: objet.prixReferenceReel,
    prixPaye: prix,
  },
]);
```

Et au moment de l'appel `enregistrerSession` :

```tsx
enregistrerSession({
  id: crypto.randomUUID(),
  type: "chinage",
  jour: state.jourActuel,
  timestamp: Date.now(),
  brocanteId: brocante.id,
  brocanteNom: brocante.nom,
  achats,
  xpGagne: xpSession,
});
```

- [ ] **Step 6 : Met à jour `vitrine/[brocanteId]/journee/ClientPage.tsx`**

Dans `<SessionSummary>` (autour de la ligne 522), ajoute `templateId` :

```tsx
items={ventesEffectuees.map((v) => ({
  templateId: v.templateId,
  nom: v.nom,
  categorie: v.categorie,
  prix: v.prixVente,
}))}
```

Dans l'appel à `enregistrerSession` (autour de la ligne 250), ajoute `xpGagne` :

```tsx
enregistrerSession({
  id: crypto.randomUUID(),
  type: "vente",
  jour: state?.jourActuel ?? 0,
  timestamp: Date.now(),
  niveauCamion: standSnapshot.current.niveau,
  loyer: standSnapshot.current.loyer,
  ventes: ventesEffectuees,
  invendus: tailleInvendus,
  xpGagne: xpSession,
});
```

Vérifie également que la création des `ventesEffectuees` injecte bien `templateId` depuis l'objet vendu. Si la liste actuelle ne porte pas le templateId, ajoute-le dans le bloc qui pousse dans `ventesEffectuees` (chercher la mutation `setVentesEffectuees(...)` ou équivalente, copier `objet.templateId`).

- [ ] **Step 7 : Lance les tests, vérifie qu'aucun n'est cassé**

Run : `npm run test`
Expected : tous les tests passent. Si un test snapshot lié à SessionSummary ou les ClientPage existait, le mettre à jour.

- [ ] **Step 8 : Commit**

```bash
git add src/components/SessionSummary.tsx src/app/chiner/[brocanteId]/ClientPage.tsx src/app/vitrine/[brocanteId]/journee/ClientPage.tsx
git commit -m "feat(session-summary): vignettes kraft + retourLabel + suppression sous-titre chinage"
```

---

## Task 5 — Repositionnement du bureau : porte-revues + carnet rouge

**Files:**
- Modify : `src/components/mobile/qg/layout.ts`
- Modify : `src/components/mobile/qg/QgJournal.tsx`
- Create : `src/components/mobile/qg/QgPorteRevues.tsx`
- Create : `src/components/mobile/qg/QgCarnetNotes.tsx`

- [ ] **Step 1 : Met à jour `layout.ts`**

Dans `src/components/mobile/qg/layout.ts`, modifie `objets` :

```ts
objets: {
  journal: { left: 80.0, bottom: 8.0, width: 12.0 },          // posé dans le porte-revues, à fine-tuner
  carnet: { left: 11.2, bottom: 20.2, width: 49.1 },          // Cahier de Compte, inchangé
  carnetRouge: { left: 17.5, bottom: 22.0, width: 13.0 },     // petit calepin posé sur le Cahier, à fine-tuner
  porteRevues: { left: 76.0, bottom: 2.0, width: 16.0 },      // au sol, près du fauteuil, à fine-tuner
  porte: { left: 135.2, bottom: 27.7, width: 24.0 },
  courrier: { left: 145.2, bottom: 14.8, width: 18.0 },
  fauteuil: { left: 202.8, bottom: 14.6, width: 36.3 },
  gramophone: { left: 245.7, bottom: 30.3, width: 17.0 },
  portemanteau: { left: 172.7, bottom: 15.4, width: 23.4 },
  calendrier: { left: 109.6, bottom: 54.3, width: 11.8 },
},
```

Note : les coordonnées de `journal`, `carnetRouge`, `porteRevues` sont des valeurs initiales — à raffiner via le mode `?qgedit=1` après livraison des assets.

- [ ] **Step 2 : Crée `QgPorteRevues`**

Crée `src/components/mobile/qg/QgPorteRevues.tsx` :

```tsx
"use client";

import { useQgObjetStyle } from "./QgScene";

interface QgPorteRevuesProps {
  onTap: () => void;
}

export function QgPorteRevues({ onTap }: QgPorteRevuesProps) {
  const style = useQgObjetStyle("porteRevues");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Porte-revues — la Gazette"
      style={style}
    >
      <img
        src="/qg/porte-revues.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </button>
  );
}
```

- [ ] **Step 3 : Crée `QgCarnetNotes`**

Crée `src/components/mobile/qg/QgCarnetNotes.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import { useQgObjetStyle } from "./QgScene";

interface QgCarnetNotesProps {
  /** Nombre de missions actives non livrables (affiche le coin corné). */
  nbActives: number;
  /** Nombre de missions livrables (affiche le ruban). */
  nbLivrables: number;
  onTap: () => void;
}

const rubanStyle: CSSProperties = {
  position: "absolute",
  top: "-6%",
  right: "18%",
  width: "10%",
  height: "26%",
  background: "linear-gradient(180deg, #c43030 0%, #911f1f 100%)",
  borderRadius: "0 0 2px 2px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
  pointerEvents: "none",
};

const coinStyle: CSSProperties = {
  position: "absolute",
  bottom: "8%",
  right: "8%",
  width: 0,
  height: 0,
  borderLeft: "10px solid transparent",
  borderBottom: "10px solid rgba(255,245,210,0.85)",
  filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
  pointerEvents: "none",
};

export function QgCarnetNotes({ nbActives, nbLivrables, onTap }: QgCarnetNotesProps) {
  const style = useQgObjetStyle("carnetRouge");
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`Carnet de notes — ${nbActives + nbLivrables} mission${nbActives + nbLivrables > 1 ? "s" : ""}`}
      style={{ ...style, position: "absolute" }}
    >
      <img
        src="/qg/carnet-rouge.webp"
        alt=""
        draggable={false}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
      {nbLivrables > 0 && <span style={rubanStyle} aria-hidden />}
      {nbLivrables === 0 && nbActives > 0 && <span style={coinStyle} aria-hidden />}
    </button>
  );
}
```

- [ ] **Step 4 : Adapte `QgJournal` (asset reste, position change via layout déjà)**

Le composant `QgJournal.tsx` n'a rien à changer : il lit ses coordonnées via `useQgObjetStyle("journal")`. Aucune modification de code. Le repositionnement est fait dans `layout.ts` à l'étape 1.

- [ ] **Step 5 : Vérifie typecheck**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/qg/layout.ts src/components/mobile/qg/QgPorteRevues.tsx src/components/mobile/qg/QgCarnetNotes.tsx
git commit -m "feat(qg): porte-revues + carnet rouge, repositionnement du journal"
```

---

## Task 6 — `CahierDeCompteOverlay` (vue historique journalier)

**Files:**
- Create : `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx`

- [ ] **Step 1 : Crée la structure de l'overlay**

Crée `src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx` (premier jet — sans replay encore) :

```tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { agregerJournees, type JourneeHistorique } from "@/lib/historiqueJournalier";
import type { GameState, Session } from "@/types/game";
import { SessionSummary, type SummaryItem } from "@/components/SessionSummary";

interface CahierDeCompteOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
}

/* ─── styles ─── */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "grid",
  placeItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom))",
};

const cahier: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 480,
  maxHeight: "92dvh",
  background: "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow: "inset 0 0 28px rgba(120,90,40,0.18), 0 12px 28px rgba(0,0,0,0.35)",
  borderRadius: 3,
  transform: "rotate(-0.4deg)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 32,
  height: 32,
  borderRadius: 16,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const enTete: CSSProperties = {
  padding: "18px 20px 8px",
  borderBottom: "2px solid #1a1308",
  textAlign: "center",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  letterSpacing: "0.04em",
  color: "#1a1308",
  margin: 0,
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#5e4a25",
  marginTop: 4,
};

const contenu: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px 18px",
};

const ligneStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "36px 1fr auto 18px",
  alignItems: "center",
  gap: 8,
  padding: "10px 6px",
  borderBottom: "1px dotted #c8b48a",
  cursor: "pointer",
};

const jourCellule: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#5e4a25",
};

const typeCellule: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 9,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#5e4a25",
};

const libelleCellule: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 12,
  color: "#1a1308",
};

function netStyle(net: number): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: 13,
    color: net > 0 ? "#2c5e3f" : net < 0 ? "#a31f1f" : "#5e4a25",
    fontWeight: Math.abs(net) >= 100 ? 700 : 400,
  };
}

function typeLabel(t: JourneeHistorique["type"]): string {
  if (t === "chinage") return "Chinage";
  if (t === "vente") return "Vente";
  return "Repos";
}

/* ─── Détail repos (inline) ─── */

function DetailRepos({ journee }: { journee: JourneeHistorique }) {
  return (
    <div style={{ padding: "8px 12px 12px", background: "rgba(255,250,235,0.5)" }}>
      <ul style={{ margin: 0, padding: "0 0 0 14px", fontFamily: "var(--font-serif)", fontSize: 12, color: "#3a2f1e" }}>
        {journee.entries.map((e) => (
          <li key={e.id}>
            {e.designation}
            {e.recette > 0 ? <span style={{ color: "#2c5e3f" }}> +{e.recette} €</span> : null}
            {e.depense > 0 ? <span style={{ color: "#a31f1f" }}> −{e.depense} €</span> : null}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Solde après : {journee.soldeFin} €
      </div>
    </div>
  );
}

/* ─── Composant principal ─── */

export function CahierDeCompteOverlay({ open, onClose, state }: CahierDeCompteOverlayProps) {
  const [reposExpanded, setReposExpanded] = useState<Set<number>>(new Set());
  const [replayOf, setReplayOf] = useState<Session | null>(null);
  const journees = useMemo(() => agregerJournees(state.grandLivre, state.historique), [state.grandLivre, state.historique]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (replayOf) setReplayOf(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, replayOf]);

  if (!open) return null;

  if (replayOf) {
    const session = replayOf;
    const items: SummaryItem[] =
      session.type === "chinage"
        ? session.achats.map((a) => ({ templateId: a.templateId, nom: a.nom, categorie: a.categorie, prix: a.prixPaye }))
        : session.ventes.map((v) => ({ templateId: v.templateId, nom: v.nom, categorie: v.categorie, prix: v.prixVente }));
    const titreReplay = session.type === "chinage" ? session.brocanteNom : `Marché du jour J${session.jour}`;
    return (
      <>
        <div style={scrim} onClick={() => setReplayOf(null)} aria-hidden />
        <div style={stage} role="dialog" aria-modal="true">
          <SessionSummary
            type={session.type}
            titre={titreReplay}
            items={items}
            xpGagne={session.xpGagne}
            retourLabel="Retour au Cahier"
            xpReplayMode
            onRetour={() => setReplayOf(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={cahier}>
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Cahier de Compte</h2>
            <div style={sousTitre}>Jour {state.jourActuel} · Solde {state.budget} €</div>
          </div>
          <div style={contenu}>
            {journees.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune écriture.
              </p>
            ) : (
              journees.map((j) => {
                const peutReplay = j.session !== null;
                const isExpanded = reposExpanded.has(j.jour);
                return (
                  <div key={j.jour}>
                    <div
                      style={ligneStyle}
                      onClick={() => {
                        if (peutReplay) setReplayOf(j.session);
                        else {
                          setReposExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(j.jour)) next.delete(j.jour);
                            else next.add(j.jour);
                            return next;
                          });
                        }
                      }}
                    >
                      <span style={jourCellule}>J{j.jour}</span>
                      <span>
                        <div style={typeCellule}>{typeLabel(j.type)}</div>
                        <div style={libelleCellule}>{j.libelle}</div>
                      </span>
                      <span style={netStyle(j.net)}>
                        {j.net > 0 ? `+${j.net}` : j.net} €
                      </span>
                      <span style={{ color: "#5e4a25" }}>
                        {peutReplay ? "▸" : isExpanded ? "▾" : "▸"}
                      </span>
                    </div>
                    {!peutReplay && isExpanded && <DetailRepos journee={j} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2 : Vérifie typecheck**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/qg/overlays/CahierDeCompteOverlay.tsx
git commit -m "feat(cahier-compte): overlay journalier avec replay SessionSummary"
```

---

## Task 7 — `CarnetNotesOverlay` (missions séparées)

**Files:**
- Create : `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`

- [ ] **Step 1 : Crée l'overlay missions**

Crée `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx` :

```tsx
"use client";

import { useEffect, useMemo, type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import type {
  Courrier,
  CourrierPayloadMission,
  EtatObjet,
  GameState,
  MissionResolution,
} from "@/types/game";

interface CarnetNotesOverlayProps {
  open: boolean;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
}

const ETATS_ORDRE: EtatObjet[] = ["Mauvais", "Bon", "Très bon", "Pristin état"];

/* ─── styles ─── */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "grid",
  placeItems: "center",
  padding: "max(16px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom))",
};

const carnet: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 360,
  maxHeight: "85dvh",
  background: "linear-gradient(180deg, #f4e9cd 0%, #ecdfb6 100%)",
  border: "2px solid #6e1f1f",
  borderRadius: 4,
  boxShadow: "inset 0 0 30px rgba(120, 60, 40, 0.15), 0 14px 28px rgba(0,0,0,0.4)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  /* fond ligné/quadrillé : gradient répété de fines lignes horizontales très pâles */
  backgroundImage:
    "linear-gradient(180deg, transparent 0, transparent 21px, rgba(200,181,138,0.45) 22px, transparent 23px)",
  backgroundSize: "100% 24px",
};

const closeBtn: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  width: 30,
  height: 30,
  borderRadius: 15,
  background: "#6e1f1f",
  border: "1px solid #b03030",
  color: "#f4e9cd",
  fontSize: 13,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  zIndex: 2,
};

const ruban: CSSProperties = {
  position: "absolute",
  top: -6,
  left: "70%",
  width: 18,
  height: 40,
  background: "linear-gradient(180deg, #c43030 0%, #911f1f 100%)",
  borderRadius: "0 0 3px 3px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
  zIndex: 1,
  pointerEvents: "none",
};

const enTete: CSSProperties = {
  padding: "18px 20px 10px",
  textAlign: "center",
  borderBottom: "1px solid rgba(110,31,31,0.4)",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  letterSpacing: "0.06em",
  color: "#6e1f1f",
  margin: 0,
};

const sousTitre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#5e4a25",
  marginTop: 4,
};

const contenu: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 14px 18px",
};

const sectionLabel: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#6e1f1f",
  textAlign: "center",
  padding: "10px 0 6px",
  borderTop: "1px dotted rgba(110,31,31,0.35)",
  marginTop: 10,
};

const carteActive: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid rgba(110,31,31,0.3)",
  background: "rgba(255,250,235,0.5)",
  marginBottom: 10,
  borderRadius: 2,
};

const carteTerminee: CSSProperties = {
  padding: "6px 12px",
  marginBottom: 6,
  borderRadius: 2,
  opacity: 0.55,
  fontFamily: "var(--font-serif)",
  fontSize: 11,
  color: "#3a2f1e",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
};

const livrerBtn: CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "8px 12px",
  background: "#6e1f1f",
  color: "#f4e9cd",
  border: "none",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 2,
};

/* ─── Cartes ─── */

function MissionActiveCarte({
  courrier,
  reso,
  state,
  onLivrer,
}: {
  courrier: Courrier;
  reso: MissionResolution;
  state: GameState;
  onLivrer: () => void;
}) {
  if (courrier.payload.type !== "mission") return null;
  const p: CourrierPayloadMission = courrier.payload;
  const tpl = getTemplate(p.cible.templateId);
  const nomCible = tpl?.nom ?? p.cible.templateId;
  const minIdx = p.cible.etatMin ? ETATS_ORDRE.indexOf(p.cible.etatMin) : 0;
  const livrable =
    reso.statut === "active" &&
    state.inventaireJoueur.some(
      (o) =>
        o.templateId === p.cible.templateId &&
        !o.enRestauration &&
        ETATS_ORDRE.indexOf(o.etat) >= minIdx,
    );
  return (
    <article style={livrable ? { ...carteActive, borderColor: "#6e1f1f" } : carteActive}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "#1a1308" }}>{p.titre}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: livrable ? "#6e1f1f" : "#5e4a25" }}>
          {livrable ? "Livrable" : "Active"}
        </div>
      </div>
      <div style={{ marginTop: 6, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
        Demande : <strong>{nomCible}</strong>
        {p.cible.etatMin ? ` · ${p.cible.etatMin} min.` : ""}
      </div>
      <div style={{ marginTop: 2, fontFamily: "var(--font-serif)", fontSize: 11, color: "#3a2f1e" }}>
        Récompense : <strong>+{p.recompense.argent} €</strong>
      </div>
      {p.jourLimite !== undefined && (
        <div style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 10, color: p.jourLimite - state.jourActuel <= 3 ? "#a31f1f" : "#5e4a25" }}>
          Avant le jour {p.jourLimite} (J−{Math.max(0, p.jourLimite - state.jourActuel)})
        </div>
      )}
      {livrable && (
        <button type="button" onClick={onLivrer} style={livrerBtn}>
          Livrer
        </button>
      )}
    </article>
  );
}

function MissionTermineeCarte({
  courrier,
  reso,
}: {
  courrier: Courrier;
  reso: MissionResolution;
}) {
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const tpl = getTemplate(p.cible.templateId);
  const nomCible = tpl?.nom ?? p.cible.templateId;
  const couleurStatut = reso.statut === "livree" ? "#2c5e3f" : "#a31f1f";
  const libelleStatut = reso.statut === "livree" ? `Livrée J${reso.jourResolution}` : `Expirée J${reso.jourResolution}`;
  return (
    <div style={carteTerminee}>
      <span style={{ textDecoration: "line-through" }}>
        {p.titre} — {nomCible}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: couleurStatut }}>
        {libelleStatut}
      </span>
    </div>
  );
}

/* ─── Composant principal ─── */

export function CarnetNotesOverlay({ open, onClose, state, onLivrerMission }: CarnetNotesOverlayProps) {
  const courriersById = useMemo(() => new Map(state.courriers.map((c) => [c.id, c])), [state.courriers]);
  const actives = useMemo(
    () =>
      [...state.missions]
        .filter((m) => m.statut === "active")
        .sort((a, b) => {
          const ca = courriersById.get(a.courrierId);
          const cb = courriersById.get(b.courrierId);
          const la = ca && ca.payload.type === "mission" ? ca.payload.jourLimite ?? Infinity : Infinity;
          const lb = cb && cb.payload.type === "mission" ? cb.payload.jourLimite ?? Infinity : Infinity;
          if (la !== lb) return la - lb;
          return (ca?.jourRecu ?? 0) - (cb?.jourRecu ?? 0);
        }),
    [state.missions, courriersById],
  );
  const terminees = useMemo(
    () =>
      [...state.missions]
        .filter((m) => m.statut !== "active")
        .sort((a, b) => (b.jourResolution ?? 0) - (a.jourResolution ?? 0)),
    [state.missions],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <div style={carnet}>
          <div style={ruban} aria-hidden />
          <button type="button" style={closeBtn} onClick={onClose} aria-label="Fermer">✕</button>
          <div style={enTete}>
            <h2 style={titre}>Carnet de Notes</h2>
            <div style={sousTitre}>Jour {state.jourActuel}</div>
          </div>
          <div style={contenu}>
            {state.missions.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "30px 10px" }}>
                Aucune mission reçue pour l'instant.
              </p>
            ) : (
              <>
                <div style={{ ...sectionLabel, marginTop: 0, borderTop: "none" }}>— En cours —</div>
                {actives.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#5e4a25", textAlign: "center", padding: "6px 10px" }}>
                    Aucune mission en cours.
                  </p>
                ) : (
                  actives.map((m) => {
                    const c = courriersById.get(m.courrierId);
                    if (!c) return null;
                    return (
                      <MissionActiveCarte
                        key={m.courrierId}
                        courrier={c}
                        reso={m}
                        state={state}
                        onLivrer={() => onLivrerMission(m.courrierId)}
                      />
                    );
                  })
                )}
                {terminees.length > 0 && (
                  <>
                    <div style={sectionLabel}>— Terminées —</div>
                    {terminees.map((m) => {
                      const c = courriersById.get(m.courrierId);
                      if (!c) return null;
                      return <MissionTermineeCarte key={m.courrierId} courrier={c} reso={m} />;
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2 : Typecheck**

Run : `npx tsc --noEmit`
Expected : pas d'erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx
git commit -m "feat(carnet-notes): overlay bordeaux pour missions en cours / terminées"
```

---

## Task 8 — Câblage final dans `app/(panorama)/layout.tsx` + suppression de l'ancien overlay

**Files:**
- Modify : `src/app/(panorama)/layout.tsx`
- Delete : `src/components/mobile/qg/overlays/CarnetOverlay.tsx`

- [ ] **Step 1 : Imports et états**

Dans `src/app/(panorama)/layout.tsx`, remplace :

```tsx
import { CarnetOverlay } from "@/components/mobile/qg/overlays/CarnetOverlay";
```

Par :

```tsx
import { CahierDeCompteOverlay } from "@/components/mobile/qg/overlays/CahierDeCompteOverlay";
import { CarnetNotesOverlay } from "@/components/mobile/qg/overlays/CarnetNotesOverlay";
import { QgPorteRevues } from "@/components/mobile/qg/QgPorteRevues";
import { QgCarnetNotes } from "@/components/mobile/qg/QgCarnetNotes";
```

Ajoute un nouvel état à côté de `carnetOuvert` (autour de la ligne 136) :

```tsx
const [carnetOuvert, setCarnetOuvert] = useState(false);
const [carnetNotesOuvert, setCarnetNotesOuvert] = useState(false);
```

- [ ] **Step 2 : Modifie la zone bureau (showQgZone(0))**

Remplace le bloc :

```tsx
{showQgZone(0) && (
  <>
    <QgJournal
      onTap={() => {
        playNewspaper();
        setGazetteOuverte(true);
      }}
    />
    <QgCarnet
      onTap={() => {
        playClick();
        setCarnetOuvert(true);
      }}
    />
  </>
)}
```

Par :

```tsx
{showQgZone(0) && (
  <>
    <QgPorteRevues
      onTap={() => {
        playNewspaper();
        setGazetteOuverte(true);
      }}
    />
    <QgJournal
      onTap={() => {
        playNewspaper();
        setGazetteOuverte(true);
      }}
    />
    <QgCarnet
      onTap={() => {
        playClick();
        setCarnetOuvert(true);
      }}
    />
    <QgCarnetNotes
      nbActives={state.missions.filter((m) => {
        if (m.statut !== "active") return false;
        return true;
      }).length}
      nbLivrables={state.missions.filter((m) => {
        if (m.statut !== "active") return false;
        const c = state.courriers.find((cc) => cc.id === m.courrierId);
        if (!c || c.payload.type !== "mission") return false;
        const p = c.payload;
        const ETATS = ["Mauvais", "Bon", "Très bon", "Pristin état"];
        const minIdx = p.cible.etatMin ? ETATS.indexOf(p.cible.etatMin) : 0;
        return state.inventaireJoueur.some(
          (o) => o.templateId === p.cible.templateId && !o.enRestauration && ETATS.indexOf(o.etat) >= minIdx,
        );
      }).length}
      onTap={() => {
        playClick();
        setCarnetNotesOuvert(true);
      }}
    />
  </>
)}
```

(Le calcul de `nbActives` inclut les livrables — c'est OK, le carnet affiche le ruban quand il y a des livrables sinon le coin corné quand il y a des actives non livrables. `QgCarnetNotes` masque le coin si `nbLivrables > 0`.)

- [ ] **Step 3 : Remplace le mount de l'overlay**

Plus bas, remplace le bloc :

```tsx
<CarnetOverlay
  open={carnetOuvert}
  onClose={() => setCarnetOuvert(false)}
  state={state}
  onLivrerMission={(id) => livrerMission(id)}
/>
```

Par :

```tsx
<CahierDeCompteOverlay
  open={carnetOuvert}
  onClose={() => setCarnetOuvert(false)}
  state={state}
/>

<CarnetNotesOverlay
  open={carnetNotesOuvert}
  onClose={() => setCarnetNotesOuvert(false)}
  state={state}
  onLivrerMission={(id) => livrerMission(id)}
/>
```

- [ ] **Step 4 : Supprime l'ancien overlay**

```bash
rm src/components/mobile/qg/overlays/CarnetOverlay.tsx
```

- [ ] **Step 5 : Typecheck + tests + lint**

Run :
- `npx tsc --noEmit`
- `npm run test`
- `npm run lint`

Expected : tout passe.

- [ ] **Step 6 : Commit**

```bash
git add src/app/(panorama)/layout.tsx src/components/mobile/qg/overlays/CarnetOverlay.tsx
git commit -m "feat(qg-layout): câble Cahier de Compte + Carnet de Notes, retire l'ancien overlay"
```

---

## Task 9 — Validation visuelle en dev

**Files:** (aucun changement de code attendu — calibration uniquement)

- [ ] **Step 1 : Vérifie les assets attendus**

Confirme que ces fichiers existent dans `public/` :
- `public/qg/porte-revues.webp`
- `public/qg/carnet-rouge.webp`
- `public/textures/kraft.webp`

Si certains manquent, demande au designer les assets manquants. Pour `kraft.webp`, fallback temporaire acceptable : utiliser `var(--kraft-base)` qui est déjà la couleur de fond.

- [ ] **Step 2 : Lance le dev server**

Run : `npm run dev`
Ouvre l'app sur ton smartphone (ou DevTools mobile). Connecte-toi avec `?qgedit=1` à l'URL si nécessaire pour activer le panneau d'édition de layout.

- [ ] **Step 3 : Affine les coords**

Ajuste dans `src/components/mobile/qg/layout.ts` les valeurs `journal`, `carnetRouge`, `porteRevues` jusqu'à un rendu satisfaisant :
- Le journal doit visuellement reposer dans le porte-revues, pas flotter à côté.
- Le carnet rouge doit être posé sur le coin supérieur droit du gros cahier, en biais.
- Le porte-revues doit être au sol près du fauteuil, à l'échelle.

- [ ] **Step 4 : Vérifie les flux**

- Tap sur le porte-revues → ouvre la Gazette (vérifie son icône d'accroche).
- Tap sur le carnet rouge → ouvre `CarnetNotesOverlay`, état des missions correct.
- Tap sur le gros cahier → ouvre `CahierDeCompteOverlay`, liste des journées correcte.
- Tap sur une ligne chinage/vente → ouvre `SessionSummary` avec vignettes kraft et bouton « Retour au Cahier ».
- Tap sur une ligne repos → expansion inline du détail des écritures.
- Crée une mission de test (via `creerCourrierMission` + lecture du courrier) pour valider le ruban / coin corné sur le carnet rouge.

- [ ] **Step 5 : Commit éventuel (uniquement si layout.ts modifié)**

```bash
git add src/components/mobile/qg/layout.ts
git commit -m "chore(qg-layout): fine-tune coords bureau (porte-revues, carnet rouge, journal)"
```

---

## Self-Review

**Spec coverage** : chaque section de la spec est couverte :
- §1 (XP) → Task 1.
- §2 (bureau) → Task 5 + Task 9.
- §3 (Cahier de Compte) → Task 2 + Task 6.
- §4 (SessionSummary) → Task 3 + Task 4.
- §5 (Carnet de Notes) → Task 7.
- §6 (Refactor CarnetOverlay) → Task 8.

**Placeholder scan** : aucun TBD, TODO, "implementer plus tard", "tests ci-dessus" ; code complet à chaque étape ; coords à fine-tuner explicitement étiquetées comme étape de calibration en `npm run dev`.

**Type consistency** : `JourneeHistorique`, `TypeJournee`, `SummaryItem`, `xpReplayMode`, `retourLabel` cohérents entre tasks. `xpGagne: Record<CompetenceTreeId, number>` aligné entre `Session` (Task 1) et `SessionSummary` (Task 4) et `CahierDeCompteOverlay` (Task 6).

**Note d'attention pour l'implémenteur** : dans Task 4 (Step 5/6), prends le temps de tracer la création des `achats` (chinage) et `ventesEffectuees` (vente) en amont — il est possible que les mutations soient enfouies dans des callbacks dépendant de l'objet acheté/vendu (le code utilise déjà `objet.templateId`, donc le copier est trivial). Le risque est de migrer `enregistrerSession` sans avoir alimenté `templateId` dans les snapshots.

---

## Execution Handoff

Plan complet et sauvé dans `docs/superpowers/plans/2026-06-18-bureau-deux-carnets.md`. Deux options d'exécution :

1. **Subagent-Driven (recommended)** — Je dispatche un subagent par task, revue entre les tasks, itération rapide.
2. **Inline Execution** — Exécution dans cette session avec `executing-plans`, batch avec checkpoints.

Quelle approche ?
