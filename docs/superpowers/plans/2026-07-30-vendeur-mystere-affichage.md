# Vendeur mystère — affichage : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner le vendeur mystère sur le langage visuel du jeu — bandeau de nom laiton comme les autres vendeurs, et cartel de visionnage partagé avec la machine à énergie sur les deux boutons publicitaires de la boîte.

**Architecture :** On extrait d'abord le cartel laiton d'`EnergieRecharge` en un composant `CartelPub` qui possède l'apparence mais laisse la mise en page à l'appelant — même découpage que `src/components/ui/namePlate.ts`, déjà le patron du projet. Les deux points d'entrée de la boîte mystère (le tiroir du carrousel de chinage, la modale d'ouverture) le consomment ensuite. Les chaînes i18n suivent le composant qui en a besoin.

**Tech Stack :** Next.js (export statique), React 19, TypeScript, styles en objets `CSSProperties` inline, icônes `lucide-react`, tests Vitest + Testing Library en environnement jsdom.

**Spec :** `docs/superpowers/specs/2026-07-30-vendeur-mystere-affichage-design.md`

## Global Constraints

- **Tests :** toujours `npx vitest run --maxWorkers=4`. Sans le drapeau, les workers meurent de famine sur ce poste et produisent des dizaines de faux échecs sans rapport avec la modification.
- **Lint :** `npm run lint` est cassé depuis Next 16. Utiliser `npx eslint src`.
- **i18n :** quatre langues obligatoires — `fr`, `en`, `es`, `el`. Le type du dictionnaire impose les mêmes clés partout ; en oublier une casse la compilation.
- **i18n, règle d'or du projet :** jamais de chaîne localisée dans une sauvegarde. Rien ici n'y touche, mais la règle tient.
- **Accessibilité des boutons publicitaires :** le libellé visible peut être court ou iconique, mais le nom accessible doit continuer d'annoncer qu'il s'agit d'une publicité.
- **Pas de provider de langue en test :** `useLangue()` renvoie le français par défaut hors provider (`LangueContext.tsx:29`). Les tests rendent les composants nus.
- **`Date.now()` / `Math.random()` :** aucun des composants touchés n'en introduit ; ne pas en ajouter.

---

### Task 1: `CartelPub` — extraire le cartel de visionnage

**Files:**
- Create: `src/components/ui/CartelPub.tsx`
- Test: `src/components/ui/CartelPub.test.tsx`
- Modify: `src/components/mobile/EnergieRecharge.tsx` (supprimer `plaqueBtnStyle` lignes 125-158 et `rivetStyle` lignes 160-171 ; réécrire le bouton lignes 389-420)

**Interfaces:**
- Consumes: rien.
- Produces: `CartelPub`, composant React exporté nommé depuis `@/components/ui/CartelPub`, de props :
  ```ts
  {
    indisponible?: boolean;   // défaut false — pose `disabled`, grise et désature
    pulse?: boolean;          // défaut false — halo doré pulsant
    onClick?: () => void;
    ariaLabel?: string;       // omis → le nom accessible vient du contenu
    style?: CSSProperties;    // positionnement/dimensions, fusionné APRÈS le style de base
    children?: ReactNode;
  }
  ```
  Les tâches 2 et 3 le consomment.

- [ ] **Step 1: Write the failing test**

