# Registre unifié à onglets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une fenêtre « registre » unique à 2 onglets d'index (Commandes / Comptes) remplaçant les 2 overlays, avec cartes de commande refondues (avatar 64px, aperçu des items, encadrés).

**Architecture:** `RegistreOverlay` (châssis + onglets contrôlés par le parent) contient `OngletCommandes` et `OngletComptes`, extraits tels quels des overlays actuels. `CommandeRow` est restylé (API inchangée). `layout.tsx` (qg) fusionne les deux états d'ouverture en `registreOuvert`.

**Tech Stack:** Next.js/React (styles inline CSSProperties), vitest + testing-library.

## Global Constraints

- 4 langues FR/EN/ES/EL (parité forcée par `DeepStrings<typeof fr>`).
- `npm run lint` cassé (Next 16) → `npx eslint <fichiers>`.
- Jamais de chaîne localisée en save.
- Le mode replay du cahier (SessionSummary plein écran) reste inchangé.

---

### Task 1: i18n bloc `registre` (4 langues)

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts` (avant le bloc `cahier`), `en.ts`, `es.ts`, `el.ts`

**Interfaces:**
- Produces: `d.registre.ongletCommandes`, `d.registre.ongletComptes`.

- [ ] **Step 1: Ajouter le bloc dans les 4 dicts** (même position relative, juste avant `cahier:`) :

```ts
// fr.ts
registre: {
  ongletCommandes: "Commandes",
  ongletComptes: "Comptes",
},
// en.ts
registre: {
  ongletCommandes: "Orders",
  ongletComptes: "Accounts",
},
// es.ts
registre: {
  ongletCommandes: "Pedidos",
  ongletComptes: "Cuentas",
},
// el.ts
registre: {
  ongletCommandes: "Παραγγελίες",
  ongletComptes: "Λογαριασμοί",
},
```

- [ ] **Step 2: `npx tsc --noEmit`** — Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(i18n): onglets du registre (Commandes/Comptes, 4 langues)"
```

---

### Task 2: Refonte `CommandeRow` (avatar 64, aperçu items, carte encadrée)

**Files:**
- Modify: `src/components/mobile/qg/overlays/CommandeRow.tsx`
- Test: `src/components/mobile/qg/overlays/CommandeRow.test.tsx`

**Interfaces:**
- Consumes: `progressionMission(p, inv).ciblesRemplies` (existant), `objectifsDeMission`/`progressionObjectif` (existants), `libelleObjectif` (fonction locale existante).
- Produces: API du composant inchangée (`courrier`, `state`, `ouvert`, `onToggle`, `onLivrer`) ; testids `apercu-cible`, `apercu-plus`.

- [ ] **Step 1: Tests rouges** — ajouter à `CommandeRow.test.tsx` :

```tsx
it("carte fermée : une vignette d'aperçu par cible, avec plafond 4 + jeton +n", () => {
  const courrier: Courrier = {
    id: "m4", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "maman",
      titre: "La grande rafle", corps: ["Tout me trouver."],
      cibles: [
        { templateId: "a" }, { templateId: "b" }, { templateId: "c" },
        { templateId: "d" }, { templateId: "e" }, { templateId: "f" },
      ],
      recompense: { argent: 10 },
    },
  };
  const state = createMockGameState({ missions: [{ courrierId: "m4", statut: "active" }] });
  render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
  expect(screen.getAllByTestId("apercu-cible").length).toBe(4);
  expect(screen.getByTestId("apercu-plus").textContent).toBe("+2");
});

it("carte fermée sans cible objet : l'aperçu affiche l'objectif à la place des vignettes", () => {
  const courrier: Courrier = {
    id: "m5", type: "mission", jourRecu: 1, lu: true,
    payload: {
      type: "mission", categorie: "principale", expediteurId: "maman",
      titre: "Pactole", corps: ["Des sous."],
      cibles: [], objectifs: [{ type: "ventesCumulees", montant: 300 }],
      recompense: { argent: 10 },
    },
  };
  const state = createMockGameState({ missions: [{ courrierId: "m5", statut: "active" }] });
  render(<CommandeRow courrier={courrier} state={state} ouvert={false} onToggle={() => {}} onLivrer={() => {}} />);
  expect(screen.queryAllByTestId("apercu-cible").length).toBe(0);
  expect(screen.getByText("Ventes cumulées")).toBeTruthy();
});
```

