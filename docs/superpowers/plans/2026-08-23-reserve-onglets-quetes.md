# Réserve à onglets & onglet Quêtes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionner Stockage et Atelier en une pièce unique à deux onglets hauts (« la Réserve »), libérer la colonne gagnée pour un onglet Quêtes menant au carnet, et réaccorder le tutoriel aux positions déplacées.

**Architecture:** `/stockage` et `/atelier` restent deux vraies routes rendant la même coquille (`ReserveShell`) ; l'onglet haut actif se déduit de l'URL et un `router.replace()` bascule entre les deux. `TabDef` gagne un champ `routes` pour que l'onglet Réserve de la barre du bas revendique les deux chemins. Le carnet de quêtes passe d'un booléen local du layout `(qg)` à la route `/quetes`.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, vitest + @testing-library/react (jsdom), lucide-react, i18n maison (`src/lib/i18n/ui/{fr,en,es,el}.ts`).

**Spec:** `docs/superpowers/specs/2026-08-23-reserve-onglets-quetes-design.md`

## Global Constraints

- **Commande de test : `npx vitest run --maxWorkers=4`.** Sans `--maxWorkers=4`, ce Mac Intel produit ~41 faux échecs par famine de workers. Ne jamais lancer `npx vitest run` nu.
- **Lint : `npx eslint src`.** `npm run lint` est cassé depuis Next 16 — ne pas l'utiliser.
- **Quatre langues obligatoires** : toute clé ajoutée à `src/lib/i18n/ui/fr.ts` doit l'être aussi dans `en.ts`, `es.ts` et `el.ts`. Le type `DictionnaireUI` est dérivé de `fr.ts` : un oubli casse la compilation des trois autres.
- **Aucune migration de sauvegarde.** Rien ici ne touche l'état persisté ; `SAVE_VERSION` ne bouge pas.
- **Aucune chaîne localisée en sauvegarde** (règle du dépôt).
- **Serveur de recette** : `next dev` sur `http://localhost:3000`. Toujours `localhost`, jamais `127.0.0.1` (l'app reste figée sur « Ouverture du local… »). Un seul `next dev` à la fois.
- **Commits en français**, style du dépôt : `feat(reserve): …`, `fix(tuto): …`, `test(nav): …`.
- Libellés figés par la spec :

  | Clé | fr | en | es | el |
  |---|---|---|---|---|
  | `reserve` | Réserve | Storeroom | Almacén | Αποθήκη |
  | `quetes` | Quêtes | Quests | Misiones | Αποστολές |
  | `quetesAbrege` | Quêtes | Quests | Misiones | Αποστ. |

---

## Structure des fichiers

**Créés**

| Fichier | Responsabilité |
|---|---|
| `src/components/mobile/reserve/ReserveTabs.tsx` | La bande d'onglets haute : deux onglets, cadenas, pastille de badge. Ne connaît pas le contenu. |
| `src/components/mobile/reserve/ReserveTabs.test.tsx` | Tests de la bande. |
| `src/components/mobile/reserve/ReserveShell.tsx` | Le `FloatingRoomOverlay` commun + la règle « pas de glissement entre onglets frères ». |
| `src/components/mobile/reserve/ReserveShell.test.tsx` | Tests de la règle d'animation. |
| `src/components/mobile/reserve/StockageContenu.tsx` | Le corps actuel de `app/(qg)/stockage/page.tsx`, déplacé tel quel. |
| `src/components/mobile/reserve/AtelierContenu.tsx` | Le corps actuel de `app/(qg)/atelier/page.tsx`, déplacé tel quel. |
| `src/app/(qg)/quetes/page.tsx` | Page marqueur rendant `null` (même montage que `/bureau`). |

**Modifiés**

| Fichier | Changement |
|---|---|
| `src/components/mobile/TabBar.tsx` | `TabDef.routes`, `TabDef.abrege`, `findActiveTabIndex`, nouvel ordre, onglet Réserve, onglet Quêtes. |
| `src/components/mobile/TabBar.test.tsx` | Tests des points ci-dessus. |
| `src/app/(qg)/stockage/page.tsx` | Devient une coquille de 10 lignes montant `ReserveShell` sur l'onglet `stockage`. |
| `src/app/(qg)/atelier/page.tsx` | Idem, onglet `atelier`. |
| `src/lib/ads/emplacementsAppeles.test.ts` | Le chemin lu suit le déplacement de l'appel `showRewardedAd`. |
| `src/lib/routesPartie.ts` | `/quetes` ajouté. |
| `src/components/mobile/SwipePager.tsx` | `/quetes` ajouté à `QG_GROUP`. |
| `src/components/mobile/GlobalVinylAmbiance.tsx` | `/quetes` ajouté à `PANORAMA_PATHS`. |
| `src/components/mobile/qg/carnet/CarnetOverlay.tsx` | Voile cadré au-dessus de la barre du bas. |
| `src/app/(qg)/layout.tsx` | Carnet piloté par la route ; `QgCarnet` retiré ; doigt de swipe retiré. |
| `src/lib/tutoriel.ts` | `chapitreDuCarnetDu` reformulé, `doigtSwipeVersCarnet` supprimé. |
| `src/lib/tutoriel.test.ts` | Suit. |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | Libellés, consigne, bulle de coach. |

**Supprimé**

| Fichier | Raison |
|---|---|
| `src/components/mobile/qg/QgCarnet.tsx` | Le livre quitte le panorama ; l'onglet Quêtes est le seul chemin. |

---

## Partie ① — La Réserve

### Task 1: `TabDef.routes` — un onglet peut revendiquer plusieurs chemins

C'est la tâche fondatrice : sans elle, `findActiveTabIndex("/atelier")` renverra `-1` une fois l'onglet Atelier retiré de la barre, et **le swipe entre pièces cassera en silence** (`SwipePager` s'en sert pour savoir d'où il part).

**Files:**
- Modify: `src/components/mobile/TabBar.tsx` (interface `TabDef`, `TAB_ORDER`, `findActiveTabIndex`, `libelleAbrege`, `libelleAria`)
- Test: `src/components/mobile/TabBar.test.tsx`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces:
  - `interface TabDef { icon: LucideIcon; cle: OngletCle; path: string; routes: string[]; abrege?: (d: DictionnaireUI) => string; badge?: (state: GameState, now: number) => number; verrou?: { ouvert: (state: GameState) => boolean; raison: (d: DictionnaireUI) => string } }`
  - `findActiveTabIndex(pathname: string): number` — signature inchangée, résolution élargie à `routes`.
  - `type OngletCle = "collection" | "bibliotheque" | "bureau" | "reserve" | "quetes"`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter en fin de `src/components/mobile/TabBar.test.tsx` :

```tsx
import { TabBar, findActiveTabIndex, ongletSuivantOuvert, TAB_ORDER } from "./TabBar";

describe("findActiveTabIndex — un onglet peut revendiquer plusieurs routes", () => {
  it("/stockage tombe sur l'onglet Réserve", () => {
    const i = findActiveTabIndex("/stockage");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(TAB_ORDER[i].cle).toBe("reserve");
  });

  it("/atelier tombe sur le MÊME onglet — sinon le swipe entre pièces casse", () => {
    expect(findActiveTabIndex("/atelier")).toBe(findActiveTabIndex("/stockage"));
  });

  it("une sous-route d'un chemin revendiqué compte aussi", () => {
    expect(findActiveTabIndex("/atelier/quoi-que-ce-soit")).toBe(
      findActiveTabIndex("/stockage"),
    );
  });

  it("une route étrangère ne tombe sur aucun onglet", () => {
    expect(findActiveTabIndex("/chiner")).toBe(-1);
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: FAIL — `findActiveTabIndex` n'est pas exporté sous ce nom depuis le test, ou `TAB_ORDER[i].cle` vaut `"stockage"` et non `"reserve"`.

- [ ] **Step 3: Élargir `TabDef` et la résolution**

Dans `src/components/mobile/TabBar.tsx`, remplacer le type `OngletCle` et l'interface `TabDef` :

```tsx
/** Clé d'onglet — sert à retrouver le libellé traduit dans `d.chrome.onglets`. */
type OngletCle = "collection" | "bibliotheque" | "bureau" | "reserve" | "quetes";

export interface TabDef {
  icon: LucideIcon;
  cle: OngletCle;
  /** Route ouverte au tap. Toujours le premier élément de `routes`. */
  path: string;
  /**
   * TOUS les chemins qui appartiennent à cet onglet. La Réserve en a deux
   * (`/stockage` et `/atelier`) : ce sont deux vraies routes rendant la même
   * coquille, et l'onglet doit se reconnaître actif sur les deux. Sans ça,
   * `findActiveTabIndex` renvoie -1 sur /atelier et le swipe entre pièces
   * ne sait plus d'où il part.
   */
  routes: string[];
  /** Libellé court pour la colonne étroite. À défaut, `d.chrome.onglets[cle]`. */
  abrege?: (d: DictionnaireUI) => string;
  /** `now` = temps de confiance (epoch ms) pour les badges dépendant du temps réel. */
  badge?: (state: GameState, now: number) => number;
  verrou?: {
    ouvert: (state: GameState) => boolean;
    raison: (d: DictionnaireUI) => string;
  };
}
```

Remplacer `findActiveTabIndex` :

```tsx
/** Renvoie l'index dans TAB_ORDER de la route active, -1 si aucune ne matche. */
export function findActiveTabIndex(pathname: string): number {
  return TAB_ORDER.findIndex((t) =>
    t.routes.some((r) => pathname === r || pathname.startsWith(`${r}/`)),
  );
}
```

Remplacer les deux fonctions de libellé, qui traitaient la Bibliothèque en cas
particulier codé en dur — un troisième cas serait le début d'une liste :

```tsx
/** Libellé abrégé affiché sous l'icône (colonne étroite) — cf. `d.chrome.onglets`. */
function libelleAbrege(tab: TabDef, d: DictionnaireUI): string {
  return tab.abrege ? tab.abrege(d) : d.chrome.onglets[tab.cle];
}

/** Libellé complet pour les lecteurs d'écran (aria-label), quand l'abrégé diffère. */
function libelleAria(tab: TabDef, d: DictionnaireUI): string {
  return d.chrome.onglets[tab.cle];
}
```

Mettre à jour les quatre appels dans le corps de `TabBar` : `libelleAbrege(tab, d)` et `libelleAria(tab, d)` (ils passaient `tab.cle`).

Dans `TAB_ORDER`, ajouter `routes` à chaque entrée et fusionner Stockage + Atelier. **L'ordre définitif (Quêtes en 1, Collection en 5) arrive en Task 8** — ici on garde l'ordre actuel pour ne changer qu'une chose à la fois :

```tsx
export const TAB_ORDER: TabDef[] = [
  { icon: Album, cle: "collection", path: "/collection", routes: ["/collection"] },
  {
    icon: BookOpen,
    cle: "bibliotheque",
    path: "/bibliotheque",
    routes: ["/bibliotheque"],
    abrege: (d) => d.chrome.onglets.bibliothequeAbrege,
    badge: (state) => state.brocanteur.pointsDisponibles,
    verrou: {
      ouvert: (s) => s.brocanteur.niveau >= 1,
      raison: (d) => d.chrome.verrouBibliotheque,
    },
  },
  { icon: Home, cle: "bureau", path: "/bureau", routes: ["/bureau"] },
  {
    icon: Warehouse,
    cle: "reserve",
    path: "/stockage",
    routes: ["/stockage", "/atelier"],
    // Le badge des restaurations prêtes vivait sur l'onglet Atelier, qui
    // n'existe plus en bas : il remonte ici. La bande d'onglets haute le
    // redouble sur l'onglet Atelier (cf. ReserveTabs) pour dire laquelle des
    // deux moitiés appelle.
    badge: (state, now) =>
      state.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length,
  },
];
```

Retirer l'import devenu inutile de `Anvil` et celui de `aCompetenceReparation` **seulement si plus aucune référence ne subsiste** (le verrou déménage en Task 2 : garder l'import si Task 2 n'est pas encore faite provoquerait un lint `no-unused-vars` — le retirer ici est correct, Task 2 le réimportera dans `ReserveTabs.tsx`).

- [ ] **Step 4: Ajouter la clé de libellé `reserve` dans les quatre langues**

Dans `src/lib/i18n/ui/fr.ts`, bloc `chrome.onglets` : remplacer `stockage: "Stockage",` par les deux lignes suivantes, en gardant `atelier` (il sert désormais à l'onglet **haut**) :

```ts
      stockage: "Stockage",
      atelier: "Atelier",
      reserve: "Réserve",
```

Faire de même dans `en.ts` (`reserve: "Storeroom",`), `es.ts` (`reserve: "Almacén",`) et `el.ts` (`reserve: "Αποθήκη",`).

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: PASS. Les tests existants d'onboarding attendent 5 boutons — ils vont **échouer à 4**. Les ajuster à `toHaveLength(4)` avec le commentaire `// 5 colonnes reviennent en Task 8 avec l'onglet Quêtes.`

- [ ] **Step 6: Vérifier que rien d'autre n'a cassé**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS partout. Puis `npx eslint src` — attendu : aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/TabBar.tsx src/components/mobile/TabBar.test.tsx src/lib/i18n/ui/
git commit -m "feat(nav): un onglet de la barre peut revendiquer plusieurs routes"
```

---

### Task 2: `ReserveTabs` — la bande d'onglets haute

**Files:**
- Create: `src/components/mobile/reserve/ReserveTabs.tsx`
- Test: `src/components/mobile/reserve/ReserveTabs.test.tsx`

**Interfaces:**
- Consumes: rien de Task 1 (composant autonome).
- Produces:
  - `export type OngletReserve = "stockage" | "atelier"`
  - `export function ReserveTabs(props: { actif: OngletReserve; atelierOuvert: boolean; badgeAtelier: number; onChoisir: (o: OngletReserve) => void; onVerrou: () => void }): JSX.Element`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/components/mobile/reserve/ReserveTabs.test.tsx` :

```tsx
// @vitest-environment jsdom
/**
 * `ReserveTabs` — la bande d'onglets en tête de la Réserve. Elle remplace le
 * titre centré de la carte : l'onglet actif EST le titre. Le cadenas de
 * l'Atelier, qui vivait dans la barre du bas, vit désormais ici.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReserveTabs } from "./ReserveTabs";

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      chrome: {
        onglets: { stockage: "Stockage", atelier: "Atelier" },
        ongletVerrouille: "verrouillé",
      },
    },
  }),
}));

afterEach(cleanup);

function poser(over: Partial<Parameters<typeof ReserveTabs>[0]> = {}) {
  const props = {
    actif: "stockage" as const,
    atelierOuvert: true,
    badgeAtelier: 0,
    onChoisir: vi.fn(),
    onVerrou: vi.fn(),
    ...over,
  };
  render(<ReserveTabs {...props} />);
  return props;
}

const bouton = (t: string) =>
  screen.getAllByRole("button").find((b) => b.textContent?.includes(t))!;

describe("ReserveTabs", () => {
  it("marque l'onglet actif pour les lecteurs d'écran", () => {
    poser({ actif: "atelier" });
    expect(bouton("Atelier").getAttribute("aria-current")).toBe("page");
    expect(bouton("Stockage").getAttribute("aria-current")).toBeNull();
  });

  it("choisir l'autre onglet le remonte au parent", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Atelier"));
    expect(onChoisir).toHaveBeenCalledWith("atelier");
  });

  it("taper l'onglet DÉJÀ actif ne redemande rien", () => {
    const { onChoisir } = poser({ actif: "stockage" });
    fireEvent.click(bouton("Stockage"));
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("atelier fermé : cadenassé, et le tap appelle le verrou au lieu de naviguer", () => {
    const { onChoisir, onVerrou } = poser({ atelierOuvert: false });
    const atelier = bouton("Atelier");
    expect(atelier.getAttribute("aria-disabled")).toBe("true");
    expect(atelier.getAttribute("aria-label")).toContain("verrouillé");
    fireEvent.click(atelier);
    expect(onVerrou).toHaveBeenCalledTimes(1);
    expect(onChoisir).not.toHaveBeenCalled();
  });

  it("le badge de restaurations prêtes s'affiche sur l'onglet Atelier", () => {
    poser({ badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).toContain("3");
  });

  it("aucun badge sous un cadenas", () => {
    poser({ atelierOuvert: false, badgeAtelier: 3 });
    expect(bouton("Atelier").textContent).not.toContain("3");
  });

  it("porte l'ancre de coach du tutoriel sur l'onglet Atelier", () => {
    poser();
    expect(
      document.querySelector('[data-tuto-coach="reserve-onglet-atelier"]'),
    ).not.toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/reserve/ReserveTabs.test.tsx --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./ReserveTabs"`.

- [ ] **Step 3: Écrire le composant**

Créer `src/components/mobile/reserve/ReserveTabs.tsx` :

```tsx
"use client";

/**
 * Bande d'onglets en tête de la Réserve (Stockage | Atelier).
 *
 * Elle REMPLACE le titre centré `— STOCKAGE —` de la carte du haut au lieu
 * de s'y ajouter : le titre devient redondant dès qu'un onglet porte le même
 * mot, et une barre de plus coûterait ~34 px sur un écran déjà serré entre le
 * header et la barre du bas.
 *
 * L'onglet actif est du même papier que la carte qu'il coiffe et n'a PAS de
 * bordure basse : l'onglet et la carte ne font qu'un. L'inactif est en retrait
 * (papier plus sombre) et porte le trait.
 *
 * Le cadenas de l'Atelier vivait dans la barre du bas ; il vit ici depuis la
 * fusion, avec exactement le même vocabulaire (icône grisée, cadenas laiton,
 * opacité réduite, un toast au tap et aucune navigation) pour que le joueur
 * reconnaisse la règle.
 */

import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/mobile/Badge";
import { useLangue } from "@/lib/i18n/LangueContext";

export type OngletReserve = "stockage" | "atelier";

interface ReserveTabsProps {
  actif: OngletReserve;
  /** Faux tant que le joueur n'a pas sa première compétence Réparer. */
  atelierOuvert: boolean;
  /** Restaurations prêtes à récupérer. Ignoré si l'atelier est fermé. */
  badgeAtelier: number;
  onChoisir: (onglet: OngletReserve) => void;
  onVerrou: () => void;
}

const bande: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  // Colle la bande aux bords de la carte : les onglets touchent son liseré.
  margin: "-8px -10px 8px",
};

function ongletStyle(actif: boolean, verrouille: boolean): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: "var(--tap-min)",
    padding: "8px 6px",
    border: "none",
    // L'actif ne porte pas de trait bas : il se fond dans la carte.
    borderBottom: actif ? "none" : "1px solid var(--brass-500)",
    background: actif ? "var(--paper-100)" : "var(--paper-200)",
    color: actif ? "var(--forest-800)" : "var(--brass-700)",
    fontFamily: "var(--font-display)",
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    cursor: "pointer",
    opacity: verrouille ? 0.55 : 1,
    minWidth: 0,
  };
}

const cadenas: CSSProperties = {
  color: "var(--brass-700)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
  flexShrink: 0,
};

export function ReserveTabs({
  actif,
  atelierOuvert,
  badgeAtelier,
  onChoisir,
  onVerrou,
}: ReserveTabsProps) {
  const { d } = useLangue();
  // Aucun badge sous un cadenas : un compteur clignoterait derrière une porte
  // fermée (même règle que la barre du bas).
  const badge = atelierOuvert ? badgeAtelier : 0;

  return (
    <div style={bande}>
      <button
        type="button"
        aria-current={actif === "stockage" ? "page" : undefined}
        aria-label={d.chrome.onglets.stockage}
        onClick={() => {
          if (actif !== "stockage") onChoisir("stockage");
        }}
        style={ongletStyle(actif === "stockage", false)}
      >
        {d.chrome.onglets.stockage}
      </button>

      <button
        type="button"
        data-tuto-coach="reserve-onglet-atelier"
        aria-current={actif === "atelier" ? "page" : undefined}
        aria-disabled={atelierOuvert ? undefined : true}
        aria-label={
          atelierOuvert
            ? d.chrome.onglets.atelier
            : `${d.chrome.onglets.atelier} — ${d.chrome.ongletVerrouille}`
        }
        onClick={() => {
          if (!atelierOuvert) {
            onVerrou();
            return;
          }
          if (actif !== "atelier") onChoisir("atelier");
        }}
        style={ongletStyle(actif === "atelier", !atelierOuvert)}
      >
        {!atelierOuvert && <Lock size={13} strokeWidth={2.6} style={cadenas} />}
        {d.chrome.onglets.atelier}
        {badge > 0 && <Badge count={badge} />}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/reserve/ReserveTabs.test.tsx --maxWorkers=4`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile/reserve/
git commit -m "feat(reserve): la bande d'onglets haute, cadenas et badge compris"
```

---

### Task 3: `ReserveShell` — la coquille et sa règle d'animation

`FloatingRoomOverlay` joue une entrée de 320 ms (la bande glisse de sous le header, le panneau monte de la barre du bas). Juste à l'arrivée dans la pièce ; lourde et lente rejouée à chaque tap d'onglet — et comme on change réellement de route, React démonte tout et l'animation repartirait.

Le garde-fou sert deux fois : il évite l'animation, et il donne au coach du tutoriel une image immobile à mesurer (l'animation de 320 ms a déjà faussé une mesure au montage, recette du 19 août).

**Files:**
- Create: `src/components/mobile/reserve/ReserveShell.tsx`
- Test: `src/components/mobile/reserve/ReserveShell.test.tsx`
- Modify: `src/components/mobile/floating-room/FloatingRoomOverlay.tsx` (prop `animer`)

**Interfaces:**
- Consumes: `ReserveTabs`, `OngletReserve` (Task 2).
- Produces:
  - `export function ReserveShell(props: { onglet: OngletReserve; atelierOuvert: boolean; badgeAtelier: number; onVerrou: () => void; bande: ReactNode; milieu?: ReactNode; children: ReactNode }): JSX.Element`
  - `export function __resetMemoireReserve(): void` — réservé aux tests.
  - `FloatingRoomOverlay` accepte désormais `animer?: boolean` (défaut `true`).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/components/mobile/reserve/ReserveShell.test.tsx` :

```tsx
// @vitest-environment jsdom
/**
 * `ReserveShell` — la coquille commune aux deux onglets de la Réserve.
 * Le point testé n'est pas le rendu mais la RÈGLE D'ANIMATION : arriver de
 * l'onglet frère ne doit pas rejouer le glissement de 320 ms (cf. spec).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ReserveShell, __resetMemoireReserve } from "./ReserveShell";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: pushMock }),
}));

vi.mock("@/lib/i18n/LangueContext", () => ({
  useLangue: () => ({
    d: {
      chrome: {
        onglets: { stockage: "Stockage", atelier: "Atelier" },
        ongletVerrouille: "verrouillé",
      },
    },
  }),
}));

beforeEach(() => __resetMemoireReserve());
afterEach(cleanup);

function poser(onglet: "stockage" | "atelier") {
  render(
    <ReserveShell
      onglet={onglet}
      atelierOuvert
      badgeAtelier={0}
      onVerrou={() => {}}
      bande={<div>bande</div>}
    >
      <div>contenu</div>
    </ReserveShell>,
  );
}

const overlay = () => document.querySelector("[data-floating-room]") as HTMLElement;

describe("ReserveShell — règle d'animation", () => {
  it("première arrivée dans la Réserve : le glissement joue", () => {
    poser("stockage");
    expect(overlay().getAttribute("data-animer")).toBe("1");
  });

  it("arrivée depuis l'onglet frère : pas de glissement", () => {
    poser("stockage");
    cleanup();
    poser("atelier");
    expect(overlay().getAttribute("data-animer")).toBe("0");
  });

  it("retour dans la Réserve après en être sorti : le glissement rejoue", () => {
    poser("stockage");
    cleanup();
    __resetMemoireReserve(); // ce que fait la sortie de la Réserve
    poser("atelier");
    expect(overlay().getAttribute("data-animer")).toBe("1");
  });

  it("rend la bande et le contenu de l'onglet", () => {
    poser("stockage");
    expect(screen.getByText("bande")).toBeTruthy();
    expect(screen.getByText("contenu")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/reserve/ReserveShell.test.tsx --maxWorkers=4`
Expected: FAIL — `Failed to resolve import "./ReserveShell"`.

- [ ] **Step 3: Rendre l'animation débrayable dans `FloatingRoomOverlay`**

Dans `src/components/mobile/floating-room/FloatingRoomOverlay.tsx`, ajouter la prop et l'appliquer :

```tsx
interface FloatingRoomOverlayProps {
  /** Carte haute (titre, actions, filtres). Glisse depuis le haut. */
  bande: ReactNode;
  /** Bloc carte optionnel entre bande et panneau (ex. slots d'atelier). */
  milieu?: ReactNode;
  /** Panneau bas (contenu scrollable). Monte depuis le bas. */
  children: ReactNode;
  /**
   * Jouer l'entrée glissée de 320 ms ? Faux quand on arrive d'un onglet
   * frère de la même pièce : les deux cartes sont déjà en place, les faire
   * re-glisser serait lourd — et le coach du tutoriel mesurerait une cible
   * en mouvement.
   */
  animer?: boolean;
}

export function FloatingRoomOverlay({
  bande,
  milieu,
  children,
  animer = true,
}: FloatingRoomOverlayProps) {
  const sansAnim = { animation: "none" as const };
  return (
    <div style={wrap} data-floating-room="1" data-animer={animer ? "1" : "0"}>
      <div style={animer ? bandeStyle : { ...bandeStyle, ...sansAnim }}>{bande}</div>
      {milieu !== undefined && (
        <div style={animer ? milieuStyle : { ...milieuStyle, ...sansAnim }}>{milieu}</div>
      )}
      <div style={animer ? panneauStyle : { ...panneauStyle, ...sansAnim }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Écrire `ReserveShell`**

Créer `src/components/mobile/reserve/ReserveShell.tsx` :

```tsx
"use client";

/**
 * Coquille commune aux deux onglets de la Réserve.
 *
 * `/stockage` et `/atelier` restent DEUX vraies routes — sept mécanismes du
 * jeu les désignent par leur chemin (chrome global, ambiance sonore, vol des
 * objets, onglet permis par le tutoriel, fermeture des sheets, deep-link
 * `?cat=`, notification de restauration) et continuent de fonctionner sans
 * être touchés. Basculer d'onglet fait donc un vrai `router.replace()`, et
 * React démonte la page.
 *
 * D'où la mémoire de module ci-dessous : elle retient la dernière pièce de la
 * Réserve montée, pour savoir si l'on arrive de l'onglet frère (et sauter le
 * glissement d'entrée) ou d'ailleurs dans le jeu (et le jouer).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FloatingRoomOverlay } from "@/components/mobile/floating-room/FloatingRoomOverlay";
import { ReserveTabs, type OngletReserve } from "./ReserveTabs";

/** Dernier onglet de la Réserve monté, ou null si l'on n'y est plus. */
let dernierOngletMonte: OngletReserve | null = null;

/** Réservé aux tests : remet la mémoire à zéro entre deux cas. */
export function __resetMemoireReserve(): void {
  dernierOngletMonte = null;
}

const ROUTE_ONGLET: Record<OngletReserve, string> = {
  stockage: "/stockage",
  atelier: "/atelier",
};

interface ReserveShellProps {
  onglet: OngletReserve;
  atelierOuvert: boolean;
  badgeAtelier: number;
  /** Appelé au tap sur l'onglet Atelier cadenassé (le parent toaste). */
  onVerrou: () => void;
  bande: ReactNode;
  milieu?: ReactNode;
  children: ReactNode;
}

export function ReserveShell({
  onglet,
  atelierOuvert,
  badgeAtelier,
  onVerrou,
  bande,
  milieu,
  children,
}: ReserveShellProps) {
  const router = useRouter();
  // Décidé UNE fois au premier rendu : un re-rendu ne doit pas rallumer
  // l'animation au milieu de la vie du composant.
  const [animer] = useState(() => dernierOngletMonte === null);
  const ongletRef = useRef(onglet);
  ongletRef.current = onglet;

  useEffect(() => {
    dernierOngletMonte = ongletRef.current;
    return () => {
      // Le démontage peut être un passage à l'onglet frère (on garde la
      // mémoire) ou une sortie de la Réserve. On ne peut pas le savoir ici :
      // c'est le montage suivant qui tranche, en écrasant la valeur. La
      // sortie est traitée par le nettoyage différé ci-dessous.
      const parti = ongletRef.current;
      queueMicrotask(() => {
        if (dernierOngletMonte === parti) dernierOngletMonte = null;
      });
    };
  }, []);

  return (
    <FloatingRoomOverlay
      animer={animer}
      bande={
        <>
          <ReserveTabs
            actif={onglet}
            atelierOuvert={atelierOuvert}
            badgeAtelier={badgeAtelier}
            onChoisir={(o) => router.replace(ROUTE_ONGLET[o])}
            onVerrou={onVerrou}
          />
          {bande}
        </>
      }
      milieu={milieu}
    >
      {children}
    </FloatingRoomOverlay>
  );
}
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/reserve/ --maxWorkers=4`
Expected: PASS.

Si le test « arrivée depuis l'onglet frère » échoue parce que le `queueMicrotask` du démontage a déjà tiré entre les deux `render`, remplacer dans le test l'appel `cleanup()` intermédiaire par un démontage suivi d'un montage synchrone — mais **ne pas retirer le nettoyage différé** : sans lui, sortir de la Réserve puis y revenir n'animerait plus jamais.

- [ ] **Step 6: Vérifier la non-régression du châssis**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS — en particulier les tests existants qui montent `FloatingRoomOverlay` (la prop `animer` a un défaut `true`, le comportement historique).

- [ ] **Step 7: Commit**

```bash
git add src/components/mobile/reserve/ src/components/mobile/floating-room/
git commit -m "feat(reserve): la coquille commune et sa règle d'animation entre onglets frères"
```

---

### Task 4: Extraire les contenus et brancher les deux routes

**Files:**
- Create: `src/components/mobile/reserve/StockageContenu.tsx`
- Create: `src/components/mobile/reserve/AtelierContenu.tsx`
- Modify: `src/app/(qg)/stockage/page.tsx`
- Modify: `src/app/(qg)/atelier/page.tsx`
- Modify: `src/lib/ads/emplacementsAppeles.test.ts`

**Interfaces:**
- Consumes: `ReserveShell` (Task 3), `OngletReserve` (Task 2).
- Produces:
  - `export function StockageContenu(): JSX.Element` — rend `ReserveShell` avec `onglet="stockage"`.
  - `export function AtelierContenu(): JSX.Element` — rend `ReserveShell` avec `onglet="atelier"`.

**Ne pas réécrire la logique.** Il s'agit d'un déplacement mécanique de 315 et 896 lignes : un changement de navigation ne justifie pas de retoucher la logique métier. Toute envie de « nettoyer au passage » est hors périmètre.

- [ ] **Step 1: Déplacer le corps du stockage**

```bash
git mv "src/app/(qg)/stockage/page.tsx" src/components/mobile/reserve/StockageContenu.tsx
```

Dans `StockageContenu.tsx` :
- renommer `export default function StockagePage()` en `export function StockageContenu()`, et `StockagePageInner` en `StockageContenuInner` ;
- remplacer l'import et l'usage de `FloatingRoomOverlay` par `ReserveShell` (`import { ReserveShell } from "./ReserveShell";`) ;
- supprimer le `<PageHeaderBar title={d.chrome.onglets.stockage} …>` — l'onglet actif EST le titre — en **gardant ses zones `left` et `right`** (la ligne `MALLE 14/20` et le bouton d'amélioration), remontées directement dans `bande`, séparées par le même conteneur `PageHeaderBar` avec `align="left"` et sans `title`. Si `PageHeaderBar` exige `title`, rendre à la place un `<div>` reprenant `wrapLeft` : `display:flex; align-items:center; justify-content:space-between; gap:10`.
- passer à `ReserveShell` les props nouvelles :

```tsx
<ReserveShell
  onglet="stockage"
  atelierOuvert={aCompetenceReparation(state)}
  badgeAtelier={
    state.inventaireJoueur.filter(
      (o) => o.enRestauration && estPret(o.enRestauration, tempsConfiance() ?? Date.now()),
    ).length
  }
  onVerrou={() => toast(d.chrome.verrouAtelier, { type: "info" })}
  bande={/* … zones left/right existantes … */}
>
```

avec les imports `aCompetenceReparation` depuis `@/lib/competences`, `estPret` depuis `@/lib/restauration`, `useToast` depuis `@/components/ui/Toast` et `tempsConfiance` depuis `useGameActions()`.

- [ ] **Step 2: Recréer la page-route du stockage**

Créer `src/app/(qg)/stockage/page.tsx` :

```tsx
// Route de l'onglet Stockage de la Réserve. Le contenu vit dans
// components/mobile/reserve : /stockage et /atelier rendent la même
// coquille, seul l'onglet actif change (cf. spec 2026-08-23).
import { StockageContenu } from "@/components/mobile/reserve/StockageContenu";

export default function StockagePage() {
  return <StockageContenu />;
}
```

- [ ] **Step 3: Vérifier le stockage sur le localhost**

Ouvrir `http://localhost:3000/stockage`. Attendu : la bande d'onglets STOCKAGE | 🔒 ATELIER en tête de la carte, la ligne `MALLE x/y` et le bouton d'amélioration dessous, la grille d'objets en panneau bas. Le titre `— STOCKAGE —` a disparu.

- [ ] **Step 4: Commit intermédiaire**

```bash
git add -A
git commit -m "feat(reserve): l'onglet Stockage passe dans la coquille commune"
```

- [ ] **Step 5: Déplacer le corps de l'atelier**

```bash
git mv "src/app/(qg)/atelier/page.tsx" src/components/mobile/reserve/AtelierContenu.tsx
```

Mêmes transformations : `export function AtelierContenu()`, `ReserveShell` à la place de `FloatingRoomOverlay`, suppression du `PageHeaderBar title={d.chrome.onglets.atelier}` en gardant sa zone `left` (le compteur d'établis) et la `PiecesInventoryBar` juste dessous. Le bloc `milieu` (les trois établis) passe tel quel à `ReserveShell`.

Créer `src/app/(qg)/atelier/page.tsx` :

```tsx
// Route de l'onglet Atelier de la Réserve. Cf. stockage/page.tsx.
import { AtelierContenu } from "@/components/mobile/reserve/AtelierContenu";

export default function AtelierPage() {
  return <AtelierContenu />;
}
```

- [ ] **Step 6: Faire suivre la garde publicitaire — sinon elle casse en silence**

`src/lib/ads/emplacementsAppeles.test.ts` **lit le fichier de l'atelier par son chemin** et vérifie qu'il demande son propre bloc AdMob. Sans ce bloc de garde, tout le trafic publicitaire retombe sur celui de la recharge d'énergie et les revenus deviennent illisibles par écran. Le fichier lu ne contient plus l'appel : mettre à jour la table.

```ts
const APPELANTS = [
  ["src/components/mobile/EnergieRecharge.tsx", "energie"],
  ["src/components/mobile/BoiteMystereOverlay.tsx", "boiteMystere"],
  ["src/components/mobile/reserve/AtelierContenu.tsx", "restauration"],
] as const;
```

- [ ] **Step 7: Lancer la garde publicitaire, puis toute la suite**

Run: `npx vitest run src/lib/ads/emplacementsAppeles.test.ts --maxWorkers=4`
Expected: PASS. Un échec `ENOENT` signifie que le chemin de la table ne correspond pas au fichier réellement créé.

Run: `npx vitest run --maxWorkers=4`
Expected: PASS partout.

Run: `npx eslint src`
Expected: aucune erreur (guetter les imports devenus inutiles dans les deux fichiers déplacés).

- [ ] **Step 8: Recette sur le localhost**

Ouvrir `http://localhost:3000/stockage`, taper l'onglet ATELIER (avec une sauvegarde ayant la compétence Réparer). Attendu : bascule **sans glissement** des cartes, les trois établis apparaissent en bloc milieu. Taper STOCKAGE : retour, toujours sans glissement. Passer par le Bureau puis revenir : le glissement joue.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(reserve): l'onglet Atelier rejoint la coquille, garde AdMob resuivie"
```

---

### Task 5: Le verrou et le badge quittent la barre du bas

**Files:**
- Modify: `src/components/mobile/TabBar.tsx`
- Test: `src/components/mobile/TabBar.test.tsx`

**Interfaces:**
- Consumes: `TabDef.routes` (Task 1).
- Produces: rien de nouveau ; l'onglet Réserve n'a plus de `verrou`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/components/mobile/TabBar.test.tsx` :

```tsx
describe("TabBar — la Réserve remplace Stockage et Atelier", () => {
  it("un seul onglet pour les deux pièces, et aucun cadenas dessus", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(screen.getByText("Réserve")).toBeTruthy();
    expect(screen.queryByText("Atelier")).toBeNull();
    expect(estCadenasse("Réserve")).toBe(false);
  });

  it("l'onglet Réserve se sait actif sur /atelier", () => {
    mockPathname = "/atelier";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(onglet("Réserve").getAttribute("aria-current")).toBe("page");
  });

  it("la main du mini-tuto vinyle « ajouter » se pose sur la Réserve", () => {
    mockPathname = "/bureau";
    mockGameStateValue = {
      state: {
        ...etat(1),
        miniTutoVinyle: "ajouter",
      } as unknown as GameState,
      isHydrated: true,
    };
    render(<TabBar />);
    const main = screen
      .getAllByRole("button")
      .find((b) => b.className.includes("tuto-main"));
    expect(main?.textContent).toContain("Réserve");
  });
});
```

Le mock de langue doit fournir `d.chrome.onglets.reserve = "Réserve"` : vérifier le mock i18n en tête de `TabBar.test.tsx` et l'étendre si besoin.

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: FAIL sur « Réserve » introuvable si Task 1 n'a pas encore posé la clé i18n dans le mock.

- [ ] **Step 3: Nettoyer `TabBar.tsx`**

- Vérifier que l'entrée Réserve de `TAB_ORDER` n'a **pas** de `verrou` (posée en Task 1).
- Dans `mainMiniTuto`, remplacer la branche atelier — l'onglet n'existe plus en bas, la guidance en deux temps arrive en Task 11 :

```tsx
  const mainMiniTuto = (tabPath: string): boolean => {
    // La visite de l'Atelier guide d'abord vers la Réserve : l'onglet Atelier
    // vit désormais DANS la page (bande haute), plus dans cette barre.
    if (state?.miniTutoAtelier === "visite") {
      return tabPath === "/stockage" && pathname !== "/stockage" && pathname !== "/atelier";
    }
    const mt = state?.miniTutoVinyle;
    if (mt === "ajouter") return tabPath === "/stockage" && pathname !== "/stockage";
    if (mt === "ecouter") return tabPath === "/bureau" && pathname !== "/bureau";
    return false;
  };
```

- Supprimer les imports devenus inutiles : `Anvil`, `aCompetenceReparation`, `estPret` **seulement si** l'entrée Réserve les utilise encore pour son badge (elle utilise `estPret` — le garder).

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: PASS.

- [ ] **Step 5: Suite complète + lint**

Run: `npx vitest run --maxWorkers=4` puis `npx eslint src`
Expected: PASS, aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/TabBar.tsx src/components/mobile/TabBar.test.tsx
git commit -m "feat(nav): l'onglet Réserve remplace Stockage et Atelier dans la barre"
```

**Fin de la partie ① — point de recette avec Guillaume sur le localhost avant d'attaquer ②.**

---

## Partie ② — L'onglet Quêtes

### Task 6: La route `/quetes` pilote le carnet

**Files:**
- Create: `src/app/(qg)/quetes/page.tsx`
- Modify: `src/app/(qg)/layout.tsx`
- Modify: `src/components/mobile/qg/carnet/CarnetOverlay.tsx`
- Modify: `src/lib/routesPartie.ts`
- Modify: `src/components/mobile/SwipePager.tsx`
- Modify: `src/components/mobile/GlobalVinylAmbiance.tsx`
- Test: `src/lib/routesPartie.test.ts`, `src/components/mobile/GlobalVinylAmbiance.test.tsx`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: la route `/quetes` ouvre `CarnetOverlay` ; `/quetes?mission=<id>` le pré-déplie sur cette mission.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/routesPartie.test.ts`, ajouter :

```ts
it("/quetes est un écran de la partie (chrome global actif)", () => {
  expect(estRoutePartie("/quetes")).toBe(true);
});
```

Dans `src/components/mobile/GlobalVinylAmbiance.test.tsx`, ajouter — le carnet
est une pièce du bureau, le panorama y pilote sa propre ambiance :

```tsx
  it("route /quetes : pièce du groupe (qg), le panorama pilote — aucun étouffement", () => {
    pathname = "/quetes";
    const vol = vi
      .spyOn(audioManager, "setVinylAmbianceVolume")
      .mockImplementation(() => {});
    render(<GlobalVinylAmbiance />);
    expect(vol).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run src/lib/routesPartie.test.ts src/components/mobile/GlobalVinylAmbiance.test.tsx --maxWorkers=4`
Expected: FAIL — `estRoutePartie("/quetes")` renvoie `false`.

- [ ] **Step 3: Déclarer la route partout où le groupe (qg) est listé**

`src/lib/routesPartie.ts` — ajouter `"/quetes",` après `"/bureau",`.

`src/components/mobile/SwipePager.tsx` — ajouter `"/quetes",` à `QG_GROUP` (sans quoi le sous-arbre re-monterait et le panorama sauterait pendant la transition).

`src/components/mobile/GlobalVinylAmbiance.tsx` — ajouter `"/quetes",` à `PANORAMA_PATHS`.

- [ ] **Step 4: Créer la page marqueur**

Créer `src/app/(qg)/quetes/page.tsx` :

```tsx
// Page marqueur : le carnet de quêtes est rendu par le layout (qg), qui
// l'ouvre quand la route vaut /quetes. Même montage que /bureau.
export default function QuetesPage() {
  return null;
}
```

- [ ] **Step 5: Piloter le carnet par la route dans le layout**

Dans `src/app/(qg)/layout.tsx` :

- importer `usePathname` et `useSearchParams` depuis `next/navigation` (le fichier importe déjà `useRouter`) ;
- remplacer l'état local par une lecture de route :

```tsx
  const pathname = usePathname();
  /**
   * Carnet de quêtes : ouvert par la ROUTE depuis 2026-08-23 (onglet Quêtes
   * de la barre du bas). Le livre du panorama a disparu ; l'onglet est le
   * seul chemin.
   */
  const carnetOuvert = pathname === "/quetes";
```

- supprimer `const [carnetOuvert, setCarnetOuvert] = useState(false);` ;
- remplacer le `onClose` du `CarnetOverlay` :

```tsx
      <CarnetOverlay
        open={carnetOuvert}
        onClose={() => {
          setMissionCibleId(null);
          router.push("/bureau");
        }}
        …
```

- le `setCarnetOuvert(true)` du `QgCarnet` disparaît en Task 7.

- [ ] **Step 6: Laisser la barre du bas atteignable sous le carnet**

Dans `src/components/mobile/qg/carnet/CarnetOverlay.tsx`, le voile de fond (`position: fixed; inset: 0; zIndex: 50`) recouvre la barre du bas — tenable quand on sortait par la croix, intenable pour un onglet. Modifier le style du voile :

```tsx
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  // S'arrête au sommet de la barre du bas : le carnet est un onglet, on doit
  // pouvoir en sortir par la barre (même cadrage que FloatingRoomOverlay).
  bottom: "calc(var(--mobile-tabbar-h) + var(--safe-bottom))",
  zIndex: 35,
```

et abaisser le `zIndex` de la feuille du carnet (ligne ~87) de `51` à `36`.

- [ ] **Step 7: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS.

- [ ] **Step 8: Recette sur le localhost**

Naviguer à la main vers `http://localhost:3000/quetes`. Attendu : le carnet s'ouvre par-dessus le panorama, **la barre du bas reste visible et cliquable**, la croix ramène au bureau.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(quetes): le carnet s'ouvre par la route /quetes"
```

---

### Task 7: Le livre quitte le panorama

**Files:**
- Modify: `src/app/(qg)/layout.tsx`
- Delete: `src/components/mobile/qg/QgCarnet.tsx`
- Modify: `src/lib/tutoriel.ts` (suppression de `doigtSwipeVersCarnet`)
- Test: `src/lib/tutoriel.test.ts`

**Interfaces:**
- Consumes: la route `/quetes` (Task 6).
- Produces: `doigtSwipeVersCarnet` n'existe plus. `LivrablesBadges` navigue au lieu d'ouvrir un calque.

- [ ] **Step 1: Écrire le test qui échoue**

Dans `src/lib/tutoriel.test.ts`, supprimer le bloc de tests de `doigtSwipeVersCarnet` et ajouter à sa place, dans le `describe` du mini-tuto carnet :

```ts
it("doigtSwipeVersCarnet n'existe plus : le livre a quitté le panorama", async () => {
  const mod = await import("./tutoriel");
  expect("doigtSwipeVersCarnet" in mod).toBe(false);
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/tutoriel.test.ts --maxWorkers=4`
Expected: FAIL — la fonction est encore exportée.

- [ ] **Step 3: Retirer le livre et son doigt de swipe**

Dans `src/app/(qg)/layout.tsx` :
- supprimer l'import `QgCarnet` et tout le bloc `<QgCarnet … />` de la zone 0 ;
- supprimer l'import `doigtSwipeVersCarnet` et le bloc `{state && !dialogueQg && doigtSwipeVersCarnet(…) && (<div className="tuto-main-swipe tuto-main-swipe-gauche" aria-hidden />)}` ;
- rerouter les pastilles de livrables (le calcul `livrables` du layout, ligne
  ~281, ne bouge pas — seul le `onTap` change) :

```tsx
              <LivrablesBadges
                …
                onTap={(courrierId) => {
                  playClick();
                  setMissionCibleId(courrierId);
                  router.push(`/quetes?mission=${encodeURIComponent(courrierId)}`);
                }}
              />
```

Dans `src/lib/tutoriel.ts`, supprimer la fonction `doigtSwipeVersCarnet` et son commentaire de tête.

```bash
git rm src/components/mobile/qg/QgCarnet.tsx
```

Si `QgCarnet.test.tsx` existe, le supprimer aussi.

- [ ] **Step 4: Lire la mission cible depuis l'URL**

Le layout pose déjà `missionCibleId` avant de naviguer, mais un rechargement direct de `/quetes?mission=x` le perdrait. Dans le layout, dériver la valeur de l'URL en repli :

```tsx
  const searchParams = useSearchParams();
  const missionUrl = searchParams.get("mission");
  const missionInitiale = missionCibleId ?? missionUrl;
```

et passer `missionInitialeId={missionInitiale}` au `CarnetOverlay`.

`useSearchParams` impose une frontière `Suspense`. Le layout monte déjà `Suspense` (import présent) : envelopper le sous-arbre qui l'utilise, ou déplacer la lecture dans un petit composant client enveloppé de `<Suspense fallback={null}>`, comme le fait `StockageContenu` pour son `?cat=`.

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4` puis `npx eslint src`
Expected: PASS, aucune erreur. Guetter un import `QgCarnet` résiduel.

- [ ] **Step 6: Recette sur le localhost**

Zone gauche du bureau : plus de livre sur la table, et plus de doigt de swipe vers la gauche. Une pastille de livrable tapée ouvre `/quetes` avec la bonne quête dépliée.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(quetes): le livre quitte le bureau, l'onglet devient le seul chemin"
```

---

### Task 8: L'onglet Quêtes et le nouvel ordre de la barre

**Files:**
- Modify: `src/components/mobile/TabBar.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Test: `src/components/mobile/TabBar.test.tsx`

**Interfaces:**
- Consumes: `TabDef.routes` et `TabDef.abrege` (Task 1), la route `/quetes` (Task 6).
- Produces: `TAB_ORDER` à cinq entrées, dans l'ordre Quêtes → Biblio → Bureau → Réserve → Collection.

- [ ] **Step 1: Écrire les tests qui échouent**

```tsx
describe("TabBar — l'onglet Quêtes et le nouvel ordre", () => {
  it("cinq colonnes, Quêtes en premier et Collection en dernier", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(TAB_ORDER[0].cle).toBe("quetes");
    expect(TAB_ORDER[4].cle).toBe("collection");
    expect(TAB_ORDER[2].cle).toBe("bureau"); // le Bureau reste au centre
  });

  it("taper Quêtes navigue vers /quetes", () => {
    mockPathname = "/bureau";
    mockGameStateValue = { state: etat(1), isHydrated: true };
    render(<TabBar />);
    fireEvent.click(onglet("Quêtes"));
    expect(pushMock).toHaveBeenCalledWith("/quetes");
  });

  it("le swipe boucle sur les cinq onglets en sautant la Biblio verrouillée", () => {
    const s = etat(0); // niveau 0 : Bibliothèque cadenassée
    // depuis Quêtes (0), un pas à droite doit sauter la Biblio (1)
    expect(ongletSuivantOuvert(0, 1, s)?.cle).toBe("bureau");
    // et un pas à gauche depuis Quêtes boucle sur Collection (4)
    expect(ongletSuivantOuvert(0, -1, s)?.cle).toBe("collection");
  });
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: FAIL — `TAB_ORDER[0].cle` vaut `"collection"`.

- [ ] **Step 3: Ajouter les libellés dans les quatre langues**

`src/lib/i18n/ui/fr.ts`, bloc `chrome.onglets` :

```ts
      quetes: "Quêtes",
      quetesAbrege: "Quêtes",
```

`en.ts` : `quetes: "Quests", quetesAbrege: "Quests",`
`es.ts` : `quetes: "Misiones", quetesAbrege: "Misiones",`
`el.ts` : `quetes: "Αποστολές", quetesAbrege: "Αποστ.",`

Le grec est le seul cas où l'abrégé diffère : « Αποστολές » ne tient pas dans un cinquième d'écran.

- [ ] **Step 4: Réordonner `TAB_ORDER` et ajouter l'onglet**

Remplacer le tableau complet dans `src/components/mobile/TabBar.tsx`. Importer `ScrollText` depuis `lucide-react` et `missionLivrable` depuis `@/lib/quetes/objectifs` (vérifier le nom exporté ; à défaut, réutiliser le sélecteur employé par `LivrablesBadges` pour compter les missions livrables).

```tsx
/**
 * Ordre cyclique : Quêtes → Bibliothèque → Bureau → Réserve → Collection → (boucle)
 *
 * Le Bureau reste au centre. Seul lui est un panorama (3 zones swipables) ;
 * les autres onglets ouvrent directement leur écran.
 */
export const TAB_ORDER: TabDef[] = [
  {
    icon: ScrollText,
    cle: "quetes",
    path: "/quetes",
    routes: ["/quetes"],
    abrege: (d) => d.chrome.onglets.quetesAbrege,
    // Les pastilles de livrables ne vivent que dans le bureau : le badge
    // porte la même information partout ailleurs dans le jeu. Même source
    // que les pastilles — aucune règle dupliquée.
    badge: (state) => missionsLivrables(state).length,
  },
  {
    icon: BookOpen,
    cle: "bibliotheque",
    path: "/bibliotheque",
    routes: ["/bibliotheque"],
    abrege: (d) => d.chrome.onglets.bibliothequeAbrege,
    badge: (state) => state.brocanteur.pointsDisponibles,
    verrou: {
      ouvert: (s) => s.brocanteur.niveau >= 1,
      raison: (d) => d.chrome.verrouBibliotheque,
    },
  },
  { icon: Home, cle: "bureau", path: "/bureau", routes: ["/bureau"] },
  {
    icon: Warehouse,
    cle: "reserve",
    path: "/stockage",
    routes: ["/stockage", "/atelier"],
    badge: (state, now) =>
      state.inventaireJoueur.filter(
        (o) => o.enRestauration && estPret(o.enRestauration, now),
      ).length,
  },
  { icon: Album, cle: "collection", path: "/collection", routes: ["/collection"] },
];
```

`missionsLivrables(state): { courrierId: string; expediteurId: string }[]` existe
déjà dans `src/lib/quetes/objectifs.ts` — c'est la source des pastilles du bureau
et du compteur « n livrable(s) » du registre. Rien à écrire : `import { missionsLivrables } from "@/lib/quetes/objectifs";`.

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: PASS. Les tests d'onboarding remis à 4 boutons en Task 1 repassent à 5 : les rétablir et retirer le commentaire temporaire.

- [ ] **Step 6: Suite complète + lint**

Run: `npx vitest run --maxWorkers=4` puis `npx eslint src`
Expected: PASS, aucune erreur.

- [ ] **Step 7: Recette sur le localhost — les quatre langues**

Sur `http://localhost:3000/bureau`, changer de langue dans les Réglages et vérifier qu'aucun des cinq libellés n'est tronqué à l'ellipse, **le grec en priorité**.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(nav): onglet Quêtes en tête, Collection en fin de barre"
```

**Fin de la partie ② — point de recette avec Guillaume avant la passe tutoriel.**

---

## Partie ③ — Le tutoriel

Le tutoriel ne nomme pas des routes : il désigne des positions à l'écran. Trois de ces positions viennent de bouger.

### Task 9: La consigne nomme la Réserve

**Files:**
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`
- Test: `src/lib/i18n/ui/ui.test.ts` (le test de cohérence des dictionnaires du dépôt)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/i18n/ui/ui.test.ts`, en reprenant la façon dont ce
fichier importe déjà les quatre dictionnaires :

```ts
it("la consigne d'ouverture nomme l'onglet réellement affiché, dans les 4 langues", () => {
  for (const d of [fr, en, es, el]) {
    const consigne = d.tutoriel.instructions["stockage-ouvrir"];
    expect(consigne).toContain(d.chrome.onglets.reserve);
    // Le piège : « Ouvre le Stockage » resterait vrai pour le code et faux
    // pour le joueur, qui ne voit plus ce mot nulle part dans la barre.
    expect(consigne).not.toContain(d.chrome.onglets.stockage);
  }
});
```

Si `ui.test.ts` n'importe qu'un dictionnaire, ajouter les trois autres imports
sur le même modèle que `fr`.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts --maxWorkers=4`
Expected: FAIL — la consigne dit encore « Stockage ».

- [ ] **Step 3: Réécrire la consigne dans les quatre langues**

`fr.ts` : `"stockage-ouvrir": "Ouvre la *Réserve*, en bas.",`
`en.ts` : `"stockage-ouvrir": "Open the *Storeroom*, at the bottom.",`
`es.ts` : `"stockage-ouvrir": "Abre el *Almacén*, abajo.",`
`el.ts` : `"stockage-ouvrir": "Άνοιξε την *Αποθήκη*, κάτω.",`

Conserver les astérisques : ils portent la mise en valeur dans la bannière.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/ui/
git commit -m "fix(tuto): la consigne nomme la Réserve, comme la barre"
```

---

### Task 10: Le coach dit un mot du cadenas de l'Atelier

Décision de Guillaume : le cadenas reste visible pendant le tutoriel, et la visite guidée du stockage gagne une bulle. Le joueur sait dès la première heure qu'il y a une seconde pièce à gagner.

**Files:**
- Modify: `src/components/mobile/reserve/StockageContenu.tsx`
- Modify: `src/lib/i18n/ui/{fr,en,es,el}.ts`

**Interfaces:**
- Consumes: l'ancre `data-tuto-coach="reserve-onglet-atelier"` posée par `ReserveTabs` (Task 2).

- [ ] **Step 1: Ajouter la bulle dans les quatre langues**

Dans `chrome`… non : dans le bloc `tutoriel` de `fr.ts`, à la suite des autres `coachStockage*` :

```ts
    coachStockageAtelier:
      "Et là, l'atelier — il ouvrira quand tu sauras réparer.",
```

`en.ts` : `coachStockageAtelier: "And there, the workshop — it opens once you can repair.",`
`es.ts` : `coachStockageAtelier: "Y ahí, el taller — se abrirá cuando sepas reparar.",`
`el.ts` : `coachStockageAtelier: "Κι εκεί, το εργαστήριο — ανοίγει μόλις μάθεις να επισκευάζεις.",`

- [ ] **Step 2: Insérer l'étape dans la visite guidée**

Dans `StockageContenu.tsx`, trouver le `<TutorielCoach etapes={[…]} />` de l'étape `stockage-focus` et ajouter la bulle **en dernier** (la leçon nomme d'abord ce qui sert tout de suite, puis ce qui viendra) :

```tsx
            { cible: "reserve-onglet-atelier", texte: d.tutoriel.coachStockageAtelier },
```

- [ ] **Step 3: Vérifier sur le localhost avec une partie neuve**

Démarrer une nouvelle partie et suivre le tutoriel jusqu'à `stockage-focus`. Attendu : la dernière bulle découpe un trou **autour de l'onglet ATELIER cadenassé**, pas ailleurs.

Si le trou est décalé ou absent : `TutorielCoach` fait un `fail-open` quand la cible mesure 0×0 ou reste introuvable. Vérifier que l'attribut `data-tuto-coach` est bien sur le `<button>` et non sur un wrapper en `display:contents` — un tel wrapper rend un rect 0×0 et perd la cible.

- [ ] **Step 4: Lancer la suite + lint**

Run: `npx vitest run --maxWorkers=4` puis `npx eslint src`
Expected: PASS, aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tuto): le coach nomme l'atelier cadenassé pendant la visite du stockage"
```

---

### Task 11: La visite de l'Atelier, en deux temps

Aujourd'hui l'achat de la première compétence *Réparer* arme `miniTutoAtelier: "visite"` et pose une main sur l'onglet Atelier de la barre du bas. Cet onglet n'existe plus. La guidance devient : main sur RÉSERVE (barre du bas) → une fois la page ouverte, main sur l'onglet ATELIER (bande haute), dont le cadenas vient de tomber.

**Files:**
- Modify: `src/components/mobile/reserve/ReserveTabs.tsx`
- Modify: `src/components/mobile/reserve/ReserveShell.tsx`
- Modify: `src/components/mobile/reserve/StockageContenu.tsx`
- Test: `src/components/mobile/reserve/ReserveTabs.test.tsx`

**Interfaces:**
- Consumes: `ReserveTabs` (Task 2), `mainMiniTuto` déjà recâblé sur `/stockage` (Task 5).
- Produces: `ReserveTabs` accepte `mainSurAtelier?: boolean` ; `ReserveShell` la relaie.

- [ ] **Step 1: Écrire le test qui échoue**

Dans `ReserveTabs.test.tsx` :

```tsx
describe("ReserveTabs — main de guidage du mini-tuto Atelier", () => {
  it("pose la main sur l'onglet Atelier quand on la demande", () => {
    poser({ mainSurAtelier: true });
    expect(bouton("Atelier").className).toContain("tuto-main");
  });

  it("aucune main par défaut", () => {
    poser();
    expect(document.querySelector(".tuto-main")).toBeNull();
  });

  it("aucune main sur l'onglet Atelier déjà actif", () => {
    poser({ actif: "atelier", mainSurAtelier: true });
    expect(document.querySelector(".tuto-main")).toBeNull();
  });
});
```

Étendre le type de `poser` pour accepter `mainSurAtelier`.

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/reserve/ReserveTabs.test.tsx --maxWorkers=4`
Expected: FAIL — la classe `tuto-main` n'est jamais posée.

- [ ] **Step 3: Poser la main**

Dans `ReserveTabs.tsx`, ajouter à l'interface :

```tsx
  /**
   * Mini-tuto Atelier : main pointeuse au-dessus de l'onglet. La guidance se
   * fait en deux temps depuis la fusion — la barre du bas amène à la Réserve,
   * cette main amène à l'onglet. Jamais sur l'onglet déjà actif.
   */
  mainSurAtelier?: boolean;
```

et sur le bouton Atelier :

```tsx
        className={
          mainSurAtelier && actif !== "atelier" ? "tuto-main tuto-main-haut" : undefined
        }
```

Attention : `tuto-main` dessine son doigt en `::after`, hors de la boîte. Le conteneur `bande` ne doit pas porter `overflow: hidden`, sinon la main est tranchée. Vérifier aussi qu'aucun ancêtre proche n'en pose — `FloatingRoomOverlay` en pose un sur son `wrap`. Si la main est coupée, la solution retenue ailleurs dans le dépôt est de pointer vers le bas (`tuto-main-bas`) plutôt que de retirer l'`overflow` du châssis, qui sert au clipping des animations d'entrée.

- [ ] **Step 4: Relayer depuis `ReserveShell` et `StockageContenu`**

`ReserveShell.tsx` : ajouter `mainSurAtelier?: boolean` aux props et le passer à `ReserveTabs`.

`StockageContenu.tsx` : passer `mainSurAtelier={state.miniTutoAtelier === "visite"}` à `ReserveShell`.

`AtelierContenu.tsx` : rien à faire — le `TutorielCoach` en trois bulles qui s'y trouve déjà se déclenche à l'arrivée et clôt le mini-tuto par `terminerMiniTutoAtelier`.

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4`
Expected: PASS.

- [ ] **Step 6: Recette sur le localhost**

Avec une sauvegarde sans compétence Réparer : acheter la première compétence Réparer dans la Bibliothèque. Attendu, dans l'ordre — une main sur l'onglet RÉSERVE de la barre du bas ; une fois la Réserve ouverte, une main sur l'onglet ATELIER, dont le cadenas est tombé ; une fois l'Atelier ouvert, les trois bulles de la visite ; à la fin, plus aucune main.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(tuto): la visite de l'Atelier guide en deux temps depuis la fusion"
```

---

### Task 12: La fin du tutoriel se clôt sur `/quetes`

**Files:**
- Modify: `src/lib/tutoriel.ts`
- Modify: `src/app/(qg)/layout.tsx`
- Modify: `src/components/mobile/TabBar.tsx`
- Test: `src/lib/tutoriel.test.ts`, `src/components/mobile/TabBar.test.tsx`

**Interfaces:**
- Consumes: la route `/quetes` (Task 6).
- Produces: `chapitreDuCarnetDu(miniTuto, surRouteQuetes: boolean): boolean` — même signature, sémantique du second paramètre précisée.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/lib/tutoriel.test.ts` :

```ts
describe("fin du tutoriel — le chapitre est dû à l'arrivée sur /quetes", () => {
  it("mini-tuto armé + sur /quetes : le chapitre est dû", () => {
    expect(chapitreDuCarnetDu("ouvrir", true)).toBe(true);
  });

  it("mini-tuto armé mais ailleurs : rien n'est dû", () => {
    expect(chapitreDuCarnetDu("ouvrir", false)).toBe(false);
  });

  it("mini-tuto déjà clos : rien n'est dû même sur /quetes", () => {
    expect(chapitreDuCarnetDu("termine", true)).toBe(false);
  });
});
```

Dans `src/components/mobile/TabBar.test.tsx` :

```tsx
it("mini-tuto carnet : la main se pose sur l'onglet Quêtes", () => {
  mockPathname = "/bureau";
  mockGameStateValue = {
    state: { ...etat(1), miniTutoCarnet: "ouvrir" } as unknown as GameState,
    isHydrated: true,
  };
  render(<TabBar />);
  const main = screen
    .getAllByRole("button")
    .find((b) => b.className.includes("tuto-main"));
  expect(main?.textContent).toContain("Quêtes");
});
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npx vitest run src/lib/tutoriel.test.ts src/components/mobile/TabBar.test.tsx --maxWorkers=4`
Expected: FAIL sur le test de la main (aucun bouton ne porte `tuto-main`).

- [ ] **Step 3: Préciser la sémantique dans `src/lib/tutoriel.ts`**

```ts
/**
 * Vrai quand l'arrivée dans le carnet doit délivrer le chapitre du grand-père.
 * Fin du tutoriel : la main guide jusqu'à l'onglet Quêtes, et c'est l'arrivée
 * sur `/quetes` — pas la pastille du bureau — qui déclenche le dialogue de la
 * lampe, dont la commande vient s'inscrire dans la page restée ouverte.
 * Le 2e paramètre est un booléen (`src/lib` ne dépend ni de l'UI ni du
 * routeur) : au layout de dire s'il est sur la route du carnet.
 */
export function chapitreDuCarnetDu(
  miniTuto: GameState["miniTutoCarnet"],
  surRouteQuetes: boolean,
): boolean {
  return miniTuto === "ouvrir" && surRouteQuetes;
}
```

Le layout appelle déjà `chapitreDuCarnetDu(state?.miniTutoCarnet, carnetOuvert)`, et `carnetOuvert` vaut désormais `pathname === "/quetes"` (Task 6) : **aucun changement d'appel n'est requis**, seule la documentation ment sans cette correction.

- [ ] **Step 4: Poser la main sur l'onglet Quêtes**

Dans `src/components/mobile/TabBar.tsx`, `mainMiniTuto` :

```tsx
  const mainMiniTuto = (tabPath: string): boolean => {
    // Fin du tutoriel : le livre a quitté le bureau, la main désigne l'onglet.
    if (state?.miniTutoCarnet === "ouvrir") {
      return tabPath === "/quetes" && pathname !== "/quetes";
    }
    if (state?.miniTutoAtelier === "visite") {
      return tabPath === "/stockage" && pathname !== "/stockage" && pathname !== "/atelier";
    }
    const mt = state?.miniTutoVinyle;
    if (mt === "ajouter") return tabPath === "/stockage" && pathname !== "/stockage";
    if (mt === "ecouter") return tabPath === "/bureau" && pathname !== "/bureau";
    return false;
  };
```

- [ ] **Step 5: Lancer les tests et vérifier qu'ils passent**

Run: `npx vitest run --maxWorkers=4` puis `npx eslint src`
Expected: PASS, aucune erreur.

- [ ] **Step 6: Recette complète du tutoriel sur le localhost**

Partie neuve, tutoriel de bout en bout. Points de contrôle :
1. `stockage-ouvrir` : la bannière dit « Réserve », la main est sur le bon onglet.
2. `stockage-focus` : les six bulles trouvent leurs cibles, la dernière désignant l'onglet ATELIER cadenassé.
3. Conclusion : la main se pose sur l'onglet **Quêtes**, tout à gauche.
4. L'ouverture de `/quetes` déclenche le dialogue de la lampe après un court battement, par-dessus le carnet resté ouvert.
5. La commande s'inscrit dans le carnet à la fin du dialogue.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(tuto): la fin du tutoriel guide vers l'onglet Quêtes"
```

---

## Recette finale

Avant d'ouvrir la PR :

- [ ] `npx vitest run --maxWorkers=4` — suite complète verte.
- [ ] `npx eslint src` — aucune erreur.
- [ ] `npm run lint:hooks` — le filet de règles React du dépôt.
- [ ] Les quatre langues : aucun libellé d'onglet tronqué, grec compris.
- [ ] Le swipe entre pièces fait le tour complet des cinq onglets, dans les deux sens, en sautant les pièces fermées.
- [ ] Depuis `/atelier`, un swipe sort bien de la Réserve (et ne bascule pas d'onglet).
- [ ] Un objet envoyé en collection depuis la Réserve vole toujours vers l'onglet Collection.
- [ ] Le colis du grand-père vole toujours vers l'onglet Réserve.
- [ ] Recette device via TestFlight (la recette sur vrai iPhone est impossible depuis ce Mac).