Créer `src/components/ui/CartelPub.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CartelPub } from "./CartelPub";

afterEach(cleanup);

describe("CartelPub", () => {
  it("le nom accessible vient de ariaLabel, pas du contenu visible", () => {
    render(
      <CartelPub ariaLabel="Regarder une pub pour ouvrir">
        Pour ouvrir la boîte
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Regarder une pub pour ouvrir" });
    expect(btn.textContent).toContain("Pour ouvrir la boîte");
  });

  it("sans ariaLabel, le nom accessible vient du contenu", () => {
    render(<CartelPub>Plus de pub aujourd&apos;hui</CartelPub>);
    expect(screen.getByRole("button", { name: /plus de pub aujourd'hui/i })).toBeTruthy();
  });

  it("indisponible : le bouton est désactivé et le clic n'appelle pas onClick", () => {
    const onClick = vi.fn();
    render(
      <CartelPub indisponible ariaLabel="Ouvrir" onClick={onClick}>
        Ouvrir
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Ouvrir" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disponible : le clic appelle onClick", () => {
    const onClick = vi.fn();
    render(
      <CartelPub ariaLabel="Ouvrir" onClick={onClick}>
        Ouvrir
      </CartelPub>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("le style de l'appelant se pose SUR le style de base sans l'effacer", () => {
    render(
      <CartelPub ariaLabel="Ouvrir" style={{ width: "100%", position: "absolute" }}>
        Ouvrir
      </CartelPub>,
    );
    const btn = screen.getByRole("button", { name: "Ouvrir" }) as HTMLButtonElement;
    // Ce que l'appelant impose.
    expect(btn.style.width).toBe("100%");
    expect(btn.style.position).toBe("absolute");
    // Ce que le cartel garde : la couleur brune du texte gravé (#3a2410).
    expect(btn.style.color).toBe("rgb(58, 36, 16)");
  });

  it("les rivets décoratifs sont masqués aux lecteurs d'écran", () => {
    const { container } = render(<CartelPub ariaLabel="Ouvrir">Ouvrir</CartelPub>);
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/ui/CartelPub.test.tsx --maxWorkers=4
```

Attendu : ÉCHEC — `Failed to resolve import "./CartelPub"`.

- [ ] **Step 3: Write the component**

Créer `src/components/ui/CartelPub.tsx` :

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Le cartel laiton « étiquette de musée » qui déclenche un visionnage
 * publicitaire — d'abord né sur la machine à énergie, désormais la forme
 * commune à tous les boutons pub du jeu : plaque dorée, texte gravé brun,
 * rivets latéraux.
 *
 * Le module possède l'APPARENCE, l'appelant possède la MISE EN PAGE (même
 * découpage que `namePlate.ts`) : `style` est fusionné après le style de base,
 * ce qui permet à la machine à énergie de rester en positionnement absolu sur
 * son illustration pendant que le tiroir de chinage passe une largeur pleine.
 */
export function CartelPub({
  indisponible = false,
  pulse = false,
  onClick,
  ariaLabel,
  style,
  children,
}: {
  indisponible?: boolean;
  pulse?: boolean;
  onClick?: () => void;
  /** Omis, le nom accessible vient du contenu (cas des états d'indisponibilité). */
  ariaLabel?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={indisponible}
      aria-label={ariaLabel}
      style={{ ...cartelStyle(indisponible, pulse), ...style }}
    >
      <span aria-hidden style={rivetStyle("left")} />
      {children}
      <span aria-hidden style={rivetStyle("right")} />
    </button>
  );
}

/** Plaque dorée gravée. `position: relative` ancre les rivets par défaut ;
 *  un appelant qui passe `position: absolute` les garde ancrés sur lui. */
function cartelStyle(indisponible: boolean, pulse: boolean): CSSProperties {
  return {
    position: "relative",
    borderRadius: 4,
    border: indisponible ? "1px solid #4a3a23" : "1px solid #6b4e25",
    background: indisponible
      ? "linear-gradient(180deg, #bcae93 0%, #978769 50%, #756749 100%)"
      : "linear-gradient(180deg, #f0d18b 0%, #d4ad60 45%, #b48a3e 100%)",
    boxShadow: indisponible
      ? "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.3), 0 2px 5px rgba(20,12,0,0.4)"
      : "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 14px rgba(220,170,60,0.6), 0 3px 8px rgba(20,12,0,0.45)",
    filter: indisponible ? "saturate(0.5) brightness(0.85)" : "none",
    color: "#3a2410",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "clamp(12px, 3.4vw, 14px)",
    letterSpacing: "0.05em",
    lineHeight: 1.15,
    textAlign: "center",
    textShadow: indisponible
      ? "0 1px 0 rgba(255,255,255,0.18)"
      : "0 1px 0 rgba(255,235,180,0.5)",
    cursor: indisponible ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "0 14px",
    animation: pulse ? "broc-cartel-pulse 1.1s ease-in-out infinite" : undefined,
  };
}

/** Rivets latéraux (décor). */
function rivetStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 5,
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #f6e3b2, #6b4e25 80%)",
    transform: "translateY(-50%)",
    boxShadow: "inset 0 1px 1px rgba(0,0,0,0.55)",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/ui/CartelPub.test.tsx --maxWorkers=4