- [ ] **Step 2: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx`** — Expected: FAIL (testids absents).

- [ ] **Step 3: Restyler le composant.** Remplacements de styles + nouvel aperçu :

```tsx
const carte: CSSProperties = {
  background: "rgba(255,250,235,0.6)",
  border: "1px solid rgba(110,31,31,0.35)",
  borderRadius: 6,
  margin: "8px 0",
  overflow: "hidden",
};
const row: CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
  padding: "12px 12px 10px", background: "transparent", border: "none",
  cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = {
  width: 64, height: 64, borderRadius: 12, flex: "0 0 auto",
  border: "2px solid #c8a24a", boxShadow: "inset 0 0 0 2px #f4e9cd",
  objectFit: "cover", objectPosition: "top center", background: "#d9c79a",
  display: "grid", placeItems: "center", color: "#6e1f1f",
  fontFamily: "var(--font-display)", fontSize: 24, overflow: "hidden",
};
const apercuRow: CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap",
};
const apercuVignette: CSSProperties = {
  position: "relative", width: 30, height: 30,
  background: "#fdf8ec", border: "1px solid rgba(110,31,31,0.25)", borderRadius: 4,
};
const apercuBadge = (ok: boolean): CSSProperties => ({
  position: "absolute", top: -5, right: -5, width: 13, height: 13,
  borderRadius: 7, display: "grid", placeItems: "center",
  fontSize: 8, fontWeight: 700, color: "#f4e9cd",
  background: ok ? "#2c5e3f" : "#b3a06a",
});
const apercuPlus: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#7a6438",
  background: "#eadfc0", border: "1px solid rgba(110,31,31,0.25)",
  borderRadius: 4, padding: "2px 5px",
};
const apercuObjectif: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, color: "#7a6438", marginTop: 8,
};
```

Rendu carte fermée (dans le `<button style={row}>`) : le bloc central devient

```tsx
<span style={{ flex: 1, minWidth: 0 }}>
  <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 15, color: "#1a1308", lineHeight: 1.25 }}>{titreCourrier(courrier, locale)}</span>
  <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>
    {exp ? `${nomExp} · ${personnaliteExpediteur(p.expediteurId, locale)}` : ""}
  </span>
  {p.cibles.length > 0 ? (
    <span style={apercuRow}>
      {p.cibles.slice(0, 4).map((cible, i) => {
        const tpl = getTemplate(cible.templateId);
        const ok = prog.ciblesRemplies[i];
        return (
          <span key={i} style={apercuVignette} data-testid="apercu-cible">
            <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={18} />
            <span style={apercuBadge(!!ok)} aria-hidden>{ok ? "✓" : "○"}</span>
          </span>
        );
      })}
      {p.cibles.length > 4 && (
        <span style={apercuPlus} data-testid="apercu-plus">+{p.cibles.length - 4}</span>
      )}
    </span>
  ) : premierObjectifNonObjet ? (
    <span style={{ ...apercuObjectif, display: "block" }}>
      {libelleObjectif(premierObjectifNonObjet, d, tr)} · {progPremierObjectif.actuel}/{progPremierObjectif.cible}
      {premierObjectifNonObjet.type !== "niveau" && premierObjectifNonObjet.type !== "restauration" ? " €" : ""}
    </span>
  ) : null}
</span>
```

avec, avant le `return` :

```tsx
const premierObjectifNonObjet = objectifsTous.find((o) => o.type !== "objet") ?? null;
const progPremierObjectif = premierObjectifNonObjet
  ? progressionObjectif(premierObjectifNonObjet, state, resoPourObjectifs, courrier.jourRecu)
  : { atteint: false, actuel: 0, cible: 0 };
