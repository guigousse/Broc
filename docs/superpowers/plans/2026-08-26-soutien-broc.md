# Soutenir Broc — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à Broc trois endroits où il invite le joueur à suivre l'atelier et à laisser un avis — un bouton au menu principal, un pop-up au premier tap sur la borne d'arcade, et la feuille de notation native à la fermeture de la fanfare du niveau 10.

**Architecture:** Une feuille unique `SoutienSheet` (bâtie sur le `BottomSheet` existant) ouverte depuis deux portes sans rapport, une prop `intro` portant l'accroche CRT quand elle vient de la borne. Toutes les URL vivent dans un seul module pur, testable sans navigateur. La notation native est un appel isolé, sans UI et sans conséquence branchée derrière.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Tauri v2 (`tauri-plugin-opener` officiel, `tauri-plugin-in-app-review` vendoré), Vitest + Testing Library, i18n maison à quatre langues.

**Spec:** `docs/superpowers/specs/2026-08-26-soutien-design.md`

## Global Constraints

- **La `TabBar` n'est pas touchée.** Aucun sixième onglet. Décision explicite de Guillaume.
- **Aucun bouton ne déclenche la feuille de notation native.** Les boutons ouvrent la fiche du store ; la feuille native part toute seule. Règle Google, citée dans la spec §« Ce que les stores autorisent ».
- **Aucune question d'opinion nulle part**, dans aucune langue. « Tu aimes Broc ? » est le cas nommément interdit.
- **Rien n'est branché derrière `demanderNotation()`.** Aucune récompense, aucun compteur, aucun `if (aNoté)`. L'appel ne renvoie aucune information exploitable.
- **Aucun champ ajouté au `GameState`**, donc aucune migration de sauvegarde. Les deux drapeaux « déjà vu » vivent dans `localStorage`.
- **App Store ID : `6784023113`.** Package Android : `com.guigousse.broc`.
- **Comptes :** `https://instagram.com/broc.le.jeu` et `https://tiktok.com/@broc.le.jeu`. Pas de Facebook.
- **Accroche figée** (ne pas reformuler sans repasser par la spec §3) : `▶ INSERT COIN` / `MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS.` puis « Broc est fabriqué par une seule personne. Suivre l'atelier ou laisser un avis, c'est ce qui l'aide à continuer d'exister. »
- **Tests :** `npx vitest run <chemin>` pour un fichier, `npm run test:run` pour la suite. `npm run lint` avant chaque commit.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/soutien/liens.ts` | **Créé.** Les URL, et le choix de la bonne selon la plateforme. Pur, aucune E/S. |
| `src/lib/soutien/ouvrir.ts` | **Créé.** Le seul endroit qui appelle `openUrl` du plugin, avec le repli web. |
| `src/lib/soutien/vu.ts` | **Créé.** Les deux drapeaux `localStorage` (pop-up borne, notation niveau 10). |
| `src/lib/soutien/notation.ts` | **Créé.** Le seul endroit qui appelle le plugin de notation native. |
| `src/lib/plateforme.ts` | **Modifié.** Ajout de `tauriAndroidDisponible()`. |
| `src/components/mobile/SoutienSheet.tsx` | **Créé.** La feuille, avec sa prop `intro`. |
| `src/components/bazar/AccrocheBorne.tsx` | **Créé.** L'écran CRT passé en `intro` depuis la borne. |
| `src/components/bazar/EcranArcade.tsx` | **Modifié.** Détection du tap, pop-up au 1ᵉʳ, toast ensuite. |
| `src/app/page.tsx` | **Modifié.** Le sixième `BoutonMenu`. |
| `src/components/mobile/LevelUpOverlay.tsx` | **Modifié.** L'appel de notation au niveau 10. |
| `src/lib/i18n/ui/{fr,en,es,el}.ts` | **Modifiés.** La branche `soutien`. |
| `src-tauri/capabilities/default.json` | **Modifié.** Permissions `opener` (schémas `itms-apps:` et `market:`) et `in-app-review`. |
| `src-tauri/Cargo.toml` | **Modifié.** Les deux plugins. |

---

### Task 1 : Les URL et la détection Android

**Files:**
- Create: `src/lib/soutien/liens.ts`
- Create: `src/lib/soutien/liens.test.ts`
- Modify: `src/lib/plateforme.ts`

**Interfaces:**
- Consumes: `tauriIosDisponible()` de `src/lib/plateforme.ts`.
- Produces:
  - `tauriAndroidDisponible(): boolean`
  - `INSTAGRAM_URL: string`, `TIKTOK_URL: string`
  - `PLAY_STORE_ACTIF: boolean`
  - `lienNotation(): string | null` — `null` quand aucune fiche n'existe pour la plateforme courante.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/soutien/liens.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "./liens";

/** Simule le runtime : `tauri` absent = web, sinon iOS ou Android via l'UA. */
function plateforme(cible: "web" | "ios" | "android") {
  const UA = {
    web: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
  }[cible];
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(UA);
  if (cible === "web") {
    delete (window as Record<string, unknown>).__TAURI_INTERNALS__;
  } else {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("liens de soutien", () => {
  it("les réseaux sont les comptes @broc.le.jeu", () => {
    expect(INSTAGRAM_URL).toBe("https://instagram.com/broc.le.jeu");
    expect(TIKTOK_URL).toBe("https://tiktok.com/@broc.le.jeu");
  });

  it("sur iOS, la notation ouvre la fiche App Store en écriture d'avis", () => {
    plateforme("ios");
    expect(lienNotation()).toBe(
      "itms-apps://itunes.apple.com/app/id6784023113?action=write-review",
    );
  });

  it("sur le web, la notation passe en https (itms-apps n'existe pas)", () => {
    plateforme("web");
    expect(lienNotation()).toBe(
      "https://apps.apple.com/fr/app/broc-jeu-de-brocante/id6784023113",
    );
  });

  it("sur Android, aucune fiche tant que Broc n'est pas publié sur Play", () => {
    plateforme("android");
    expect(lienNotation()).toBeNull();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/soutien/liens.test.ts`
Expected: FAIL — `Failed to resolve import "./liens"`.

