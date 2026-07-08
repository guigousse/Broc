# i18n SP1 — Infra + menu principal trilingue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser l'infrastructure i18n (FR/EN/ES) et rendre tout le menu principal trilingue : écran-titre, overlays Parties/Réglages/Crédits, avec détection auto + réglage in-app persisté.

**Architecture:** Un module `src/lib/i18n/` maison : type `Locale`, détection navigator + persistance localStorage, `LangueProvider` React au layout racine, dictionnaires TypeScript typés (le français est la source, EN/ES contraints par un type dérivé → clé manquante = erreur tsc). Les composants consomment `useLangue()` qui expose le dictionnaire courant `d` + un helper d'interpolation `tr`.

**Tech Stack:** Next.js app router (client components, `output: "export"`), vitest + @testing-library/react, aucune dépendance i18n externe.

**Spec:** `docs/superpowers/specs/2026-07-08-internationalisation-design.md`

## Global Constraints

- Locales : `"fr" | "en" | "es"` ; clé storage `projet-broc:langue:v1` ; fallback détection = `"en"`.
- Aucune dépendance npm nouvelle.
- Le contexte a une **valeur par défaut française** : un composant rendu sans provider (tests unitaires existants) affiche le français — aucun test existant ne doit être wrappé.
- Bascule de langue à chaud (state React, pas de reload) ; `document.documentElement.lang` suit la locale.
- Prix en € et ambiance France 1924 dans les trois langues.
- Styles inline, conventions du repo ; commits en français `feat(i18n): …`.
- Vérification lint : `npx eslint src` (`npm run lint` est cassé repo-wide, Next 16).

---

### Task 1: Noyau locales — détection + persistance

**Files:**
- Create: `src/lib/i18n/locales.ts`
- Test: `src/lib/i18n/locales.test.ts`

**Interfaces:**
- Consumes: `safeLocalStorageGet`/`safeLocalStorageSet` de `@/lib/storage/safeLocalStorage` (existants).
- Produces: `type Locale = "fr" | "en" | "es"` ; `LOCALES: readonly Locale[]` ; `LOCALE_LABELS: Record<Locale, string>` (autonymes : Français/English/Español) ; `detecterLocale(): Locale` ; `persisterLocale(l: Locale): void`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/i18n/locales.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCALES,
  detecterLocale,
  persisterLocale,
} from "@/lib/i18n/locales";

const CLE = "projet-broc:langue:v1";