```

Le tout est enveloppé : `<div style={carte}>` remplace le `<div>` racine ; le
panneau déplié perd son `borderBottom` (il est dans la carte) et garde son fond
`rgba(255,250,235,0.45)`. L'avatar 64px : `fontSize: 24` pour l'initiale.

- [ ] **Step 4: `npx vitest run src/components/mobile/qg/overlays/CommandeRow.test.tsx`** — Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/qg/overlays/CommandeRow.tsx src/components/mobile/qg/overlays/CommandeRow.test.tsx
git commit -m "feat(carnet): cartes de commande encadrées — avatar 64px, aperçu des items recherchés"
```

---

### Task 3: `RegistreOverlay` + onglets + extraction des 2 contenus

**Files:**
- Create: `src/components/mobile/qg/overlays/RegistreOverlay.tsx`
- Create: `src/components/mobile/qg/overlays/OngletCommandes.tsx`
- Create: `src/components/mobile/qg/overlays/OngletComptes.tsx`
- Delete: `src/components/mobile/qg/overlays/CarnetNotesOverlay.tsx`, `CahierDeCompteOverlay.tsx`
- Test: rename `CarnetNotesOverlay.test.tsx` → `RegistreOverlay.test.tsx`

**Interfaces:**
- Produces:
  - `RegistreOverlay({ open, onglet, onOngletChange, onClose, state, onLivrerMission, tempsConfiance? })`
  - `OngletCommandes({ state, onLivrerMission, tempsConfiance? })` — rend aussi le sous-titre d'en-tête via son parent (voir Step 2).
  - `OngletComptes({ state, onReplay })` où `onReplay(session)` remonte au `RegistreOverlay` qui gère le mode replay plein écran.
- Consumes: `d.registre.*` (Task 1), `CommandeRow` (Task 2).

- [ ] **Step 1: Tests d'abord** — renommer le fichier de test et écrire :

```tsx
// RegistreOverlay.test.tsx (reprend withMissions() tel quel)
import { RegistreOverlay } from "./RegistreOverlay";

describe("RegistreOverlay", () => {
  it("onglet commandes : sections principales et quotidiennes", () => {
    render(<RegistreOverlay open onglet="commandes" onOngletChange={() => {}} state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    expect(screen.getByText(/principales/i)).toBeTruthy();
    expect(screen.getByText("Quête A")).toBeTruthy();
  });

  it("n'ouvre qu'un détail à la fois", () => {
    render(<RegistreOverlay open onglet="commandes" onOngletChange={() => {}} state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    fireEvent.click(screen.getByText("Quête A"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1);
    fireEvent.click(screen.getByText("Quête B"));
    expect(screen.getAllByText(/Objets demandés/).length).toBe(1);
  });

  it("onglet comptes : titre Cahier, pas de quêtes", () => {
    render(<RegistreOverlay open onglet="comptes" onOngletChange={() => {}} state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    expect(screen.getByText("Cahier de Compte")).toBeTruthy();
    expect(screen.queryByText("Quête A")).toBeNull();
  });

  it("clic sur l'onglet inactif → onOngletChange", () => {
    const onChange = vi.fn();
    render(<RegistreOverlay open onglet="commandes" onOngletChange={onChange} state={withMissions()} onClose={() => {}} onLivrerMission={() => ({ ok: true })} />);
    fireEvent.click(screen.getByRole("tab", { name: "Comptes" }));
    expect(onChange).toHaveBeenCalledWith("comptes");
  });
});
```