- [ ] **Step 3 : Ajouter `tauriAndroidDisponible()` à `src/lib/plateforme.ts`**

À coller sous `tauriIosDisponible`, dans le même fichier :

```ts
/**
 * Vrai uniquement sous runtime Tauri sur Android. Pendant symétrique de
 * `tauriIosDisponible` — même structure, même ordre de gardes, pour qu'un
 * lecteur qui connaît l'une reconnaisse l'autre au premier coup d'œil.
 */
export function tauriAndroidDisponible(): boolean {
  if (typeof window === "undefined") return false;
  if (!("__TAURI_INTERNALS__" in window)) return false;
  return /Android/.test(window.navigator.userAgent);
}
```

- [ ] **Step 4 : Écrire `src/lib/soutien/liens.ts`**

```ts
import { tauriAndroidDisponible, tauriIosDisponible } from "@/lib/plateforme";

/**
 * Toutes les adresses vers l'extérieur du jeu, en un seul endroit. Le jour où
 * un compte est renommé ou un store ouvert, c'est CE fichier qu'on édite, et
 * aucun autre — c'est toute sa raison d'être.
 */

export const INSTAGRAM_URL = "https://instagram.com/broc.le.jeu";
export const TIKTOK_URL = "https://tiktok.com/@broc.le.jeu";

/** Identifiant App Store de Broc. */
const APP_STORE_ID = "6784023113";

/** Identifiant de paquet Android — cf. `tauri.conf.json`. */
const ANDROID_PACKAGE = "com.guigousse.broc";

/**
 * Broc n'est pas encore publié sur Google Play. Tant que c'est faux, le bouton
 * de notation reste MASQUÉ sur Android : un bouton qui ouvre une fiche
 * inexistante est pire que pas de bouton. Le jour de la sortie Play, cette
 * seule ligne bascule à `true`.
 */
export const PLAY_STORE_ACTIF = false;

/**
 * `itms-apps://` ouvre l'App Store SANS passer par le navigateur, et
 * `action=write-review` amène directement sur le formulaire d'avis.
 *
 * ⚠ Le code pays est obligatoire dans l'URL https de repli : sans lui,
 * `apps.apple.com/app/id…` fait une 301 vers `/us/` au lieu de géo-rediriger
 * (constat consigné dans `marketing/instagram/PROFIL_INSTAGRAM.md`).
 */
const APP_STORE_NATIF = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`;
const APP_STORE_WEB = `https://apps.apple.com/fr/app/broc-jeu-de-brocante/id${APP_STORE_ID}`;
const PLAY_STORE_NATIF = `market://details?id=${ANDROID_PACKAGE}`;

/**
 * L'adresse où laisser un avis, ou `null` s'il n'y a pas de fiche à ouvrir sur
 * cette plateforme. `null` n'est pas une erreur : c'est le signal que le bouton
 * de notation ne doit pas être rendu du tout.
 */
export function lienNotation(): string | null {
  if (tauriIosDisponible()) return APP_STORE_NATIF;
  if (tauriAndroidDisponible()) return PLAY_STORE_ACTIF ? PLAY_STORE_NATIF : null;
  // Web (le jeu est aussi déployé sur Vercel) : les schémas natifs n'y veulent
  // rien dire, et l'App Store est la seule fiche qui existe aujourd'hui.
  return APP_STORE_WEB;
}
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/soutien/liens.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/soutien/liens.ts src/lib/soutien/liens.test.ts src/lib/plateforme.ts
git commit -m "feat(soutien): les adresses vers l'extérieur tiennent dans un seul module"
```

---

### Task 2 : Ouvrir un lien, sous Tauri comme sur le web

**Files:**
- Create: `src/lib/soutien/ouvrir.ts`
- Create: `src/lib/soutien/ouvrir.test.ts`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `package.json` (via npm)

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `ouvrirLien(url: string): Promise<void>`

- [ ] **Step 1 : Installer le plugin**

```bash
npm install @tauri-apps/plugin-opener
```

Puis dans `src-tauri/Cargo.toml`, sous `tauri-plugin-haptics = "2"` :

```toml
tauri-plugin-opener = "2"
```

Et enregistrer le plugin dans le builder Tauri (`src-tauri/src/lib.rs`), à côté des autres `.plugin(...)` :

```rust
.plugin(tauri_plugin_opener::init())
```

- [ ] **Step 2 : Ouvrir les permissions des schémas natifs**

Dans `src-tauri/capabilities/default.json`, remplacer le tableau `permissions` par :

```json
  "permissions": [
    "core:default",
    "notification:default",
    "haptics:allow-impact-feedback",
    "admob:default",
    "iap:default",
    "firebase:default",
    "opener:default",
    {
      "identifier": "opener:allow-open-url",
      "allow": [
        { "url": "https://*" },
        { "url": "itms-apps://*" },
        { "url": "market://*" }
      ]
    }
  ]
```

⚠ `opener:default` couvre `https:`, `http:`, `mailto:` et `tel:` — **mais ni
`itms-apps:` ni `market:`**. Sans le bloc explicite ci-dessus, le bouton de
notation échoue en silence sur les deux plateformes mobiles.

- [ ] **Step 3 : Écrire le test qui échoue**

Créer `src/lib/soutien/ouvrir.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const openUrl = vi.fn((_url: string) => Promise.resolve());
vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (url: string) => openUrl(url),
}));

import { ouvrirLien } from "./ouvrir";