describe("locales — détection et persistance", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("expose exactement fr/en/es", () => {
    expect([...LOCALES]).toEqual(["fr", "en", "es"]);
  });

  it("préférence persistée prioritaire sur la langue du navigateur", () => {
    localStorage.setItem(CLE, JSON.stringify({ locale: "es" }));
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("es");
  });

  it("sans préférence : langue du navigateur si fr/es, sinon anglais", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("fr");
    vi.stubGlobal("navigator", { language: "es-419" });
    expect(detecterLocale()).toBe("es");
    vi.stubGlobal("navigator", { language: "de-DE" });
    expect(detecterLocale()).toBe("en");
    vi.stubGlobal("navigator", { language: "en-GB" });
    expect(detecterLocale()).toBe("en");
  });

  it("une préférence corrompue retombe sur la détection navigateur", () => {
    localStorage.setItem(CLE, JSON.stringify({ locale: "klingon" }));
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("fr");
  });

  it("persisterLocale écrit la préférence relue par detecterLocale", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    persisterLocale("en");
    expect(detecterLocale()).toBe("en");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/i18n/locales.test.ts`
Expected: FAIL — module `@/lib/i18n/locales` introuvable.

- [ ] **Step 3: Implémenter**

Créer `src/lib/i18n/locales.ts` :

```ts
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/** Langues jouables. Le français est la langue canonique du contenu. */
export type Locale = "fr" | "en" | "es";

export const LOCALES: readonly Locale[] = ["fr", "en", "es"];

/** Autonymes affichés dans le sélecteur (identiques dans toutes les langues). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

const CLE = "projet-broc:langue:v1";

interface LanguePref {
  locale: Locale;
}

function estLocale(v: unknown): v is Locale {
  return v === "fr" || v === "en" || v === "es";
}

/**
 * Préférence persistée si valide, sinon langue du téléphone (fr/es),
 * sinon anglais — la langue de repli internationale.
 */
export function detecterLocale(): Locale {
  const pref = safeLocalStorageGet<Partial<LanguePref>>(CLE, {});
  if (estLocale(pref.locale)) return pref.locale;
  const nav =
    typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export function persisterLocale(locale: Locale): void {
  safeLocalStorageSet(CLE, { locale } satisfies LanguePref);
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/lib/i18n/locales.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/locales.ts src/lib/i18n/locales.test.ts
git commit -m "feat(i18n): noyau locales — détection navigateur + persistance localStorage"
```

---

### Task 2: Dictionnaires UI du menu (fr/en/es) + interpolation

**Files:**
- Create: `src/lib/i18n/ui/fr.ts`
- Create: `src/lib/i18n/ui/en.ts`
- Create: `src/lib/i18n/ui/es.ts`
- Create: `src/lib/i18n/ui/index.ts`
- Test: `src/lib/i18n/ui/ui.test.ts`

**Interfaces:**
- Consumes: `Locale` de la Task 1.
- Produces: `DictionnaireUI` (type dérivé du français) ; `DICTIONNAIRES: Record<Locale, DictionnaireUI>` ; `tr(gabarit: string, params?: Record<string, string | number>): string`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/i18n/ui/ui.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { DICTIONNAIRES, tr } from "@/lib/i18n/ui";

describe("dictionnaires UI", () => {
  it("les trois locales existent et divergent réellement", () => {
    expect(DICTIONNAIRES.fr.menu.nouvellePartie).toBe("Nouvelle partie");
    expect(DICTIONNAIRES.en.menu.nouvellePartie).toBe("New game");
    expect(DICTIONNAIRES.es.menu.nouvellePartie).toBe("Nueva partida");
  });

  it("tr interpole les paramètres {x}", () => {
    expect(tr("Jour {jour} · Niveau {niveau}", { jour: 2, niveau: 5 })).toBe(
      "Jour 2 · Niveau 5",
    );
  });

  it("tr laisse le gabarit intact pour un paramètre manquant", () => {
    expect(tr("il y a {n} min")).toBe("il y a {n} min");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Créer le dictionnaire français (source)**

Créer `src/lib/i18n/ui/fr.ts` :

```ts
/**
 * Dictionnaire UI français — LA SOURCE. Sa forme définit `DictionnaireUI` ;
 * en.ts et es.ts sont contraints par ce type : une clé oubliée là-bas est
 * une erreur de compilation.
 */
export const fr = {
  commun: {
    fermer: "Fermer",
    annuler: "Annuler",
    confirmer: "Confirmer",
  },
  menu: {
    continuer: "Continuer",
    nouvellePartie: "Nouvelle partie",
    charger: "Charger",
    reglages: "Réglages",
    credits: "Crédits",
  },
  parties: {
    titre: "— Parties —",
    emplacementVide: "Emplacement vide",
    creerDansEmplacement: "Nouvelle partie dans l'emplacement {n}",
    choisirEmplacement: "Choisir l'emplacement {n}",
    renommer: "Renommer",
    renommerEmplacement: "Renommer l'emplacement {n}",
    supprimer: "Supprimer",
    ecraser: "Écraser",
    lancer: "Lancer la partie",
    active: "Active",
    partieN: "Partie {n}",
    jourNiveau: "Jour {jour} · Niveau {niveau}",
    valeurCollection: "Valeur de la collection : {valeur} €",
    aLInstant: "à l'instant",
    ilYAMin: "il y a {n} min",
    ilYAHeures: "il y a {n} h",
    ilYAJours: "il y a {n} j",
    confirmSupprimerTitre: "Supprimer « {nom} » ?",
    confirmSupprimerCorps: "Cette partie sera définitivement perdue.",
    confirmEcraserTitre: "Écraser « {nom} » ?",
    confirmEcraserCorps:
      "Cette partie sera définitivement perdue au profit d'une nouvelle.",
  },
  reglages: {
    titre: "— Réglages —",
    son: "Son",
    volumeGeneral: "Volume général — {n}",
    musique: "Musique",
    effets: "Effets sonores",
    ambiance: "Sons d'ambiance",
    affichage: "Affichage",
    taillePolice: "Taille de police",
    petit: "Petit",
    normal: "Normal",
    grand: "Grand",
    langue: "Langue",
    notifications: "Notifications",
    rappels: "Rappels (énergie, atelier, quêtes)",
    notifsIndispo: "Disponibles sur l'application iOS",
    permissionRequise: "Permission système requise",
    autoriser: "Autoriser",
    permissionAccordee: "Permission accordée ✓",
  },
  credits: {
    titre: "— Crédits —",
    baseline: "Broc — une simulation de brocante",
    concu: "Conçu par G. Fenard · 2026",
    version: "ver. 1.0 · saison de printemps · 1924",
    confidentialite: "Confidentialité",
    mentionsLegales: "Mentions légales",
  },
} as const;
```

- [ ] **Step 4: Créer l'anglais et l'espagnol**

Créer `src/lib/i18n/ui/en.ts` :

```ts
import type { DictionnaireUI } from "./index";

export const en: DictionnaireUI = {
  commun: {
    fermer: "Close",
    annuler: "Cancel",
    confirmer: "Confirm",
  },
  menu: {
    continuer: "Continue",
    nouvellePartie: "New game",
    charger: "Load",
    reglages: "Settings",
    credits: "Credits",
  },
  parties: {
    titre: "— Games —",
    emplacementVide: "Empty slot",
    creerDansEmplacement: "New game in slot {n}",
    choisirEmplacement: "Select slot {n}",
    renommer: "Rename",
    renommerEmplacement: "Rename slot {n}",
    supprimer: "Delete",
    ecraser: "Overwrite",
    lancer: "Start game",
    active: "Active",
    partieN: "Game {n}",
    jourNiveau: "Day {jour} · Level {niveau}",
    valeurCollection: "Collection value: {valeur} €",
    aLInstant: "just now",
    ilYAMin: "{n} min ago",
    ilYAHeures: "{n} h ago",
    ilYAJours: "{n} d ago",
    confirmSupprimerTitre: "Delete “{nom}”?",
    confirmSupprimerCorps: "This game will be permanently lost.",
    confirmEcraserTitre: "Overwrite “{nom}”?",
    confirmEcraserCorps:
      "This game will be permanently lost and replaced by a new one.",
  },
  reglages: {
    titre: "— Settings —",
    son: "Sound",
    volumeGeneral: "Master volume — {n}",
    musique: "Music",
    effets: "Sound effects",
    ambiance: "Ambient sounds",
    affichage: "Display",
    taillePolice: "Font size",
    petit: "Small",
    normal: "Normal",
    grand: "Large",
    langue: "Language",
    notifications: "Notifications",
    rappels: "Reminders (energy, workshop, quests)",
    notifsIndispo: "Available on the iOS app",
    permissionRequise: "System permission required",
    autoriser: "Allow",
    permissionAccordee: "Permission granted ✓",
  },
  credits: {
    titre: "— Credits —",
    baseline: "Broc — a flea market simulation",
    concu: "Designed by G. Fenard · 2026",
    version: "ver. 1.0 · spring season · 1924",
    confidentialite: "Privacy",
    mentionsLegales: "Legal notice",
  },
};
```

Créer `src/lib/i18n/ui/es.ts` :

```ts
import type { DictionnaireUI } from "./index";

export const es: DictionnaireUI = {
  commun: {
    fermer: "Cerrar",
    annuler: "Cancelar",
    confirmer: "Confirmar",
  },
  menu: {
    continuer: "Continuar",
    nouvellePartie: "Nueva partida",
    charger: "Cargar",
    reglages: "Ajustes",
    credits: "Créditos",
  },
  parties: {
    titre: "— Partidas —",
    emplacementVide: "Ranura vacía",
    creerDansEmplacement: "Nueva partida en la ranura {n}",
    choisirEmplacement: "Elegir la ranura {n}",
    renommer: "Renombrar",
    renommerEmplacement: "Renombrar la ranura {n}",
    supprimer: "Eliminar",
    ecraser: "Sobrescribir",
    lancer: "Iniciar partida",
    active: "Activa",
    partieN: "Partida {n}",
    jourNiveau: "Día {jour} · Nivel {niveau}",
    valeurCollection: "Valor de la colección: {valeur} €",
    aLInstant: "ahora mismo",
    ilYAMin: "hace {n} min",
    ilYAHeures: "hace {n} h",
    ilYAJours: "hace {n} d",
    confirmSupprimerTitre: "¿Eliminar «{nom}»?",
    confirmSupprimerCorps: "Esta partida se perderá definitivamente.",
    confirmEcraserTitre: "¿Sobrescribir «{nom}»?",
    confirmEcraserCorps:
      "Esta partida se perderá definitivamente y será reemplazada por una nueva.",
  },
  reglages: {
    titre: "— Ajustes —",
    son: "Sonido",
    volumeGeneral: "Volumen general — {n}",
    musique: "Música",
    effets: "Efectos de sonido",
    ambiance: "Sonidos de ambiente",
    affichage: "Pantalla",
    taillePolice: "Tamaño de letra",
    petit: "Pequeño",
    normal: "Normal",
    grand: "Grande",
    langue: "Idioma",
    notifications: "Notificaciones",
    rappels: "Recordatorios (energía, taller, misiones)",
    notifsIndispo: "Disponibles en la aplicación iOS",
    permissionRequise: "Se requiere permiso del sistema",
    autoriser: "Permitir",
    permissionAccordee: "Permiso concedido ✓",
  },
  credits: {
    titre: "— Créditos —",
    baseline: "Broc — una simulación de mercadillo",
    concu: "Diseñado por G. Fenard · 2026",
    version: "ver. 1.0 · temporada de primavera · 1924",
    confidentialite: "Privacidad",
    mentionsLegales: "Aviso legal",
  },
};
```

- [ ] **Step 5: Créer l'index (type dérivé + interpolation)**

Créer `src/lib/i18n/ui/index.ts` :

```ts
import type { Locale } from "@/lib/i18n/locales";
import { fr } from "./fr";
import { en } from "./en";
import { es } from "./es";

/**
 * Forme du dictionnaire : celle du français, valeurs relâchées en `string`
 * (sinon les littéraux `as const` exigeraient les mêmes textes partout).
 */
type DeepStrings<T> = {
  [K in keyof T]: T[K] extends object ? DeepStrings<T[K]> : string;
};
export type DictionnaireUI = DeepStrings<typeof fr>;

export const DICTIONNAIRES: Record<Locale, DictionnaireUI> = { fr, en, es };

/**
 * Interpolation `{param}`. Un paramètre absent laisse le marqueur visible —
 * volontaire : un `{n}` à l'écran se repère, un texte silencieusement faux non.
 */
export function tr(
  gabarit: string,
  params?: Record<string, string | number>,
): string {
  return gabarit.replace(/\{(\w+)\}/g, (tout, cle: string) =>
    params && cle in params ? String(params[cle]) : tout,
  );
}
```

- [ ] **Step 6: Vérifier tests + typage**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests), tsc silencieux. Contre-épreuve rapide : commenter une clé de `es.ts` → `npx tsc --noEmit` doit hurler ; la rétablir.

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/ui/
git commit -m "feat(i18n): dictionnaires UI du menu fr/en/es typés + interpolation tr()"
```

---

### Task 3: LangueProvider + useLangue + encadré Langue dans Réglages

**Files:**
- Create: `src/lib/i18n/LangueContext.tsx`
- Modify: `src/app/layout.tsx` (monter le provider autour des providers existants)
- Modify: `src/components/mobile/ReglagesModal.tsx` (nouvel encadré Langue)
- Test: `src/lib/i18n/LangueContext.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`Locale`, `detecterLocale`, `persisterLocale`, `LOCALES`, `LOCALE_LABELS`) ; Task 2 (`DICTIONNAIRES`, `DictionnaireUI`, `tr`).
- Produces: `LangueProvider({ children })` ; `useLangue(): { locale: Locale; setLocale: (l: Locale) => void; d: DictionnaireUI; tr: typeof tr }`. **Valeur par défaut du contexte = français** (composants testés sans provider inchangés).

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/lib/i18n/LangueContext.test.tsx` :

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LangueProvider, useLangue } from "@/lib/i18n/LangueContext";

function Sonde() {
  const { locale, setLocale, d } = useLangue();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="label">{d.menu.nouvellePartie}</span>
      <button onClick={() => setLocale("es")}>vers-es</button>
    </div>
  );
}

describe("LangueContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("navigator", { language: "fr-FR" });
  });

  it("sans provider : valeur par défaut française", () => {
    render(<Sonde />);
    expect(screen.getByTestId("locale").textContent).toBe("fr");
    expect(screen.getByTestId("label").textContent).toBe("Nouvelle partie");
  });

  it("avec provider : détecte la langue puis bascule à chaud et persiste", () => {
    render(
      <LangueProvider>
        <Sonde />
      </LangueProvider>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("fr");

    fireEvent.click(screen.getByText("vers-es"));
    expect(screen.getByTestId("label").textContent).toBe("Nueva partida");
    expect(
      JSON.parse(localStorage.getItem("projet-broc:langue:v1")!).locale,
    ).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/i18n/LangueContext.test.tsx`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter le provider**

Créer `src/lib/i18n/LangueContext.tsx` :

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  detecterLocale,
  persisterLocale,
  type Locale,
} from "@/lib/i18n/locales";
import { DICTIONNAIRES, tr, type DictionnaireUI } from "@/lib/i18n/ui";

interface ValeurLangue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  d: DictionnaireUI;
  tr: typeof tr;
}

/**
 * Valeur par défaut FRANÇAISE : un composant rendu hors provider (tests
 * unitaires) affiche le français sans wrapper. setLocale y est un no-op.
 */
const LangueContext = createContext<ValeurLangue>({
  locale: "fr",
  setLocale: () => {},
  d: DICTIONNAIRES.fr,
  tr,
});

export function LangueProvider({ children }: { children: ReactNode }) {
  // "fr" au premier rendu (SSG) puis détection au montage : évite tout
  // mismatch d'hydratation avec l'export statique.
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    setLocaleState(detecterLocale());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persisterLocale(l);
  }, []);

  return (
    <LangueContext.Provider
      value={{ locale, setLocale, d: DICTIONNAIRES[locale], tr }}
    >
      {children}
    </LangueContext.Provider>
  );
}

export function useLangue(): ValeurLangue {
  return useContext(LangueContext);
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `npx vitest run src/lib/i18n/LangueContext.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Monter le provider au layout racine**

Dans `src/app/layout.tsx` : ajouter l'import et envelopper les providers
existants (le plus haut possible, sous `<body>`) :

```tsx
import { LangueProvider } from "@/lib/i18n/LangueContext";
```

```tsx
      <body style={{ minHeight: "100dvh", overflowX: "hidden" }}>
        <LangueProvider>
          <SettingsProvider>
            {/* … providers et enfants existants inchangés … */}
          </SettingsProvider>
        </LangueProvider>
      </body>
```

(Adapter la fermeture des balises ; ne rien changer d'autre au layout.
`<html lang="fr">` reste : la locale runtime le met à jour au montage.)

- [ ] **Step 6: Encadré Langue dans Réglages**

Dans `src/components/mobile/ReglagesModal.tsx` :

Ajouter les imports :

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";
```

Dans le composant `ReglagesModal`, récupérer la langue :

```tsx
  const { locale, setLocale, d } = useLangue();
```

Insérer l'encadré **entre la section Affichage et `<SectionNotifications />`** :

```tsx
        <section style={carte} aria-label={d.reglages.langue}>
          <h3 style={sectionTitle}>{d.reglages.langue}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  playClick();
                  setLocale(l);
                }}
                style={segBtn(locale === l)}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </section>
```

(Les libellés de l'encadré Son/Affichage/Notifications basculent en Task 6 —
dans cette task seule la section Langue est ajoutée.)

- [ ] **Step 7: Vérifier lint + suite + à l'œil**

Run: `npx eslint src && npx vitest run`
Expected: tout vert (aucun test existant wrappé — valeur par défaut fr).
Puis avec le dev server : Réglages → l'encadré Langue affiche
Français/English/Español, cliquer English ne change encore que peu de
choses (migrations en Tasks 4-6) mais persiste (`localStorage`) et survit
au reload.

- [ ] **Step 8: Commit**

```bash
git add src/lib/i18n/LangueContext.tsx src/lib/i18n/LangueContext.test.tsx src/app/layout.tsx src/components/mobile/ReglagesModal.tsx
git commit -m "feat(i18n): LangueProvider au layout racine + encadré Langue dans Réglages"
```

---

### Task 4: Écran-titre trilingue

**Files:**
- Modify: `src/app/page.tsx` (les 5 libellés du menu)
- Test: `src/app/page.test.tsx` (aucun changement attendu — vérifier)

**Interfaces:**
- Consumes: `useLangue()` de la Task 3 (`d.menu.*`).
- Produces: rien de nouveau.

- [ ] **Step 1: Migrer les libellés**

Dans `src/app/page.tsx` :

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";
```

Dans `TitleScreen`, ajouter (avec les autres hooks, AVANT le early return
`introEnCours` — piège rules-of-hooks du fichier) :

```tsx
  const { d } = useLangue();
```

Remplacer les 5 `label="…"` des `BoutonMenu` :

```tsx
          <BoutonMenu
            icon={<Play size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.continuer}
            onClick={onContinuer}
            disabled={!aSauvegarde}
          />
          <BoutonMenu
            icon={<Plus size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.nouvellePartie}
            onClick={onNouvellePartie}
          />
          <BoutonMenu
            icon={<FolderOpen size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.charger}
            onClick={onParties}
          />
          <BoutonMenu
            icon={<Settings size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.reglages}
            onClick={onReglages}
          />
          <BoutonMenu
            icon={<Info size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.credits}
            onClick={onCredits}
          />
```

- [ ] **Step 2: Vérifier**

Run: `npx eslint src/app/page.tsx && npx vitest run src/app/page.test.tsx`
Expected: PASS — les tests rendent sans provider, donc français par défaut
(« Nouvelle partie » toujours trouvé).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(i18n): écran-titre trilingue (libellés du menu via useLangue)"
```

---

### Task 5: PartiesModal + ConfirmModal trilingues

**Files:**
- Modify: `src/components/mobile/PartiesModal.tsx` (tous les textes, dont `tempsRelatif`)
- Modify: `src/components/ui/ConfirmModal.tsx` (défaut « Annuler »)
- Test: `src/components/mobile/PartiesModal.test.tsx` (aucun changement attendu — vérifier)

**Interfaces:**
- Consumes: `useLangue()` (`d.parties.*`, `d.commun.*`, `tr`).
- Produces: `tempsRelatif(ts: number, d: DictionnaireUI, tr)` devient interne au composant — pas d'export.

- [ ] **Step 1: ConfirmModal — libellé Annuler**

Dans `src/components/ui/ConfirmModal.tsx` : importer `useLangue`, et
remplacer le défaut en dur :

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";
```

Dans le composant (après les autres hooks) :

```tsx
  const { d } = useLangue();
```

Remplacer `cancelLabel = "Annuler"` (défaut de paramètre) par
`cancelLabel` sans défaut, puis à l'usage :

```tsx
            {cancelLabel ?? d.commun.annuler}
```

(La prop `cancelLabel?: string` reste — les appelants qui la passent la
maîtrisent ; seul le défaut devient localisé. Idem si un défaut
`confirmLabel = "Confirmer"` existe : `confirmLabel ?? d.commun.confirmer`.)

- [ ] **Step 2: PartiesModal — textes et temps relatif**

Dans `src/components/mobile/PartiesModal.tsx` :

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";
```

`tempsRelatif` prend le dictionnaire (fonction pure, testable telle quelle) :

```tsx
/** « à l'instant » / « il y a X min/h/j » — localisé via le dictionnaire. */
function tempsRelatif(
  ts: number,
  d: DictionnaireUI,
  interpole: (g: string, p?: Record<string, string | number>) => string,
): string {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  if (minutes < 1) return d.parties.aLInstant;
  if (minutes < 60) return interpole(d.parties.ilYAMin, { n: minutes });
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return interpole(d.parties.ilYAHeures, { n: heures });
  return interpole(d.parties.ilYAJours, { n: Math.floor(heures / 24) });
}
```

Dans le composant `PartiesModal` (avec les autres hooks, avant le
`if (!open …) return null`) :

```tsx
  const { d, tr } = useLangue();
```

Remplacements dans le JSX (libellé FR actuel → expression) :

| Texte actuel | Remplacement |
|---|---|
| `aria-label="Parties"` (dialog) | `aria-label={d.parties.titre}` |
| `— Parties —` | `{d.parties.titre}` |
| `aria-label="Fermer"` | `aria-label={d.commun.fermer}` |
| `aria-label={\`Choisir l'emplacement ${ligne.n}\`}` | `aria-label={tr(d.parties.choisirEmplacement, { n: ligne.n })}` |
| `ligne.nom ?? \`Partie ${ligne.n}\`` | `ligne.nom ?? tr(d.parties.partieN, { n: ligne.n })` |
| badge `Active` | `{d.parties.active}` |
| `Jour {…} · Niveau {…}` (JSX) | `{tr(d.parties.jourNiveau, { jour: ligne.resume.jour, niveau: ligne.resume.niveau })}` |
| `Valeur de la collection : … €` | `{tr(d.parties.valeurCollection, { valeur: ligne.resume.valeurCollection.toLocaleString("fr-FR") })}` — remplacer `"fr-FR"` par la locale : `useLangue().locale` (destructurer `locale` aussi) |
| `{tempsRelatif(ligne.derniereSession)}` | `{tempsRelatif(ligne.derniereSession, d, tr)}` |
| `ariaLabel="Renommer"` | `ariaLabel={d.parties.renommer}` |
| `ariaLabel="Supprimer"` | `ariaLabel={d.parties.supprimer}` |
| `aria-label={\`Renommer l'emplacement ${ligne.n}\`}` (input) | `aria-label={tr(d.parties.renommerEmplacement, { n: ligne.n })}` |
| `Écraser` (BoutonSlot) | `{d.parties.ecraser}` |
| `Emplacement vide` | `{d.parties.emplacementVide}` |
| `aria-label={\`Nouvelle partie dans l'emplacement ${ligne.n}\`}` (+) | `aria-label={tr(d.parties.creerDansEmplacement, { n: ligne.n })}` |
| `Lancer la partie` | `{d.parties.lancer}` |
| `titre={\`Supprimer « ${…} » ?\`}` | `titre={tr(d.parties.confirmSupprimerTitre, { nom: slotAConfirmerSuppression?.nom ?? tr(d.parties.partieN, { n: confirmSuppression ?? "" }) })}` |
| `confirmLabel="Supprimer"` | `confirmLabel={d.parties.supprimer}` |
| corps « Cette partie sera définitivement perdue. » | `{d.parties.confirmSupprimerCorps}` |
| `titre={\`Écraser « ${…} » ?\`}` | `titre={tr(d.parties.confirmEcraserTitre, { nom: slotAConfirmerEcrasement?.nom ?? tr(d.parties.partieN, { n: confirmEcrasement ?? "" }) })}` |
| `confirmLabel="Écraser"` | `confirmLabel={d.parties.ecraser}` |
| corps « …au profit d'une nouvelle. » | `{d.parties.confirmEcraserCorps}` |

`toLocaleString(locale)` : utiliser la `locale` du hook pour la valeur de
collection (formats de milliers corrects par langue).

- [ ] **Step 3: Vérifier**

Run: `npx eslint src && npx vitest run src/components/mobile/PartiesModal.test.tsx src/app/page.test.tsx`
Expected: PASS sans modifier les tests (défaut contexte = fr).

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/PartiesModal.tsx src/components/ui/ConfirmModal.tsx
git commit -m "feat(i18n): overlay Parties et ConfirmModal trilingues"
```

---

### Task 6: ReglagesModal + CreditsModal trilingues

**Files:**
- Modify: `src/components/mobile/ReglagesModal.tsx` (tous les libellés restants)
- Modify: `src/components/mobile/CreditsModal.tsx`

**Interfaces:**
- Consumes: `useLangue()` (`d.reglages.*`, `d.credits.*`, `d.commun.fermer`, `tr`).
- Produces: rien de nouveau.

- [ ] **Step 1: ReglagesModal**

`const { locale, setLocale, d, tr } = useLangue();` est déjà là (Task 3).
Remplacements :

| Texte actuel | Remplacement |
|---|---|
| `aria-label="Réglages"` (dialog) | `aria-label={d.reglages.titre}` |
| `— Réglages —` | `{d.reglages.titre}` |
| `aria-label="Fermer"` | `aria-label={d.commun.fermer}` |
| `Son` (h3 + aria-label section) | `{d.reglages.son}` |
| `Volume général — {audioPrefs.volume}` | `{tr(d.reglages.volumeGeneral, { n: audioPrefs.volume })}` |
| `aria-label="Volume général"` (input range) | `aria-label={tr(d.reglages.volumeGeneral, { n: audioPrefs.volume })}` |
| `Musique` | `{d.reglages.musique}` |
| `Effets sonores` | `{d.reglages.effets}` |
| `Sons d'ambiance` | `{d.reglages.ambiance}` |
| `Affichage` (h3 + aria-label) | `{d.reglages.affichage}` |
| `Taille de police` | `{d.reglages.taillePolice}` |
| tableau `tailles` noms `Petit/Normal/Grand` | `{ id: "petit", nom: d.reglages.petit }` etc. — déplacer la déclaration du tableau APRÈS le `useLangue()` |
| `Notifications` (h3 + aria-label, dans `SectionNotifications`) | `{d.reglages.notifications}` — `SectionNotifications` appelle son propre `useLangue()` |
| `Rappels (énergie, atelier, quêtes)` | `{d.reglages.rappels}` |
| `Disponibles sur l'application iOS` | `{d.reglages.notifsIndispo}` |
| `Permission système requise` | `{d.reglages.permissionRequise}` |
| `Autoriser` | `{d.reglages.autoriser}` |
| `Permission accordée ✓` | `{d.reglages.permissionAccordee}` |

- [ ] **Step 2: CreditsModal**

```tsx
import { useLangue } from "@/lib/i18n/LangueContext";
```

`const { d } = useLangue();` puis :

| Texte actuel | Remplacement |
|---|---|
| `aria-label="Crédits"` | `aria-label={d.credits.titre}` |
| `— Crédits —` | `{d.credits.titre}` |
| `aria-label="Fermer"` | `aria-label={d.commun.fermer}` |
| `Broc — une simulation de brocante` | `{d.credits.baseline}` |
| `Conçu par G. Fenard · 2026` | `{d.credits.concu}` |
| `ver. 1.0 · saison de printemps · 1924` | `{d.credits.version}` |
| `Confidentialité` | `{d.credits.confidentialite}` |
| `Mentions légales` | `{d.credits.mentionsLegales}` |

- [ ] **Step 3: Vérifier**

Run: `npx eslint src && npx vitest run`
Expected: suite complète verte.

- [ ] **Step 4: Commit**

```bash
git add src/components/mobile/ReglagesModal.tsx src/components/mobile/CreditsModal.tsx
git commit -m "feat(i18n): Réglages et Crédits trilingues"
```

---

### Task 7: Vérification de bout en bout (Playwright)

**Files:** aucun (vérification ; script jetable dans le scratchpad).

**Interfaces:**
- Consumes: l'app complète (Tasks 1-6), dev server `npm run dev`.
- Produces: preuve de la bascule EN/ES + persistance.

- [ ] **Step 1: Script Playwright**

Avec le dev server lancé, exécuter (adapter le chemin scratchpad) :

```js
import { chromium } from "<repo>/node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// 1. Défaut navigateur en-US → menu en anglais dès le premier chargement.
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
if (!(await page.getByRole("button", { name: "New game" }).isVisible()))
  throw new Error("détection en-US → anglais : échec");

// 2. Bascule ES via Réglages, à chaud.
await page.getByRole("button", { name: "Settings" }).click();
await page.getByRole("button", { name: "Español" }).click();
if (!(await page.getByText("— Ajustes —").isVisible()))
  throw new Error("bascule à chaud vers l'espagnol : échec");
await page.getByRole("button", { name: "Cerrar" }).click();
if (!(await page.getByRole("button", { name: "Nueva partida" }).isVisible()))
  throw new Error("menu espagnol : échec");

// 3. Persistance après reload.
await page.reload({ waitUntil: "networkidle" });
if (!(await page.getByRole("button", { name: "Nueva partida" }).isVisible()))
  throw new Error("persistance après reload : échec");

// 4. Retour français + overlay Parties.
await page.getByRole("button", { name: "Ajustes" }).click();
await page.getByRole("button", { name: "Français" }).click();
await page.getByRole("button", { name: "Fermer" }).click();
await page.getByRole("button", { name: "Charger" }).click();
if (!(await page.getByText("— Parties —").isVisible()))
  throw new Error("overlay Parties FR : échec");

console.log("E2E OK, erreurs page:", errors.length);
await browser.close();
```

Expected: `E2E OK, erreurs page: 0`. Prendre une capture du menu en ES et
une en EN pour vérifier qu'aucun libellé ne déborde des boutons 210px.

- [ ] **Step 2: Suite complète + tsc**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src`
Expected: tout vert.

- [ ] **Step 3: Mettre à jour la mémoire projet et le ledger**

Marquer SP1 terminé dans le ledger `.superpowers/sdd/progress.md` ;
noter dans la mémoire que SP2 (UI in-game) est le prochain chantier.