```

Attendu : 6 tests PASS.

- [ ] **Step 5: Migrate `EnergieRecharge` onto `CartelPub`**

Dans `src/components/mobile/EnergieRecharge.tsx` :

1. Ajouter l'import, sous celui de `useToastSafe` :

```tsx
import { CartelPub } from "@/components/ui/CartelPub";
```

2. **Supprimer entièrement** les deux fonctions de style devenues inutiles : `plaqueBtnStyle` (le bloc `/** Cartel laiton « étiquette de musée » … */` + la fonction) et `rivetStyle` (le bloc `/** Rivets latéraux du cartel (décor). */` + la fonction).

3. Remplacer le `<button>` du cartel (celui dont le commentaire commence par `/* Le cartel laiton : LE bouton pub (accessible). …`) par :

```tsx
        {/* Le cartel laiton : LE bouton pub (accessible). Le libellé visuel est
            une icône de visionnage ; le nom accessible reste la chaîne i18n. */}
        <CartelPub
          onClick={regarderPub}
          indisponible={pubIndisponible}
          pulse={alerteActive && !pubIndisponible}
          ariaLabel={!pubIndisponible ? d.chrome.regarderPub : undefined}
          style={{
            position: "absolute",
            left: `${ZONE_PLAQUE.left}%`,
            top: `${ZONE_PLAQUE.top}%`,
            width: `${ZONE_PLAQUE.width}%`,
            height: `${ZONE_PLAQUE.height}%`,
          }}
        >
          {enCours || salve
            ? d.chrome.pubEnCours
            : energiePleine
              ? d.chrome.energieAuMaximum
              : pubsRestantes <= 0
                ? d.chrome.pubEpuisee
                : (
                  <span
                    aria-hidden
                    style={{
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MonitorPlay size={22} strokeWidth={2.2} />
                    {"+1"}
                    <Zap size={16} strokeWidth={2.5} />
                  </span>
                )}
        </CartelPub>
```

`ZONE_PLAQUE`, `ZONE_LEVIER`, `levierTapStyle` et la zone de tap sur le levier peint ne bougent pas. Le `padding: "0 14px"` vient désormais du style de base de `CartelPub` — ne pas le repasser.

- [ ] **Step 6: Run the regression net**

```bash
npx vitest run src/components/ui/CartelPub.test.tsx src/components/mobile/EnergieRecharge.test.tsx --maxWorkers=4
```

Attendu : tout PASS, **sans avoir touché** `EnergieRecharge.test.tsx`. Ce fichier cible le bouton par son nom accessible (`/regarder une pub/i`, `/plus de pub aujourd'hui/i`, `/au maximum/i`) : c'est le filet qui prouve que l'extraction n'a rien changé au comportement.

Si un de ces tests casse, c'est l'extraction qui est fautive — corriger `CartelPub` ou la migration, **jamais** le test.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/CartelPub.tsx src/components/ui/CartelPub.test.tsx src/components/mobile/EnergieRecharge.tsx
git commit -m "refactor(ui): extraire le cartel de visionnage en CartelPub

La plaque doree a rivets du bouton pub vivait dans EnergieRecharge,
soudee a son placement absolu sur l'illustration de la machine. Elle
devient un composant partage qui possede l'apparence et laisse la mise
en page a l'appelant, comme namePlate.ts."
```

---

### Task 2: Le tiroir du vendeur mystère

**Files:**
- Modify: `src/components/mobile/chine/ChineMystereDrawer.tsx`
- Modify: `src/lib/i18n/ui/fr.ts`, `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts`, `src/lib/i18n/ui/el.ts` (section `sheets`)
- Test: `src/components/mobile/chine/ChineMystereDrawer.test.tsx` (nouveau)

**Interfaces:**
- Consumes: `CartelPub` de la tâche 1 ; `namePlateStyle(radius)` de `@/components/ui/namePlate` (déjà existant, utilisé par `ChineNegoDrawer`).
- Produces: la clé i18n `sheets.pourOuvrirLaBoite` dans les quatre langues — la tâche 3 la réutilise. La signature de `ChineMystereDrawer` (`{ plein, boiteReclamee, onOuvrirBoite }`) **ne change pas**.

- [ ] **Step 1: Add the i18n key in all four languages**

Dans chaque fichier, section `sheets`, insérer la nouvelle clé juste après `regarderPubPourOuvrir` :

`src/lib/i18n/ui/fr.ts` :
```ts
    pourOuvrirLaBoite: "Pour ouvrir la boîte",
```

`src/lib/i18n/ui/en.ts` :
```ts
    pourOuvrirLaBoite: "To open the box",
```

`src/lib/i18n/ui/es.ts` :
```ts
    pourOuvrirLaBoite: "Para abrir la caja",
```

`src/lib/i18n/ui/el.ts` :
```ts
    pourOuvrirLaBoite: "Για να ανοίξεις το κουτί",
```

Ne **pas** supprimer `regarderPubPourOuvrir` : elle devient le nom accessible du cartel.

- [ ] **Step 2: Write the failing test**

Créer `src/components/mobile/chine/ChineMystereDrawer.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChineMystereDrawer } from "./ChineMystereDrawer";

afterEach(cleanup);

describe("ChineMystereDrawer", () => {
  it("ouvrable : le cartel annonce la pub et le clic remonte l'action", () => {
    const onOuvrirBoite = vi.fn();
    render(
      <ChineMystereDrawer plein={false} boiteReclamee={false} onOuvrirBoite={onOuvrirBoite} />,
    );
    const btn = screen.getByRole("button", { name: /regarder une pub/i });
    // Le libellé VISIBLE est court ; le nom accessible dit qu'il s'agit d'une pub.
    expect(btn.textContent).toContain("Pour ouvrir la boîte");
    fireEvent.click(btn);
    expect(onOuvrirBoite).toHaveBeenCalledTimes(1);
  });

  it("déjà réclamée : plus de bouton, un statut à la place", () => {
    render(
      <ChineMystereDrawer plein={false} boiteReclamee onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/boîte déjà ouverte/i)).toBeTruthy();
  });

  it("stockage plein : plus de bouton, jamais de pub gâchée", () => {
    render(
      <ChineMystereDrawer plein boiteReclamee={false} onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/stockage plein/i)).toBeTruthy();
  });

  it("déjà réclamée ET stockage plein : le statut « déjà ouverte » prime", () => {
    render(<ChineMystereDrawer plein boiteReclamee onOuvrirBoite={vi.fn()} />);
    expect(screen.getByText(/boîte déjà ouverte/i)).toBeTruthy();
    expect(screen.queryByText(/stockage plein/i)).toBeNull();
  });

  it("le bandeau porte le nom du vendeur", () => {
    render(
      <ChineMystereDrawer plein={false} boiteReclamee={false} onOuvrirBoite={vi.fn()} />,
    );
    expect(screen.getByText("Vendeur mystère")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/components/mobile/chine/ChineMystereDrawer.test.tsx --maxWorkers=4
```

Attendu : ÉCHEC sur le premier test — le nom accessible du bouton actuel est « Regarder une pub pour ouvrir », qui matche `/regarder une pub/i`, mais son `textContent` **ne contient pas** « Pour ouvrir la boîte ».

Les autres tests peuvent déjà passer : c'est normal, ils verrouillent le comportement existant qu'on ne veut pas casser.

- [ ] **Step 4: Rewrite the drawer**

Remplacer intégralement `src/components/mobile/chine/ChineMystereDrawer.tsx` par :

```tsx
"use client";

import type { CSSProperties } from "react";
import { MonitorPlay } from "lucide-react";
import { CartelPub } from "@/components/ui/CartelPub";
import { namePlateStyle } from "@/components/ui/namePlate";
import { VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Tiroir du vendeur mystère — même structure que ChineNegoDrawer (perso qui
 * flotte + bandeau nom pleine largeur), et désormais le même bandeau laiton :
 * c'est le costume vert du personnage qui le distingue, pas l'interface. Une
 * seule action, portée par le cartel de visionnage commun à tout le jeu.
 */
export function ChineMystereDrawer({
  plein,
  boiteReclamee,
  onOuvrirBoite,
}: {
  plein: boolean;
  boiteReclamee: boolean;
  onOuvrirBoite: () => void;
}) {
  const { d } = useLangue();
  return (
    <div style={drawerStyle}>
      <div style={imageZone}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VENDEUR_MYSTERE_ILLUSTRATION} alt={d.chine.vendeurMystere} style={vendeurImg} />
        <div style={rightZone}>
          {boiteReclamee ? (
            <span style={statutTexte("var(--brass-700)")}>{d.chine.boiteDejaOuverte}</span>
          ) : plein ? (
            <span style={statutTexte("var(--vermillion-600)")}>{d.qg.stockagePlein}</span>
          ) : (
            <CartelPub
              onClick={onOuvrirBoite}
              ariaLabel={d.sheets.regarderPubPourOuvrir}
              style={{ width: "100%", marginBottom: 10, padding: "10px 18px", gap: 8 }}
            >
              <MonitorPlay size={26} strokeWidth={2.2} aria-hidden />
              {d.sheets.pourOuvrirLaBoite}
            </CartelPub>
          )}
        </div>
      </div>

      <div style={namePlate}>{d.chine.vendeurMystere}</div>
    </div>
  );
}

const drawerStyle: CSSProperties = {
  flex: "none",
  background: "transparent",
  overflow: "hidden",
  overscrollBehavior: "contain",
  touchAction: "none",
};

const imageZone: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 12,
  padding: "8px 16px 0",
};

const vendeurImg: CSSProperties = {
  height: "clamp(143px, 21vh, 182px)",
  width: "auto",
  objectFit: "contain",
  flex: "0 0 auto",
};

const rightZone: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

/** Même statut que le tiroir de négo : laiton foncé pour un fait acquis,
 *  vermillon pour un blocage. */
const statutTexte = (color: string): CSSProperties => ({
  marginBottom: 10,
  color,
  fontSize: 14,
  fontFamily: "var(--font-display)",
});

/** Le bandeau des vendeurs, sans exception — même appel que ChineNegoDrawer. */
const namePlate = namePlateStyle("12px 12px 0 0");
```

Disparus avec cette réécriture : `btnLuxe`, `namePlateLuxe`, et l'ancien `statutTexte` à couleur fixe.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/components/mobile/chine/ChineMystereDrawer.test.tsx --maxWorkers=4
```

Attendu : 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/chine/ChineMystereDrawer.tsx src/components/mobile/chine/ChineMystereDrawer.test.tsx src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(mystere): tiroir aligne sur les autres vendeurs

Bandeau laiton commun a tous les vendeurs, cartel de visionnage a la
place du bouton vert, et statuts aux couleurs du tiroir de negociation.
Le libelle visible se raccourcit en 'Pour ouvrir la boite' ; le nom
accessible continue d'annoncer la publicite."
```

---

### Task 3: La modale d'ouverture

**Files:**
- Modify: `src/components/mobile/BoiteMystereOverlay.tsx`
- Modify: `src/lib/i18n/ui/fr.ts`, `src/lib/i18n/ui/en.ts`, `src/lib/i18n/ui/es.ts`, `src/lib/i18n/ui/el.ts` (clé `sheets.boiteDescription`)

**Interfaces:**
- Consumes: `CartelPub` (tâche 1), `sheets.pourOuvrirLaBoite` (tâche 2).
- Produces: rien pour les tâches suivantes.

Ce composant n'a pas de test : il dépend de `useGame`, `useToast` et du fournisseur de publicité, et sa valeur est dans une séquence animée à trois phases que les tests unitaires couvrent mal. La vérification est visuelle (étape 5).

- [ ] **Step 1: Rewrite `boiteDescription` in all four languages**

La mention « Regarde une pub pour l'ouvrir » quitte la description — elle est portée par le cartel. Le texte devient la voix du personnage, un dandy masqué qui feint de ne rien savoir.

`src/lib/i18n/ui/fr.ts` :
```ts
    boiteDescription:
      "Personne n'a jamais vu ce qu'il y a là-dedans. Moi non plus, d'ailleurs.",
```

`src/lib/i18n/ui/en.ts` :
```ts
    boiteDescription:
      "Nobody has ever seen what's inside. Me included, come to think of it.",
```

`src/lib/i18n/ui/es.ts` :
```ts
    boiteDescription:
      "Nadie ha visto jamás lo que hay dentro. Yo tampoco, la verdad.",
```

`src/lib/i18n/ui/el.ts` :
```ts
    boiteDescription:
      "Κανείς δεν έχει δει ποτέ τι κρύβει. Ούτε κι εγώ, βασικά.",
```

- [ ] **Step 2: Swap the sealed-screen button for the cartel**

Dans `src/components/mobile/BoiteMystereOverlay.tsx` :

1. L'import lucide devient — `Gift` n'est plus utilisée :

```tsx
import { MonitorPlay, X } from "lucide-react";
```

2. Ajouter, sous l'import de `ItemSticker` :

```tsx
import { CartelPub } from "@/components/ui/CartelPub";
```

3. Dans la dernière branche du rendu (l'écran scellé, celle qui suit `) : (` et affiche `BOITE_MYSTERE_IMAGE` en grand), remplacer le `<button onClick={ouvrir} …>` et son contenu par :

```tsx
            <CartelPub
              onClick={ouvrir}
              indisponible={enCours}
              ariaLabel={enCours ? undefined : d.sheets.regarderPubPourOuvrir}
              style={{ width: "100%", padding: "12px 18px", gap: 8 }}
            >
              {enCours ? (
                d.sheets.ouverture
              ) : (
                <>
                  <MonitorPlay size={26} strokeWidth={2.2} aria-hidden />
                  {d.sheets.pourOuvrirLaBoite}
                </>
              )}
            </CartelPub>
```

Comme sur la machine à énergie : pendant le chargement, l'`ariaLabel` est omis pour que le lecteur d'écran annonce « Ouverture… » plutôt qu'une invitation à cliquer sur un bouton déjà désactivé.

4. **Ne pas toucher** au bouton `{d.sheets.parfait}` de l'écran de révélation : ce n'est pas un déclencheur de publicité, il garde `boutonStyle(false)` en laiton plein. `boutonStyle` reste donc utilisée et ne doit pas être supprimée.

5. **Ne pas toucher** aux phases `vibration` / `eclosion` / `reveal`, à leurs constantes de durée, à l'aura, au flash ni à la sortie de l'objet.

- [ ] **Step 3: Verify the whole suite is green**

```bash
npx vitest run --maxWorkers=4
```

Attendu : aucun échec. Le drapeau `--maxWorkers=4` n'est pas optionnel.

- [ ] **Step 4: Verify types and lint**

```bash
npx tsc --noEmit && npx eslint src
```

Attendu : les deux silencieux. `npm run lint` est cassé depuis Next 16 — ne pas l'utiliser.

Si `tsc` signale une clé i18n manquante dans une langue, c'est une des quatre insertions des tâches 2 ou 3 qui a été oubliée.

- [ ] **Step 5: Verify in the running app**

```bash
npm run dev
```

Ouvrir **`http://localhost:3000`** — pas `127.0.0.1`, qui bloque l'application sur « Ouverture du local… ». Un seul `next dev` à la fois.

Vérifier, en entrant en brocante jusqu'à croiser le vendeur mystère (il apparaît à 20 % par entrée, en première carte du carrousel ; il ne sort jamais pendant le tutoriel guidé ni quand le stockage est plein) :

1. Le bandeau « VENDEUR MYSTÈRE » est laiton, identique à celui des autres vendeurs — swiper d'une carte pour comparer côte à côte.
2. Le cartel doré porte l'icône de visionnage et « Pour ouvrir la boîte ».
3. Le cartel du tiroir et celui de la machine à énergie se ressemblent — ouvrir la modale d'énergie pour comparer.
4. Dans la modale d'ouverture : même cartel, et le texte « Personne n'a jamais vu ce qu'il y a là-dedans… ».

Si un style semble périmé, c'est le piège connu du `next dev` qui sert un `globals.css` en cache : redémarrer le serveur.

- [ ] **Step 6: Commit**

```bash
git add src/components/mobile/BoiteMystereOverlay.tsx src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "feat(mystere): cartel de visionnage et voix du personnage dans la modale

Le bouton d'ouverture prend la forme du cartel commun ; le bouton
'Parfait !' de la revelation reste en laiton plein, ce n'est pas une
pub. La description passe de la description mecanique a une replique du
vendeur masque, dans les quatre langues."
```

---

## Ce qui reste hors périmètre

Relevé pendant la conception, **volontairement non traité** — ne pas l'implémenter au passage :

- Le taux de légendaire de la boîte (0,4 % effectifs) est inférieur à celui d'un étal 4⭐ (0,8 %), ce qui contredit le commentaire « boostés vs chinage normal » de `src/lib/boiteMystere.ts`.
- `src/app/chiner/[brocanteId]/ClientPage.tsx:203` annonce un tirage « 1/10 » là où `CHANCE_APPARITION_BASE` vaut `0.2`.
- La pastille ⓘ ouvrant une table de probabilités état × rareté a été envisagée puis abandonnée.