beforeEach(() => {
  openUrl.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("ouvrirLien", () => {
  it("sous Tauri, passe par le plugin", async () => {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await ouvrirLien("https://instagram.com/broc.le.jeu");
    expect(openUrl).toHaveBeenCalledWith("https://instagram.com/broc.le.jeu");
  });

  it("hors Tauri, ouvre un onglet et ne touche pas au plugin", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await ouvrirLien("https://tiktok.com/@broc.le.jeu");
    expect(openUrl).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      "https://tiktok.com/@broc.le.jeu",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("un plugin qui échoue ne remonte pas l'erreur à l'appelant", async () => {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    openUrl.mockRejectedValueOnce(new Error("pas de navigateur"));
    await expect(ouvrirLien("itms-apps://x")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/soutien/ouvrir.test.ts`
Expected: FAIL — `Failed to resolve import "./ouvrir"`.

- [ ] **Step 5 : Écrire `src/lib/soutien/ouvrir.ts`**

```ts
/**
 * Le SEUL endroit du code qui ouvre une adresse hors du jeu.
 *
 * Broc tourne sous Tauri sur mobile ET dans un navigateur sur Vercel : le
 * plugin n'existe que dans le premier cas. Concentrer les deux chemins ici
 * évite que chaque bouton refasse la détection à sa façon.
 */
export async function ouvrirLien(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (!("__TAURI_INTERNALS__" in window)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    // Un lien qui ne s'ouvre pas ne doit jamais casser l'écran d'où on vient.
    // Rien à dire au joueur : il verra que rien ne s'est passé, et un toast
    // d'erreur technique n'y changerait rien.
  }
}
```

- [ ] **Step 6 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/soutien/ouvrir.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7 : Vérifier que la compilation Rust tient**

Run: `cd src-tauri && cargo check && cd ..`
Expected: succès. En cas d'erreur `unresolved import`, vérifier que le
`.plugin(tauri_plugin_opener::init())` du Step 1 est bien dans `src/lib.rs`.

- [ ] **Step 8 : Commit**

```bash
git add src/lib/soutien/ouvrir.ts src/lib/soutien/ouvrir.test.ts src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "feat(soutien): un lien s'ouvre sous Tauri comme dans un navigateur"
```

---

### Task 3 : Les libellés dans les quatre langues

**Files:**
- Modify: `src/lib/i18n/ui/fr.ts`
- Modify: `src/lib/i18n/ui/en.ts`
- Modify: `src/lib/i18n/ui/es.ts`
- Modify: `src/lib/i18n/ui/el.ts`

**Interfaces:**
- Produces: `d.soutien.{titre, insertCoin, modeDemo, corps, instagram, tiktok, noter, pasJouable}` et `d.menu.soutenir`.

- [ ] **Step 1 : Lancer le test de cohérence pour voir l'état de départ**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: PASS — les quatre dictionnaires sont cohérents aujourd'hui.

- [ ] **Step 2 : Ajouter la branche `soutien` au dictionnaire français**

Dans `src/lib/i18n/ui/fr.ts`, ajouter `soutenir: "Soutenir",` à la fin de l'objet `menu` (après `credits`), puis une branche `soutien` au premier niveau :

```ts
  soutien: {
    titre: "Soutenir Broc",
    insertCoin: "▶ INSERT COIN",
    modeDemo: "MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS.",
    corps:
      "Broc est fabriqué par une seule personne. Suivre l'atelier ou laisser un avis, c'est ce qui l'aide à continuer d'exister.",
    instagram: "Suivre sur Instagram",
    tiktok: "Suivre sur TikTok",
    noter: "Laisser un avis",
    pasJouable: "MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS.",
  },
```

`modeDemo` et `pasJouable` portent le même texte mais deux usages distincts —
l'écran CRT du pop-up et le toast des taps suivants. Les garder séparés permet
de retoucher l'un sans l'autre.

- [ ] **Step 3 : Traduire dans les trois autres dictionnaires**

`src/lib/i18n/ui/en.ts` — `soutenir: "Support",` dans `menu`, puis :

```ts
  soutien: {
    titre: "Support Broc",
    insertCoin: "▶ INSERT COIN",
    modeDemo: "DEMO MODE. THIS GAME DOES NOT START.",
    corps:
      "Broc is made by one person. Following the workshop or leaving a review is what helps it keep going.",
    instagram: "Follow on Instagram",
    tiktok: "Follow on TikTok",
    noter: "Leave a review",
    pasJouable: "DEMO MODE. THIS GAME DOES NOT START.",
  },
```

`src/lib/i18n/ui/es.ts` — `soutenir: "Apoyar",` dans `menu`, puis :

```ts
  soutien: {
    titre: "Apoyar a Broc",
    insertCoin: "▶ INSERT COIN",
    modeDemo: "MODO DEMOSTRACIÓN. ESTE JUEGO NO ARRANCA.",
    corps:
      "Broc lo hace una sola persona. Seguir el taller o dejar una reseña es lo que le ayuda a seguir existiendo.",
    instagram: "Seguir en Instagram",
    tiktok: "Seguir en TikTok",
    noter: "Dejar una reseña",
    pasJouable: "MODO DEMOSTRACIÓN. ESTE JUEGO NO ARRANCA.",
  },
```

`src/lib/i18n/ui/el.ts` — `soutenir: "Στήριξη",` dans `menu`, puis :

```ts
  soutien: {
    titre: "Στήριξε το Broc",
    insertCoin: "▶ INSERT COIN",
    modeDemo: "ΛΕΙΤΟΥΡΓΙΑ ΕΠΙΔΕΙΞΗΣ. ΤΟ ΠΑΙΧΝΙΔΙ ΔΕΝ ΞΕΚΙΝΑ.",
    corps:
      "Το Broc το φτιάχνει ένα μόνο άτομο. Το να ακολουθείς το εργαστήρι ή να αφήνεις μια κριτική είναι αυτό που το βοηθά να συνεχίσει να υπάρχει.",
    instagram: "Ακολούθησε στο Instagram",
    tiktok: "Ακολούθησε στο TikTok",
    noter: "Άφησε μια κριτική",
    pasJouable: "ΛΕΙΤΟΥΡΓΙΑ ΕΠΙΔΕΙΞΗΣ. ΤΟ ΠΑΙΧΝΙΔΙ ΔΕΝ ΞΕΚΙΝΑ.",
  },
```

`▶ INSERT COIN` n'est jamais traduit : c'est une mention de borne d'arcade, au
même titre que `PLAY` et `FÉFÉ GAMES` déjà à l'écran.

- [ ] **Step 4 : Lancer le test de cohérence**

Run: `npx vitest run src/lib/i18n/ui/ui.test.ts`
Expected: PASS. En cas d'échec, il nomme la clé manquante dans la langue fautive.

- [ ] **Step 5 : Vérifier que TypeScript est content**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/i18n/ui/fr.ts src/lib/i18n/ui/en.ts src/lib/i18n/ui/es.ts src/lib/i18n/ui/el.ts
git commit -m "i18n(soutien): les libellés du soutien dans les quatre langues"
```

---

### Task 4 : La feuille de soutien

**Files:**
- Create: `src/components/mobile/SoutienSheet.tsx`
- Create: `src/components/mobile/SoutienSheet.test.tsx`

**Interfaces:**
- Consumes: `INSTAGRAM_URL`, `TIKTOK_URL`, `lienNotation()` (Task 1) ; `ouvrirLien()` (Task 2) ; `d.soutien.*` (Task 3) ; `BottomSheet` existant.
- Produces: `SoutienSheet({ open, onClose, intro }: { open: boolean; onClose: () => void; intro?: ReactNode })`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/components/mobile/SoutienSheet.test.tsx` :

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

const ouvrirLien = vi.fn((_url: string) => Promise.resolve());
vi.mock("@/lib/soutien/ouvrir", () => ({
  ouvrirLien: (url: string) => ouvrirLien(url),
}));

const lienNotation = vi.fn<() => string | null>(() => "itms-apps://test");
vi.mock("@/lib/soutien/liens", () => ({
  INSTAGRAM_URL: "https://instagram.com/broc.le.jeu",
  TIKTOK_URL: "https://tiktok.com/@broc.le.jeu",
  lienNotation: () => lienNotation(),
}));

import { SoutienSheet } from "./SoutienSheet";

beforeEach(() => {
  ouvrirLien.mockClear();
  lienNotation.mockReturnValue("itms-apps://test");
});

afterEach(cleanup);

describe("SoutienSheet", () => {
  it("ouvre Instagram au tap", () => {
    render(<SoutienSheet open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("soutien-instagram"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://instagram.com/broc.le.jeu");
  });

  it("ouvre TikTok au tap", () => {
    render(<SoutienSheet open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("soutien-tiktok"));
    expect(ouvrirLien).toHaveBeenCalledWith("https://tiktok.com/@broc.le.jeu");
  });

  it("le bouton de notation ouvre la fiche du store", () => {
    render(<SoutienSheet open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("soutien-noter"));
    expect(ouvrirLien).toHaveBeenCalledWith("itms-apps://test");
  });

  it("sans fiche sur la plateforme, le bouton de notation n'existe pas", () => {
    lienNotation.mockReturnValue(null);
    render(<SoutienSheet open onClose={() => {}} />);
    expect(screen.queryByTestId("soutien-noter")).toBeNull();
    expect(screen.getByTestId("soutien-instagram")).toBeTruthy();
  });

  it("l'intro n'est rendue que si on la fournit", () => {
    const { rerender } = render(<SoutienSheet open onClose={() => {}} />);
    expect(screen.queryByText("ACCROCHE")).toBeNull();
    rerender(<SoutienSheet open onClose={() => {}} intro={<p>ACCROCHE</p>} />);
    expect(screen.getByText("ACCROCHE")).toBeTruthy();
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/SoutienSheet.test.tsx`
Expected: FAIL — `Failed to resolve import "./SoutienSheet"`.

- [ ] **Step 3 : Écrire `src/components/mobile/SoutienSheet.tsx`**

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { Instagram, Music2, Star } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { useSettings } from "@/context/SettingsContext";
import { INSTAGRAM_URL, TIKTOK_URL, lienNotation } from "@/lib/soutien/liens";
import { ouvrirLien } from "@/lib/soutien/ouvrir";

/**
 * La feuille « Soutenir Broc », ouverte depuis DEUX portes sans rapport : le
 * menu principal et le premier tap sur la borne d'arcade. La prop `intro`
 * porte l'accroche de la borne ; depuis le menu, elle est absente.
 *
 * Un seul composant pour les deux, donc une seule liste de liens et un seul
 * jeu de libellés à traduire. Le jour où un compte est renommé, il n'y a qu'un
 * endroit à corriger.
 */

const ligne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "12px 10px",
  minHeight: "var(--tap-min)",
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  letterSpacing: "0.04em",
  textAlign: "left",
  cursor: "pointer",
};

const pile: CSSProperties = { display: "grid", gap: 10 };

const separateur: CSSProperties = {
  height: 1,
  background: "var(--paper-500)",
  opacity: 0.5,
  margin: "4px 0",
};

interface SoutienSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accroche posée au-dessus des boutons. Absente depuis le menu principal. */
  intro?: ReactNode;
}

export function SoutienSheet({ open, onClose, intro }: SoutienSheetProps) {
  const { d } = useLangue();
  const { playClick } = useSettings();

  // Recalculé à chaque rendu, et c'est voulu : `PLAY_STORE_ACTIF` peut basculer
  // d'une version à l'autre, et rien ici ne coûte assez cher pour être mémoïsé.
  const urlNotation = lienNotation();

  const aller = (url: string) => () => {
    playClick();
    void ouvrirLien(url);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={d.soutien.titre}>
      {intro}
      <div style={pile}>
        <button
          type="button"
          data-testid="soutien-instagram"
          style={ligne}
          onClick={aller(INSTAGRAM_URL)}
        >
          <Instagram size={18} strokeWidth={1.6} aria-hidden />
          {d.soutien.instagram}
        </button>
        <button
          type="button"
          data-testid="soutien-tiktok"
          style={ligne}
          onClick={aller(TIKTOK_URL)}
        >
          <Music2 size={18} strokeWidth={1.6} aria-hidden />
          {d.soutien.tiktok}
        </button>

        {/* Pas de fiche sur cette plateforme = pas de bouton. Un bouton qui
            ouvrirait une page inexistante est pire que pas de bouton. */}
        {urlNotation && (
          <>
            <div style={separateur} />
            <button
              type="button"
              data-testid="soutien-noter"
              style={{ ...ligne, borderColor: "var(--brass-300)" }}
              onClick={aller(urlNotation)}
            >
              <Star size={18} strokeWidth={1.6} aria-hidden />
              {d.soutien.noter}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
```

⚠ Ce bouton ouvre la **fiche du store**, jamais la feuille de notation native.
Google interdit nommément un bouton qui déclencherait sa carte de notation.

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/components/mobile/SoutienSheet.test.tsx`
Expected: PASS — 5 tests. Si `useSettings` échoue hors provider, envelopper le
rendu du test dans le provider utilisé par `ReglagesModal.test.tsx`.

- [ ] **Step 5 : Commit**

```bash
git add src/components/mobile/SoutienSheet.tsx src/components/mobile/SoutienSheet.test.tsx
git commit -m "feat(soutien): la feuille de soutien, deux réseaux et un avis"
```

---

### Task 5 : Le bouton au menu principal

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: `SoutienSheet` (Task 4), `d.menu.soutenir` (Task 3).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/app/page.test.tsx`, dans le `describe` existant :

```tsx
  it("le menu principal propose Soutenir, qui ouvre la feuille", () => {
    render(<Page />);
    const bouton = screen.getByRole("button", { name: "Soutenir" });
    fireEvent.click(bouton);
    expect(screen.getByTestId("soutien-instagram")).toBeTruthy();
  });
```

Vérifier que `fireEvent` est bien dans les imports de `@testing-library/react`
en tête de fichier ; l'ajouter sinon.

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/app/page.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the name "Soutenir"`.

- [ ] **Step 3 : Câbler le bouton**

Dans `src/app/page.tsx` :

1. Ajouter `Heart` aux icônes importées de `lucide-react`.
2. Importer la feuille sous les deux autres modales :

```tsx
import { SoutienSheet } from "@/components/mobile/SoutienSheet";
```

3. Ajouter l'état, à côté de `creditsOuverts` (ligne ~170) :

```tsx
  const [soutienOuvert, setSoutienOuvert] = useState(false);
```

4. Ajouter le gestionnaire, sur le modèle exact de `onCredits` (ligne ~295) :

```tsx
  const onSoutien = () => {
    playClick();
    setSoutienOuvert(true);
  };
```

5. Ajouter le sixième `BoutonMenu`, **après** celui des crédits :

```tsx
          <BoutonMenu
            icon={<Heart size={17} strokeWidth={2} aria-hidden />}
            label={d.menu.soutenir}
            onClick={onSoutien}
          />
```

6. Monter la feuille à côté de `CreditsModal` :

```tsx
      <SoutienSheet
        open={soutienOuvert}
        onClose={() => setSoutienOuvert(false)}
      />
```

7. Mettre à jour le commentaire au-dessus du bloc de menu : « Menu : 5 boutons
   superposés » devient « Menu : 6 boutons superposés ».

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/app/page.test.tsx`
Expected: PASS, y compris les tests préexistants du menu.

- [ ] **Step 5 : Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat(soutien): le menu principal ouvre la feuille de soutien"
```

---

### Task 6 : Le pop-up de la borne d'arcade

**Files:**
- Create: `src/lib/soutien/vu.ts`
- Create: `src/lib/soutien/vu.test.ts`
- Create: `src/components/bazar/AccrocheBorne.tsx`
- Modify: `src/components/bazar/EcranArcade.tsx`
- Modify: `src/components/bazar/EcranArcade.test.tsx`

**Interfaces:**
- Consumes: `safeLocalStorageGet` / `safeLocalStorageSet` de `@/lib/storage/safeLocalStorage`, `SoutienSheet` (Task 4), `useToastSafe` de `@/components/ui/Toast`, `d.soutien.*` (Task 3).
- Produces:
  - `popupBorneVu(): boolean`, `marquerPopupBorneVu(): void`
  - `notationNiveauFaite(): boolean`, `marquerNotationNiveauFaite(): void` (consommés par la Task 8)
  - `AccrocheBorne()` — composant sans props.

- [ ] **Step 1 : Écrire le test des drapeaux**

Créer `src/lib/soutien/vu.test.ts` :

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  marquerNotationNiveauFaite,
  marquerPopupBorneVu,
  notationNiveauFaite,
  popupBorneVu,
} from "./vu";

beforeEach(() => {
  window.localStorage.clear();
});

describe("drapeaux de soutien", () => {
  it("le pop-up de la borne n'a pas été vu au premier lancement", () => {
    expect(popupBorneVu()).toBe(false);
  });

  it("une fois marqué, il reste vu", () => {
    marquerPopupBorneVu();
    expect(popupBorneVu()).toBe(true);
  });

  it("les deux drapeaux sont indépendants", () => {
    marquerPopupBorneVu();
    expect(notationNiveauFaite()).toBe(false);
    marquerNotationNiveauFaite();
    expect(notationNiveauFaite()).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/soutien/vu.test.ts`
Expected: FAIL — `Failed to resolve import "./vu"`.

- [ ] **Step 3 : Écrire `src/lib/soutien/vu.ts`**

```ts
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/lib/storage/safeLocalStorage";

/**
 * Les deux « déjà vu » du soutien — le pop-up de la borne et la demande de
 * notation du niveau 10.
 *
 * POURQUOI `localStorage` ET PAS LE `GameState`. Le dépôt range ce genre de
 * drapeau dans l'état de partie (`miniTutoVinyle`, `miniTutoCarnet`,
 * `miniTutoAtelier`), et l'écart mérite d'être justifié ici : le `GameState`
 * est PAR EMPLACEMENT DE SAUVEGARDE. Un joueur qui mène trois parties verrait
 * le pop-up trois fois. Or la demande de soutien s'adresse à la personne qui
 * tient le téléphone, pas au brocanteur qu'elle incarne — elle ne fait pas
 * partie de la fiction, et n'a donc rien à faire dans une sauvegarde.
 *
 * Bénéfice secondaire : aucun champ ajouté à `GameState`, donc aucune
 * migration de sauvegarde à écrire.
 */

const CLE_POPUP_BORNE = "projet-broc:soutien:borne:v1";
const CLE_NOTATION_NIVEAU = "projet-broc:soutien:notation-niveau:v1";

export function popupBorneVu(): boolean {
  return safeLocalStorageGet<boolean>(CLE_POPUP_BORNE, false) === true;
}

export function marquerPopupBorneVu(): void {
  safeLocalStorageSet(CLE_POPUP_BORNE, true);
}

export function notationNiveauFaite(): boolean {
  return safeLocalStorageGet<boolean>(CLE_NOTATION_NIVEAU, false) === true;
}

export function marquerNotationNiveauFaite(): void {
  safeLocalStorageSet(CLE_NOTATION_NIVEAU, true);
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/soutien/vu.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5 : Écrire l'accroche CRT**

Créer `src/components/bazar/AccrocheBorne.tsx` :

```tsx
"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * L'accroche posée en tête de la feuille de soutien quand elle s'ouvre depuis
 * la borne. C'est la BORNE qui parle, dans sa langue : le joueur n'est pas
 * tiré hors de la fiction pour se faire demander un service, la demande arrive
 * ensuite, en petit.
 *
 * ⚠ « MODE DÉMONSTRATION » ne promet rien, et c'est le point. Une vraie borne
 * au repos tourne en mode démonstration — c'est littéralement ce que fait cet
 * écran. Les formulations écartées (« pas encore sorti », « FÉFÉ GAMES
 * travaille dessus », « hors service ») créaient toutes l'attente d'un jeu à
 * venir que personne ne s'est engagé à livrer.
 */

const crt: CSSProperties = {
  background: "#04140b",
  border: "1px solid rgba(125,252,174,0.25)",
  padding: "14px 12px",
  marginBottom: 14,
  fontFamily: "ui-monospace, Menlo, monospace",
  color: "#b7ffd6",
  textAlign: "center",
};

const enseigne: CSSProperties = {
  color: "#ffc93c",
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: "0.14em",
};

const etat: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  letterSpacing: "0.16em",
  lineHeight: 1.5,
  color: "#7dfcae",
};

const corps: CSSProperties = {
  marginBottom: 14,
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--paper-100)",
};

export function AccrocheBorne() {
  const { d } = useLangue();
  return (
    <>
      <div style={crt} data-testid="soutien-accroche-borne">
        <div style={enseigne}>{d.soutien.insertCoin}</div>
        <div style={etat}>{d.soutien.modeDemo}</div>
      </div>
      <p style={corps}>{d.soutien.corps}</p>
    </>
  );
}
```

- [ ] **Step 6 : Écrire le test de la borne qui échoue**

Ajouter à `src/components/bazar/EcranArcade.test.tsx` :

```tsx
Le mock du toast se déclare en tête de fichier, avec celui d'`audioManager` :

```tsx
const toast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToastSafe: () => ({ toast }),
}));
```

Puis le bloc de tests :

```tsx
describe("EcranArcade — pop-up de soutien", () => {
  beforeEach(() => {
    window.localStorage.clear();
    toast.mockClear();
  });

  /** Un tap = pointerdown puis pointerup au MÊME endroit (dx = 0). */
  function taper(zone: HTMLElement) {
    fireEvent.pointerDown(zone, { clientX: 100 });
    fireEvent.pointerUp(zone, { clientX: 100 });
  }

  it("le premier tap sur un jeu trouvé ouvre la feuille de soutien", () => {
    render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.getByTestId("soutien-accroche-borne")).toBeTruthy();
  });

  it("le deuxième tap donne un toast, plus de pop-up", () => {
    const { unmount } = render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    unmount();

    render(<EcranArcade jeux={jeux(0)} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.queryByTestId("soutien-accroche-borne")).toBeNull();
    // L'écran répond TOUJOURS : sans ce toast, PLAY serait mort une 2e fois.
    expect(toast).toHaveBeenCalledWith(
      "MODE DÉMONSTRATION. CE JEU NE SE LANCE PAS.",
      { type: "info" },
    );
  });

  it("taper un jeu NON trouvé n'ouvre rien", () => {
    render(<EcranArcade jeux={jeux()} />);
    taper(screen.getByTestId("arcade-zone"));
    expect(screen.queryByTestId("soutien-accroche-borne")).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("un swipe navigue et n'ouvre jamais la feuille", () => {
    render(<EcranArcade jeux={jeux(0, 1)} />);
    const zone = screen.getByTestId("arcade-zone");
    fireEvent.pointerDown(zone, { clientX: 200 });
    fireEvent.pointerUp(zone, { clientX: 100 });
    expect(screen.queryByTestId("soutien-accroche-borne")).toBeNull();
    expect(screen.getByTestId("arcade-compteur").textContent).toBe("02 / 11");
  });
});
```

- [ ] **Step 7 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/components/bazar/EcranArcade.test.tsx`
Expected: FAIL — les quatre nouveaux tests ne trouvent pas `soutien-accroche-borne`
(le troisième et le quatrième peuvent passer par accident : c'est normal, ils
gardent le comportement existant).

- [ ] **Step 8 : Câbler le tap dans `EcranArcade.tsx`**

1. Ajouter aux imports :

```tsx
import { SoutienSheet } from "@/components/mobile/SoutienSheet";
import { AccrocheBorne } from "./AccrocheBorne";
import { marquerPopupBorneVu, popupBorneVu } from "@/lib/soutien/vu";
import { useToastSafe } from "@/components/ui/Toast";
```

2. Dans le corps du composant, sous `const [index, setIndex] = useState(0);` :

```tsx
  const [soutienOuvert, setSoutienOuvert] = useState(false);
  const { toast } = useToastSafe();
```

3. Remplacer `onPointerUp` par la version qui distingue le tap du swipe :

```tsx
  const onPointerUp = (e: PointerEvent) => {
    if (departXRef.current === null) return;
    const dx = e.clientX - departXRef.current;
    departXRef.current = null;
    if (Math.abs(dx) > SWIPE_SEUIL_PX) {
      aller(dx < 0 ? 1 : -1);
      return;
    }
    // En deçà du seuil, c'est un TAP. Le geste était déjà mesuré pour le
    // swipe : rien de neuf à calculer, on lit juste l'autre côté du même `dx`.
    tapSurJeu();
  };
```

4. Ajouter le gestionnaire de tap, juste au-dessus :

```tsx
  /**
   * Le tap ne répond QUE sur un jeu trouvé. Les jeux inconnus gardent leur
   * neige et leur indice de cartouche : cet écran-là dit déjà ce qui manque et
   * comment le trouver, et y greffer une demande de soutien punirait le joueur
   * qui n'a encore rien déniché.
   *
   * Le dégradé : l'invitation une fois, la réponse toujours. Un pop-up à
   * chaque tap serait du harcèlement — le joueur qui parcourt les onze jeux le
   * verrait onze fois d'affilée. Mais « rien du tout » aux taps suivants
   * rendrait PLAY mort une deuxième fois, et le joueur conclurait au bug.
   */
  const tapSurJeu = () => {
    if (!jeu?.trouve) return;
    if (popupBorneVu()) {
      toast(d.soutien.pasJouable, { type: "info" });
      return;
    }
    marquerPopupBorneVu();
    setSoutienOuvert(true);
  };
```

5. Monter la feuille **en dehors** du `<div style={crt}>`, en enveloppant le
   `return` dans un fragment :

```tsx
  return (
    <>
      <div style={crt}>
        {/* … tout le contenu existant, inchangé … */}
        <div style={balayage} />
      </div>

      <SoutienSheet
        open={soutienOuvert}
        onClose={() => setSoutienOuvert(false)}
        intro={<AccrocheBorne />}
      />
    </>
  );
```

⚠ **Sœur du trou CRT, pas dedans.** `crt` porte `overflow: "hidden"` et
`containerType: "size"`. `containerType` établit un bloc conteneur : une feuille
en `position: fixed` rendue à l'intérieur se positionnerait par rapport au trou
de la borne — quelques centimètres carrés — au lieu de l'écran.

- [ ] **Step 9 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/bazar/EcranArcade.test.tsx`
Expected: PASS — les quatre nouveaux **et** tous les tests préexistants du
carrousel, des flèches et de la bande-son.

- [ ] **Step 10 : Commit**

```bash
git add src/lib/soutien/vu.ts src/lib/soutien/vu.test.ts src/components/bazar/AccrocheBorne.tsx src/components/bazar/EcranArcade.tsx src/components/bazar/EcranArcade.test.tsx
git commit -m "feat(soutien): la borne répond enfin au tap, et le dit une fois"
```

---

### Task 7 : Le plugin de notation native

**Files:**
- Create: `src/lib/soutien/notation.ts`
- Create: `src/lib/soutien/notation.test.ts`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: `demanderNotation(): Promise<void>`

- [ ] **Step 1 : Installer le plugin**

```bash
npm install @gbyte/tauri-plugin-in-app-review
```

Dans `src-tauri/Cargo.toml`, sous `tauri-plugin-opener = "2"` :

```toml
tauri-plugin-in-app-review = "0.2"
```

Dans `src-tauri/src/lib.rs`, à côté des autres `.plugin(...)` :

```rust
.plugin(tauri_plugin_in_app_review::init())
```

Dans `src-tauri/capabilities/default.json`, ajouter `"in-app-review:default"`
au tableau `permissions`.

- [ ] **Step 2 : Écrire le test qui échoue**

Créer `src/lib/soutien/notation.test.ts` :

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestReview = vi.fn(() => Promise.resolve());
vi.mock("@gbyte/tauri-plugin-in-app-review", () => ({
  requestReview: () => requestReview(),
}));

import { demanderNotation } from "./notation";

beforeEach(() => {
  requestReview.mockClear();
});

afterEach(() => {
  delete (window as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("demanderNotation", () => {
  it("sous Tauri, demande la feuille native", async () => {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await demanderNotation();
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it("hors Tauri, ne fait rien du tout", async () => {
    await demanderNotation();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it("un échec du plugin ne remonte jamais à l'appelant", async () => {
    (window as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    requestReview.mockRejectedValueOnce(new Error("indisponible"));
    await expect(demanderNotation()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/soutien/notation.test.ts`
Expected: FAIL — `Failed to resolve import "./notation"`.

- [ ] **Step 4 : Écrire `src/lib/soutien/notation.ts`**

```ts
/**
 * La feuille de notation native — le SEUL endroit du code qui l'appelle.
 *
 * ⚠ TROIS RÈGLES QUI NE SE NÉGOCIENT PAS :
 *
 * 1. Cet appel ne part JAMAIS d'un bouton. Google l'interdit nommément
 *    (« you should not have a call-to-action option (such as a button) to
 *    trigger the API »), et le quota d'Apple — trois affichages par an, par
 *    appareil — rendrait ce bouton mort une fois sur deux.
 *
 * 2. Aucune question ne doit être posée juste avant. « Tu aimes Broc ? » est
 *    le cas explicitement interdit côté Google.
 *
 * 3. RIEN ne se branche derrière. L'appel ne dit pas si la boîte s'est
 *    affichée, ni si le joueur a noté, ni quelle note. Toute logique qui le
 *    supposerait serait un bug invisible — et récompenser un avis est de
 *    toute façon interdit des deux côtés.
 *
 * Recette : la boîte n'apparaît NI en build debug installé via ADB, NI sur
 * TestFlight. La vérifier demande une piste de test interne ou une release.
 */
export async function demanderNotation(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("__TAURI_INTERNALS__" in window)) return;

  try {
    const { requestReview } = await import("@gbyte/tauri-plugin-in-app-review");
    await requestReview();
  } catch {
    // Le plugin absent ou muet est un non-événement : le joueur vient de
    // fermer une fanfare de niveau, il ne doit rien voir d'autre.
  }
}
```

- [ ] **Step 5 : Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run src/lib/soutien/notation.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6 : Vérifier la compilation Rust**

Run: `cd src-tauri && cargo check && cd ..`
Expected: succès.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/soutien/notation.ts src/lib/soutien/notation.test.ts src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json package.json package-lock.json
git commit -m "feat(soutien): la feuille de notation native, et ses trois interdits"
```

---

### Task 8 : La demande de notation au niveau 10

**Files:**
- Modify: `src/components/mobile/LevelUpOverlay.tsx:518-523`
- Modify: `src/components/mobile/LevelUpOverlay.test.tsx`

**Interfaces:**
- Consumes: `demanderNotation()` (Task 7), `notationNiveauFaite()` / `marquerNotationNiveauFaite()` (Task 6).
- Produces: rien.

- [ ] **Step 1 : Écrire le test qui échoue**

`src/components/mobile/LevelUpOverlay.test.tsx` mocke déjà tout le contexte. Il
expose un helper `etat(niveauVu, niveau, …)` et deux variables de module,
`mockState` et `mockPathname`. Le nouveau mock se déclare en tête de fichier,
avec les autres :

```tsx
const demanderNotation = vi.fn(() => Promise.resolve());
vi.mock("@/lib/soutien/notation", () => ({
  demanderNotation: () => demanderNotation(),
}));
```

Puis le bloc de tests, à la fin du fichier :

```tsx
describe("LevelUpOverlay — demande de notation", () => {
  beforeEach(() => {
    demanderNotation.mockClear();
    window.localStorage.clear();
    mockPathname = "/bureau";
  });

  it("fermer la fanfare du niveau 10 demande la notation", () => {
    mockState = etat(9, 10);
    render(<LevelUpOverlay />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(demanderNotation).toHaveBeenCalledTimes(1);
  });

  it("un autre niveau ne demande rien", () => {
    mockState = etat(8, 9);
    render(<LevelUpOverlay />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(demanderNotation).not.toHaveBeenCalled();
  });

  it("une seule fois, même dans une nouvelle partie", () => {
    mockState = etat(9, 10);
    render(<LevelUpOverlay />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    cleanup();
    demanderNotation.mockClear();

    // Nouvelle partie : le GameState est neuf, mais le drapeau vit dans
    // localStorage — donc à l'échelle de la PERSONNE, pas de la sauvegarde.
    mockState = etat(9, 10);
    render(<LevelUpOverlay />);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(demanderNotation).not.toHaveBeenCalled();
  });
});
```

Ajouter `beforeEach` aux imports de `vitest` en tête de fichier s'il n'y est pas
encore (le fichier n'importe aujourd'hui que `afterEach, describe, expect, it, vi`).

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx`
Expected: FAIL — `expected "demanderNotation" to be called 1 times, but got 0`.

- [ ] **Step 3 : Brancher l'appel**

Dans `src/components/mobile/LevelUpOverlay.tsx`, ajouter aux imports :

```tsx
import { demanderNotation } from "@/lib/soutien/notation";
import {
  marquerNotationNiveauFaite,
  notationNiveauFaite,
} from "@/lib/soutien/vu";
```

Puis remplacer `fermer` (ligne ~518) par :

```tsx
  /** Le niveau à partir duquel on ose demander un avis. Cf. commentaire ci-dessous. */
  const NIVEAU_NOTATION = 10;

  // La fermeture marque le niveau vu et, à l'étape dédiée du tutoriel, fait
  // avancer vers la leçon des compétences — seule porte de sortie de
  // `niveau-celebration`.
  const fermer = () => {
    marquerNiveauVu();
    if (state.tutorielEtape === "niveau-celebration") {
      avancerTutoriel("competences-visite");
    }
    // La demande de notation part D'ICI, et pas de `marquerNiveauVu` dans le
    // GameContext : la logique de jeu n'a pas à connaître l'existence des
    // stores.
    //
    // POURQUOI LE NIVEAU 10. Le tutoriel rapporte ≥ 115 XP alors que le
    // niveau 1 est à 100 : le joueur passe niveau 1 À COUP SÛR pendant le
    // tutoriel, avant d'avoir rien vu du jeu. Le niveau 10 garantit un joueur
    // qui connaît Broc, sur un triomphe franc — c'est le contexte que les deux
    // plateformes recommandent.
    //
    // Rien n'est branché derrière : l'appel ne dit jamais si la boîte s'est
    // affichée, ni si le joueur a noté. Cf. `notation.ts`.
    if (niveauACelebrer === NIVEAU_NOTATION && !notationNiveauFaite()) {
      marquerNotationNiveauFaite();
      void demanderNotation();
    }
  };
```

⚠ `NIVEAU_NOTATION` doit être déclaré au niveau module (au-dessus de la
fonction `LevelUpOverlay`), pas dans le corps du composant — le placer avec les
autres constantes en tête de fichier.

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/components/mobile/LevelUpOverlay.test.tsx`
Expected: PASS — les trois nouveaux **et** tous les tests préexistants de la
fanfare, du tutoriel et des bouquets.

- [ ] **Step 5 : Lancer la suite complète et le lint**

Run: `npm run test:run && npm run lint && npx tsc --noEmit`
Expected: tout au vert. C'est le premier point du chantier où l'on vérifie que
rien n'a bougé ailleurs.

- [ ] **Step 6 : Commit**

```bash
git add src/components/mobile/LevelUpOverlay.tsx src/components/mobile/LevelUpOverlay.test.tsx
git commit -m "feat(soutien): la fanfare du niveau 10 demande un avis, une fois"
```

---

## Recette à la main (après la Task 8)

Ce que les tests ne peuvent pas couvrir, et qu'il faut voir de ses yeux :

- [ ] `npm run dev`, puis écran-titre → **Soutenir** ouvre la feuille ; les deux boutons de réseaux ouvrent un onglet ; **Laisser un avis** ouvre la fiche App Store en https.
- [ ] Bazar → borne d'arcade → taper un jeu **trouvé** : le pop-up monte, l'écran CRT est lisible et l'accroche ne promet rien. Le refermer, retaper : un toast, pas de pop-up.
- [ ] Taper un jeu **non trouvé** : rien ne bouge, la neige et l'indice restent.
- [ ] Changer de langue dans les Réglages et rouvrir la feuille dans les quatre langues : aucun texte ne déborde de son bouton (le grec est le plus long).
- [ ] Sur un vrai iPhone en build Tauri : **Laisser un avis** ouvre l'App Store dans l'application native, pas dans Safari.
- [ ] La feuille de notation du niveau 10 ne se vérifie **ni** en debug ADB **ni** sur TestFlight — la garder pour une piste de test interne ou une release.

## Le jour de la sortie Google Play

Une seule ligne : `PLAY_STORE_ACTIF = true` dans `src/lib/soutien/liens.ts`.
Le bouton de notation apparaît alors sur Android, et `lienNotation()` cesse d'y
renvoyer `null`. Le test « sur Android, aucune fiche tant que Broc n'est pas
publié sur Play » de `liens.test.ts` doit être retourné dans le même commit.