(ajouter `vi` à l'import vitest). Run → FAIL (module absent).

- [ ] **Step 2: Créer les 3 composants.**

`OngletCommandes.tsx` : déplacer TEL QUEL depuis `CarnetNotesOverlay.tsx` :
`formatRestant`, `trierActives`, les styles `sectionLabel`/`sectionSousLabel`,
tout le corps (états `ouvertId`/`termineesVisibles`, tick 1s, memos,
`renderSection`, listes terminées). Le composant rend UNIQUEMENT le contenu
scrollable (l'équivalent de `<div style={contenu}>…</div>`) + expose le
sous-titre : pour rester simple, le sous-titre (jour + livrables) est rendu
par `RegistreOverlay` qui recalcule `nbLivrables` (memo court, même code que
l'actuel).

`OngletComptes.tsx` : déplacer TEL QUEL depuis `CahierDeCompteOverlay.tsx` :
`ligneStyle`, cellules, `netStyle`, `typeLabel`, `DetailRepos`, l'état
`reposExpanded`, le memo `journees`. Le mode replay N'est PAS ici : la ligne
cliquable appelle `onReplay(j.session)` quand `peutReplay`.

`RegistreOverlay.tsx` :

```tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { estMissionLivrable } from "@/lib/missions";
import { SessionSummary, type SummaryItem } from "@/components/SessionSummary";
import { getBrocanteById } from "@/data/brocantes";
import { nomBrocante } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { OngletCommandes } from "./OngletCommandes";
import { OngletComptes } from "./OngletComptes";
import type { GameState, Session } from "@/types/game";

export type OngletRegistre = "commandes" | "comptes";

interface RegistreOverlayProps {
  open: boolean;
  onglet: OngletRegistre;
  onOngletChange: (o: OngletRegistre) => void;
  onClose: () => void;
  state: GameState;
  onLivrerMission: (courrierId: string) => { ok: boolean; raison?: string };
  tempsConfiance?: () => number | null;
}
```

Styles : reprendre `scrim`, `stage`, `carnet` (maxWidth **420**, maxHeight
**88dvh**), `closeBtn`, `ruban`, `enTete`, `titre`, `sousTitre`, `contenu`
depuis `CarnetNotesOverlay` ; reprendre `replayStage`, `replayBackBtn` depuis
`CahierDeCompteOverlay`. Onglets :

```tsx
const ongletsRow: CSSProperties = {
  display: "flex", gap: 6, padding: "0 18px", position: "relative", zIndex: 1,
};
const ongletBtn = (actif: boolean): CSSProperties => ({
  padding: actif ? "9px 16px 11px" : "7px 16px 9px",
  marginBottom: -2,
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: actif ? "#6e1f1f" : "#7a6438",
  background: actif ? "#f4e9cd" : "#d9c79a",
  border: actif ? "2px solid #6e1f1f" : "2px solid rgba(110,31,31,0.5)",
  borderBottom: actif ? "2px solid #f4e9cd" : "2px solid #6e1f1f",
  borderRadius: "8px 8px 0 0",
  cursor: actif ? "default" : "pointer",
  alignSelf: "flex-end",
});
```

Structure JSX :

```tsx
if (!open) return null;
if (replayOf) { /* bloc replay copié de CahierDeCompteOverlay, inchangé */ }
return (
  <>
    <div style={scrim} onClick={onClose} aria-hidden />
    <div style={stage} role="dialog" aria-modal="true">
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", maxHeight: "88dvh" }}>
        <div style={ongletsRow} role="tablist">
          <button type="button" role="tab" aria-selected={onglet === "commandes"} style={ongletBtn(onglet === "commandes")} onClick={() => onOngletChange("commandes")}>
            {d.registre.ongletCommandes}
          </button>
          <button type="button" role="tab" aria-selected={onglet === "comptes"} style={ongletBtn(onglet === "comptes")} onClick={() => onOngletChange("comptes")}>
            {d.registre.ongletComptes}
          </button>
        </div>
        <div style={carnetChassis}>
          {onglet === "commandes" && <div style={ruban} aria-hidden />}
          <button type="button" style={closeBtn} onClick={onClose} aria-label={d.carnet.fermer}>✕</button>
          <div style={enTete}>
            {onglet === "commandes" ? (
              <>
                <h2 style={titre}>{d.carnet.titre}</h2>
                <div style={sousTitre}>
                  {tr(d.carnet.jour, { n: state.jourActuel })}
                  {nbLivrables > 0 ? tr(nbLivrables > 1 ? d.carnet.livrablesSuffixe_n : d.carnet.livrablesSuffixe_un, { n: nbLivrables }) : ""}
                </div>
              </>
            ) : (
              <>
                <h2 style={titre}>{d.cahier.titre}</h2>
                <div style={sousTitre}>{tr(d.cahier.sousTitre, { jour: state.jourActuel, budget: state.budget })}</div>
              </>
            )}
          </div>
          <div style={contenu}>
            {onglet === "commandes" ? (
              <OngletCommandes state={state} onLivrerMission={onLivrerMission} tempsConfiance={tempsConfiance} />
            ) : (
              <OngletComptes state={state} onReplay={setReplayOf} />
            )}
          </div>
        </div>
      </div>
    </div>
  </>
);
```

Détails : `nbLivrables` recalculé par un `useMemo` identique à l'actuel ;
Escape ferme le replay avant la fenêtre (logique de `CahierDeCompteOverlay`) ;
scroll-lock body identique ; `titre` d'en-tête en 18px pour les deux onglets.
Supprimer les 2 anciens fichiers ; `git rm` inclus au commit.

- [ ] **Step 3: Vert**

Run: `npx vitest run src/components/mobile/qg/overlays/ && npx tsc --noEmit`
Expected: RegistreOverlay 4 PASS + CommandeRow 7 PASS ; tsc échouera encore
sur `layout.tsx` (imports des overlays supprimés) si Task 4 n'est pas faite —
dans ce cas enchaîner Task 4 avant le commit ne PAS committer un main cassé :
Task 3 et Task 4 peuvent être commitées ensemble si tsc l'exige.

- [ ] **Step 4: Commit** (éventuellement fusionné avec Task 4)

```bash
git add -A src/components/mobile/qg/overlays/
git commit -m "feat(registre): fenêtre unifiée à onglets Commandes/Comptes (châssis carnet 420px)"
```

---

### Task 4: Branchement `layout.tsx` (état unique)

**Files:**
- Modify: `src/app/(qg)/layout.tsx` (imports l.59-60, états, scène l.477-492, montages l.694-706)

**Interfaces:**
- Consumes: `RegistreOverlay`, `OngletRegistre` (Task 3).

- [ ] **Step 1: Remplacer états et montages.**

```tsx
// imports
import { RegistreOverlay, type OngletRegistre } from "@/components/mobile/qg/overlays/RegistreOverlay";
// état : remplacer carnetOuvert / carnetNotesOuvert par
const [registreOuvert, setRegistreOuvert] = useState<OngletRegistre | null>(null);
// scène : QgCarnet → setRegistreOuvert("comptes") ; QgCarnetNotes → setRegistreOuvert("commandes")
// montage : remplacer les deux overlays par
<RegistreOverlay
  open={registreOuvert !== null}
  onglet={registreOuvert ?? "commandes"}
  onOngletChange={setRegistreOuvert}
  onClose={() => setRegistreOuvert(null)}
  state={state}
  onLivrerMission={(id) => livrerMission(id)}
  tempsConfiance={tempsConfiance}
/>
```

Vérifier qu'aucune autre référence à `carnetOuvert`/`carnetNotesOuvert`
n'existe (grep) ; adapter si le tuto ou un badge s'y réfère.

- [ ] **Step 2: Vérification complète**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src/components/mobile/qg/overlays src/app/\(qg\)/layout.tsx`
Expected: suite verte, 0 erreur.

- [ ] **Step 3: Vérification visuelle** — dev server :3000, ouvrir le QG,
taper le carnet rouge (onglet Commandes actif, cartes larges avec vignettes),
basculer sur Comptes, taper le cahier de la scène (ouvre direct Comptes).

- [ ] **Step 4: Commit**

```bash
git add src/app/\(qg\)/layout.tsx
git commit -m "feat(qg): les deux objets de scène ouvrent le registre unifié sur le bon onglet"
```
