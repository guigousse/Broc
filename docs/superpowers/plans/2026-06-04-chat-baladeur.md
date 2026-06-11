# Chat baladeur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** afficher un chat décoratif à un emplacement tiré du jour parmi 3 (sauf si déjà sur le fauteuil), et restaurer l'outil de dev pour pouvoir positionner les chats à l'œil.

**Architecture :** une fonction pure `selectChatBaladeur` couverte par Vitest, un layout dédié `chatBaladeurLayout.ts`, un composant `QgChatBaladeur` rendu une fois dans le panorama unifié. L'outil de dev existant (`QgEditContext` + `QgEditOverlay` + `QgEditPanel`) est généralisé pour gérer aussi les chats baladeurs, remonté dans le panorama unifié, et gated par `NEXT_PUBLIC_QG_EDIT=1`.

**Tech Stack :** Next 16 (App Router), React 19, Vitest, sharp (conversion WebP). Coordonnées en `vw` / `%` cohérentes avec `QG_LAYOUT` et `ATELIER_LAYOUT`. Pas de nouveau state persistant.

---

## File Structure

**Créer**
- `public/qg/chat-baladeur/qg-fenetre.webp` — chat assis qui regarde dehors (bureau)
- `public/qg/chat-baladeur/atelier-fenetre.webp` — chat assis qui regarde dehors (atelier)
- `public/qg/chat-baladeur/atelier-marche.webp` — chat qui marche (atelier)
- `src/lib/chatBaladeur.ts` — `selectChatBaladeur(jourActuel, chatSurFauteuil)` (logique pure)
- `src/lib/chatBaladeur.test.ts` — couverture Vitest
- `src/components/mobile/qg/chatBaladeurLayout.ts` — table des 3 emplacements + ordre
- `src/components/mobile/qg/QgChatBaladeur.tsx` — composant React (lit layout + selector + overrides dev)

**Modifier**
- `src/components/mobile/qg/dev/QgEditContext.tsx` — élargit `QgObjetKey` → `EditableKey` (QG objet ∪ chat baladeur)
- `src/components/mobile/qg/dev/QgEditOverlay.tsx` — itère sur `EditableKey`, scelle sur `[data-unified-scene]`
- `src/components/mobile/qg/dev/QgEditPanel.tsx` — affiche aussi les 3 chats dans le panneau
- `src/app/(panorama)/layout.tsx` — monte `QgEditProvider` (gated env) + `QgChatBaladeur`
- `src/components/mobile/panorama/UnifiedPanorama.tsx` — rend `QgEditOverlay` quand `enabled`

---

### Task 1 — Convertir et installer les 3 images du chat

**Files:**
- Source : `~/Desktop/chat bureau qui regarde dehor.webp`, `~/Desktop/chat atelier qui regarde dehors .png`, `~/Desktop/chat atelier fond.png`
- Create : `public/qg/chat-baladeur/qg-fenetre.webp`, `public/qg/chat-baladeur/atelier-fenetre.webp`, `public/qg/chat-baladeur/atelier-marche.webp`

- [ ] **Step 1 : créer le dossier cible**

```bash
mkdir -p "public/qg/chat-baladeur"
```

- [ ] **Step 2 : convertir et copier les 3 images via sharp**

Sharp est déjà dans les devDeps. Lancer (à la racine du repo) :

```bash
node -e "
const sharp = require('sharp');
const path = require('path');
const HOME = require('os').homedir();
const DESK = path.join(HOME, 'Desktop');
const OUT = 'public/qg/chat-baladeur';
(async () => {
  await sharp(path.join(DESK, 'chat bureau qui regarde dehor.webp'))
    .webp({ quality: 86 }).toFile(path.join(OUT, 'qg-fenetre.webp'));
  await sharp(path.join(DESK, 'chat atelier qui regarde dehors .png'))
    .webp({ quality: 86 }).toFile(path.join(OUT, 'atelier-fenetre.webp'));
  await sharp(path.join(DESK, 'chat atelier fond.png'))
    .webp({ quality: 86 }).toFile(path.join(OUT, 'atelier-marche.webp'));
  console.log('done');
})();
"
```

Attendu : trois fichiers `.webp` créés. Vérifier :

```bash
ls -lh public/qg/chat-baladeur/
```

Attendu : 3 fichiers, chacun < 200 Ko en pratique.

- [ ] **Step 3 : commit**

```bash
git add public/qg/chat-baladeur/
git commit -m "feat(assets): 3 sprites du chat baladeur (bureau + atelier)"
```

---

### Task 2 — Selector pur `selectChatBaladeur` (TDD)

**Files:**
- Create : `src/lib/chatBaladeur.ts`
- Test : `src/lib/chatBaladeur.test.ts`

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/lib/chatBaladeur.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { selectChatBaladeur, CHAT_BALADEUR_ORDER } from "./chatBaladeur";

describe("selectChatBaladeur", () => {
  it("renvoie null si le chat est sur le fauteuil", () => {
    expect(selectChatBaladeur(0, true)).toBeNull();
    expect(selectChatBaladeur(42, true)).toBeNull();
  });

  it("renvoie le 1er emplacement pour jour 0", () => {
    expect(selectChatBaladeur(0, false)).toBe(CHAT_BALADEUR_ORDER[0]);
  });

  it("renvoie le 2e emplacement pour jour 1", () => {
    expect(selectChatBaladeur(1, false)).toBe(CHAT_BALADEUR_ORDER[1]);
  });

  it("renvoie le 3e emplacement pour jour 2", () => {
    expect(selectChatBaladeur(2, false)).toBe(CHAT_BALADEUR_ORDER[2]);
  });

  it("cycle sur la longueur de l'ordre (jour 3 → 1er)", () => {
    expect(selectChatBaladeur(3, false)).toBe(CHAT_BALADEUR_ORDER[0]);
    expect(selectChatBaladeur(6, false)).toBe(CHAT_BALADEUR_ORDER[0]);
  });
});
```

- [ ] **Step 2 : vérifier que le test échoue**

```bash
npm run test:run -- src/lib/chatBaladeur.test.ts
```

Attendu : FAIL, « Cannot find module './chatBaladeur' ».

- [ ] **Step 3 : implémentation minimale**

Créer `src/lib/chatBaladeur.ts` :

```ts
/**
 * Identifiants des emplacements du chat baladeur. L'ordre détermine
 * le cycle de tirage (`jourActuel % CHAT_BALADEUR_ORDER.length`).
 */
export const CHAT_BALADEUR_ORDER = [
  "qg-fenetre",
  "atelier-fenetre",
  "atelier-marche",
] as const;

export type ChatBaladeurId = (typeof CHAT_BALADEUR_ORDER)[number];

/**
 * Sélectionne l'emplacement du chat baladeur pour le jour donné.
 * Retourne `null` si le chat est déjà sur le fauteuil — il ne peut pas
 * se dédoubler.
 */
export function selectChatBaladeur(
  jourActuel: number,
  chatSurFauteuil: boolean,
): ChatBaladeurId | null {
  if (chatSurFauteuil) return null;
  const idx =
    ((jourActuel % CHAT_BALADEUR_ORDER.length) + CHAT_BALADEUR_ORDER.length) %
    CHAT_BALADEUR_ORDER.length;
  return CHAT_BALADEUR_ORDER[idx];
}
```

- [ ] **Step 4 : vérifier que les tests passent**

```bash
npm run test:run -- src/lib/chatBaladeur.test.ts
```

Attendu : PASS, 5 tests verts.

- [ ] **Step 5 : commit**

```bash
git add src/lib/chatBaladeur.ts src/lib/chatBaladeur.test.ts
git commit -m "feat(lib): selectChatBaladeur — tirage déterministe par jour"
```

---

### Task 3 — Layout des 3 emplacements (coords placeholder)

**Files:**
- Create : `src/components/mobile/qg/chatBaladeurLayout.ts`

- [ ] **Step 1 : créer le layout avec des coords initiales raisonnables**

Les valeurs ci-dessous sont des points de départ visibles à l'écran. Elles seront ajustées dans la Task 9 via l'outil de dev. **Important :** pour les emplacements atelier, `left` est déjà exprimé dans le repère du panorama unifié (origine = bord gauche bureau), donc avec `ATELIER_X_SHIFT_VW` (+300) appliqué.

```ts
import type { ChatBaladeurId } from "@/lib/chatBaladeur";

/**
 * Coordonnées des 3 emplacements du chat baladeur dans le panorama
 * unifié. Mêmes conventions que `QG_LAYOUT` / `ATELIER_LAYOUT` :
 * `left` et `width` en vw, `bottom` en pourcentage. Pour les chats
 * atelier, le décalage +300vw (`ATELIER_X_SHIFT_VW`) est déjà inclus
 * dans `left`.
 */
export const CHAT_BALADEUR_LAYOUT: Record<
  ChatBaladeurId,
  { left: number; bottom: number; width: number }
> = {
  "qg-fenetre":      { left: 60,  bottom: 30, width: 6 },
  "atelier-fenetre": { left: 360, bottom: 28, width: 6 },
  "atelier-marche":  { left: 450, bottom: 14, width: 5 },
};
```

- [ ] **Step 2 : commit**

```bash
git add src/components/mobile/qg/chatBaladeurLayout.ts
git commit -m "feat(qg): layout placeholder des 3 emplacements du chat baladeur"
```

---

### Task 4 — Composant `QgChatBaladeur`

**Files:**
- Create : `src/components/mobile/qg/QgChatBaladeur.tsx`

- [ ] **Step 1 : créer le composant**

```tsx
"use client";

import type { CSSProperties } from "react";
import { selectChatBaladeur } from "@/lib/chatBaladeur";
import { CHAT_BALADEUR_LAYOUT } from "./chatBaladeurLayout";
import { useChatBaladeurCoord } from "./dev/QgEditContext";

interface QgChatBaladeurProps {
  jourActuel: number;
  chatSurFauteuil: boolean;
}

const SRC: Record<keyof typeof CHAT_BALADEUR_LAYOUT, string> = {
  "qg-fenetre":      "/qg/chat-baladeur/qg-fenetre.webp",
  "atelier-fenetre": "/qg/chat-baladeur/atelier-fenetre.webp",
  "atelier-marche":  "/qg/chat-baladeur/atelier-marche.webp",
};

export function QgChatBaladeur({ jourActuel, chatSurFauteuil }: QgChatBaladeurProps) {
  const id = selectChatBaladeur(jourActuel, chatSurFauteuil);
  // Hooks doivent toujours être appelés dans le même ordre — on hooke
  // avec un id stable (le premier de la table) puis on guard à la fin.
  const fallbackId = "qg-fenetre" as const;
  const { left, bottom, width } = useChatBaladeurCoord(id ?? fallbackId);

  if (id === null) return null;

  const style: CSSProperties = {
    position: "absolute",
    left: `${left}vw`,
    bottom: `${bottom}%`,
    width: `${width}vw`,
    height: "auto",
    pointerEvents: "none",
    userSelect: "none",
    display: "block",
    zIndex: 2,
  };

  return (
    <img
      src={SRC[id]}
      alt=""
      draggable={false}
      style={style}
      aria-hidden
    />
  );
}
```

Note : `useChatBaladeurCoord` sera créé dans la Task 6. Le composant ne compile pas encore — c'est attendu.

- [ ] **Step 2 : commit (WIP, compilation cassée jusqu'à Task 6)**

```bash
git add src/components/mobile/qg/QgChatBaladeur.tsx
git commit -m "feat(qg): composant QgChatBaladeur (lit selector + layout + overrides)"
```

---

### Task 5 — Généraliser `QgEditContext` aux chats baladeurs

**Files:**
- Modify : `src/components/mobile/qg/dev/QgEditContext.tsx`

- [ ] **Step 1 : remplacer le contenu du fichier**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_LAYOUT } from "../chatBaladeurLayout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";

export type EditableKey = QgObjetKey | ChatBaladeurId;

const CHAT_KEYS = new Set<string>(CHAT_BALADEUR_ORDER);

function isChatKey(key: EditableKey): key is ChatBaladeurId {
  return CHAT_KEYS.has(key);
}

function baseCoord(key: EditableKey): {
  left: number;
  bottom: number;
  width: number;
} {
  if (isChatKey(key)) return CHAT_BALADEUR_LAYOUT[key];
  return QG_LAYOUT.objets[key];
}

export interface ObjetOverride {
  left?: number;
  bottom?: number;
  width?: number;
}

interface QgEditContextValue {
  enabled: boolean;
  overrides: Partial<Record<EditableKey, ObjetOverride>>;
  setOverride: (key: EditableKey, partial: ObjetOverride) => void;
  resetOverride: (key: EditableKey) => void;
  resetAll: () => void;
}

const QgEditContext = createContext<QgEditContextValue | null>(null);

export function QgEditProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [overrides, setOverrides] = useState<
    Partial<Record<EditableKey, ObjetOverride>>
  >({});

  const setOverride = useCallback(
    (key: EditableKey, partial: ObjetOverride) => {
      setOverrides((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? {}), ...partial },
      }));
    },
    [],
  );
  const resetOverride = useCallback((key: EditableKey) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const resetAll = useCallback(() => setOverrides({}), []);

  return (
    <QgEditContext.Provider
      value={{ enabled, overrides, setOverride, resetOverride, resetAll }}
    >
      {children}
    </QgEditContext.Provider>
  );
}

/** Coords effectives (base + override) pour un objet QG. */
export function useQgObjet(key: QgObjetKey): {
  left: number;
  bottom: number;
  width: number;
} {
  return useEditableCoord(key);
}

/** Coords effectives (base + override) pour un chat baladeur. */
export function useChatBaladeurCoord(key: ChatBaladeurId): {
  left: number;
  bottom: number;
  width: number;
} {
  return useEditableCoord(key);
}

function useEditableCoord(key: EditableKey) {
  const base = baseCoord(key);
  const ctx = useContext(QgEditContext);
  const o = ctx?.overrides[key];
  return {
    left: o?.left ?? base.left,
    bottom: o?.bottom ?? base.bottom,
    width: o?.width ?? base.width,
  };
}

export function useQgEditContext(): QgEditContextValue | null {
  return useContext(QgEditContext);
}
```

- [ ] **Step 2 : vérifier la compilation**

```bash
npx tsc --noEmit
```

Attendu : pas d'erreur sur les fichiers de contexte (mais l'overlay/panel n'utilisent pas encore les nouveaux ids — c'est OK).

- [ ] **Step 3 : commit**

```bash
git add src/components/mobile/qg/dev/QgEditContext.tsx
git commit -m "refactor(qg-dev): contexte d'édition généralisé (QG objets + chats baladeurs)"
```

---

### Task 6 — Étendre `QgEditOverlay` + `QgEditPanel`

**Files:**
- Modify : `src/components/mobile/qg/dev/QgEditOverlay.tsx`
- Modify : `src/components/mobile/qg/dev/QgEditPanel.tsx`

- [ ] **Step 1 : remplacer `QgEditOverlay.tsx`**

Deux changements : itère sur `EditableKey[]` (QG objets ∪ chats), et cherche `[data-unified-scene]` au lieu de `[data-qg-scene]`.

```tsx
"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import {
  useQgObjet,
  useChatBaladeurCoord,
  useQgEditContext,
  type EditableKey,
} from "./QgEditContext";

const QG_KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];
const CHAT_KEYS = [...CHAT_BALADEUR_ORDER] as ChatBaladeurId[];
const ALL_KEYS: EditableKey[] = [...QG_KEYS, ...CHAT_KEYS];

function useCoord(key: EditableKey) {
  // CHAT_BALADEUR_ORDER est petit et stable — on peut faire un includes.
  const isChat = (CHAT_BALADEUR_ORDER as readonly string[]).includes(key);
  // Les deux hooks ont la même signature ; on choisit selon la classe de
  // clé en respectant l'ordre des appels (toujours un seul hook actif).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return isChat
    ? useChatBaladeurCoord(key as ChatBaladeurId)
    : useQgObjet(key as QgObjetKey);
}

interface OutlineProps {
  editKey: EditableKey;
}

function ObjetOutline({ editKey }: OutlineProps) {
  const { left, bottom, width } = useCoord(editKey);
  const ctx = useQgEditContext();
  const sceneRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scene = el.closest("[data-unified-scene]") as HTMLElement | null;
    sceneRef.current = scene;
  }, []);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startLeft = useRef(left);
  const startBottom = useRef(bottom);

  const resizing = useRef(false);
  const resizeStartX = useRef(0);
  const startWidth = useRef(width);

  function getSceneHeight(): number {
    return sceneRef.current?.clientHeight ?? window.innerHeight;
  }

  function onBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!ctx) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startLeft.current = left;
    startBottom.current = bottom;
  }

  function onBodyPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current || !ctx) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const vwPx = window.innerWidth / 100;
    const hPx = getSceneHeight() / 100;
    const newLeft = startLeft.current + dx / vwPx;
    const newBottom = startBottom.current - dy / hPx;
    ctx.setOverride(editKey, { left: newLeft, bottom: newBottom });
  }

  function onBodyPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = false;
  }

  function onResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!ctx) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizing.current = true;
    resizeStartX.current = e.clientX;
    startWidth.current = width;
  }

  function onResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing.current || !ctx) return;
    const dx = e.clientX - resizeStartX.current;
    const vwPx = window.innerWidth / 100;
    const newWidth = Math.max(1, startWidth.current + dx / vwPx);
    ctx.setOverride(editKey, { width: newWidth });
  }

  function onResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    resizing.current = false;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        minHeight: "4vh",
        zIndex: 20,
        pointerEvents: "auto",
        touchAction: "none",
      }}
    >
      <div
        onPointerDown={onBodyPointerDown}
        onPointerMove={onBodyPointerMove}
        onPointerUp={onBodyPointerUp}
        style={{
          position: "absolute",
          inset: 0,
          minHeight: "4vh",
          border: "2px dashed var(--brass-500)",
          boxSizing: "border-box",
          cursor: "move",
          userSelect: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 4,
            fontSize: 9,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            background: "rgba(0,0,0,0.55)",
            padding: "1px 3px",
            borderRadius: 2,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {editKey}
        </span>
      </div>

      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        style={{
          position: "absolute",
          bottom: -6,
          right: -6,
          width: 12,
          height: 12,
          background: "var(--brass-500)",
          borderRadius: 2,
          cursor: "se-resize",
          zIndex: 21,
          touchAction: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "calc(100% + 2px)",
          left: 0,
          fontSize: 8,
          fontFamily: "monospace",
          color: "#fff",
          background: "rgba(0,0,0,0.7)",
          padding: "1px 4px",
          borderRadius: 2,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {left.toFixed(1)} / {bottom.toFixed(1)} / {width.toFixed(1)}
      </div>
    </div>
  );
}

export function QgEditOverlay() {
  return (
    <>
      {ALL_KEYS.map((key) => (
        <ObjetOutline key={key} editKey={key} />
      ))}
    </>
  );
}
```

- [ ] **Step 2 : remplacer `QgEditPanel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_LAYOUT } from "../chatBaladeurLayout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import {
  useQgObjet,
  useChatBaladeurCoord,
  useQgEditContext,
  type EditableKey,
} from "./QgEditContext";

const QG_KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];
const CHAT_KEYS = [...CHAT_BALADEUR_ORDER] as ChatBaladeurId[];

function QgRow({ qgKey }: { qgKey: QgObjetKey }) {
  const { left, bottom, width } = useQgObjet(qgKey);
  return <CoordRow name={qgKey} left={left} bottom={bottom} width={width} />;
}

function ChatRow({ chatKey }: { chatKey: ChatBaladeurId }) {
  const { left, bottom, width } = useChatBaladeurCoord(chatKey);
  return <CoordRow name={chatKey} left={left} bottom={bottom} width={width} />;
}

function CoordRow({
  name,
  left,
  bottom,
  width,
}: {
  name: string;
  left: number;
  bottom: number;
  width: number;
}) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, color: "#e8d5a3" }}>
      <span style={{ color: "#a8c4e0" }}>{name}</span>
      {": { left: "}
      <span style={{ color: "#b8e0a8" }}>{left.toFixed(1)}</span>
      {", bottom: "}
      <span style={{ color: "#b8e0a8" }}>{bottom.toFixed(1)}</span>
      {", width: "}
      <span style={{ color: "#b8e0a8" }}>{width.toFixed(1)}</span>
      {" },"}
    </div>
  );
}

export function QgEditPanel() {
  const ctx = useQgEditContext();
  const [collapsed, setCollapsed] = useState(false);

  function effective(key: EditableKey) {
    const isChat = (CHAT_BALADEUR_ORDER as readonly string[]).includes(key);
    const base = isChat
      ? CHAT_BALADEUR_LAYOUT[key as ChatBaladeurId]
      : QG_LAYOUT.objets[key as QgObjetKey];
    const o = ctx?.overrides[key];
    return {
      left: o?.left ?? base.left,
      bottom: o?.bottom ?? base.bottom,
      width: o?.width ?? base.width,
    };
  }

  function handleCopy() {
    const qg = QG_KEYS.map((k) => {
      const e = effective(k);
      return `    ${k}: { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
    });
    const chat = CHAT_KEYS.map((k) => {
      const e = effective(k);
      return `  "${k}": { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
    });
    const snippet =
      "// QG objets\n" +
      qg.join("\n") +
      "\n\n// Chat baladeur\n" +
      chat.join("\n");
    navigator.clipboard.writeText(snippet).catch(() => {
      /* clipboard indisponible en contexte non sécurisé : on ignore */
    });
  }

  function handleReset() {
    ctx?.resetAll();
  }

  if (collapsed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 100,
          background: "rgba(20, 16, 10, 0.9)",
          border: "1px solid var(--brass-500)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--brass-500)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed(false)}
      >
        QG edit mode
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 100,
        background: "rgba(20, 16, 10, 0.92)",
        border: "1px solid var(--brass-500)",
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 280,
        maxHeight: "70vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            fontWeight: "bold",
            letterSpacing: "0.08em",
          }}
        >
          QG edit mode
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--brass-500)",
            cursor: "pointer",
            fontSize: 13,
            padding: "0 2px",
            lineHeight: 1,
          }}
          aria-label="Replier"
        >
          ✕
        </button>
      </div>

      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          borderRadius: 4,
          padding: "6px 8px",
          marginBottom: 8,
        }}
      >
        <div style={{ color: "#8aa", fontSize: 10, marginBottom: 4 }}>// QG objets</div>
        {QG_KEYS.map((k) => (
          <QgRow key={k} qgKey={k} />
        ))}
        <div style={{ color: "#8aa", fontSize: 10, margin: "6px 0 4px" }}>// Chat baladeur</div>
        {CHAT_KEYS.map((k) => (
          <ChatRow key={k} chatKey={k} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            background: "var(--brass-500)",
            border: "none",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#1a1208",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Copier
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid rgba(168,120,60,0.5)",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : commit**

```bash
git add src/components/mobile/qg/dev/QgEditOverlay.tsx src/components/mobile/qg/dev/QgEditPanel.tsx
git commit -m "feat(qg-dev): overlay + panneau étendus aux 3 chats baladeurs"
```

---

### Task 7 — Monter le composant `QgChatBaladeur` dans le panorama unifié

**Files:**
- Modify : `src/app/(panorama)/layout.tsx`

- [ ] **Step 1 : ajouter l'import en haut du fichier (groupé avec les autres `QgX`)**

Localiser le bloc d'imports `QgX` (lignes ~24-31) et ajouter à la fin :

```ts
import { QgChatBaladeur } from "@/components/mobile/qg/QgChatBaladeur";
```

- [ ] **Step 2 : rendre `QgChatBaladeur` à l'intérieur de `UnifiedPanorama`**

Localiser le bloc qui rend les hotspots atelier (le `<div>` `style={{ position: "absolute", left: ${ATELIER_X_SHIFT_VW}vw, ...}}` aux lignes ~498-526). **Juste après ce `<div>` fermant**, et **toujours à l'intérieur de `<UnifiedPanorama>`**, ajouter :

```tsx
            <QgChatBaladeur
              jourActuel={state.jourActuel}
              chatSurFauteuil={state.chatSurFauteuil}
            />
```

Note : on ne le met PAS dans la branche `showQgZone(2)` (virtualisation) — le chat baladeur peut être en zone atelier, donc on le rend toujours (sa logique interne renvoie `null` si non applicable).

- [ ] **Step 3 : vérifier que TypeScript et la compilation passent**

```bash
npx tsc --noEmit
npm run build
```

Attendu : pas d'erreur de type, build OK.

- [ ] **Step 4 : commit**

```bash
git add src/app/(panorama)/layout.tsx
git commit -m "feat(qg): monte le chat baladeur dans le panorama unifié"
```

---

### Task 8 — Remonter l'outil de dev dans le panorama unifié

**Files:**
- Modify : `src/app/(panorama)/layout.tsx`
- Modify : `src/components/mobile/panorama/UnifiedPanorama.tsx`

- [ ] **Step 1 : ajouter les imports dans `layout.tsx`**

À côté des imports `Qg*` :

```ts
import { QgEditProvider } from "@/components/mobile/qg/dev/QgEditContext";
```

- [ ] **Step 2 : enrober le `<MobileLayout>` avec `QgEditProvider`**

Localiser le `return (` de `PanoramaInner` (ligne ~420). Le contenu actuel commence par `<MobileLayout ...>`. Remplacer le JSX racine par :

```tsx
  const editEnabled = process.env.NEXT_PUBLIC_QG_EDIT === "1";

  return (
    <QgEditProvider enabled={editEnabled}>
      <MobileLayout
        header={<MobileHeader jour={state.jourActuel} budget={state.budget} />}
        fillContent
      >
        {/* ... contenu existant inchangé jusqu'à la fin de </MobileLayout> ... */}
      </MobileLayout>

      {/* Sheets et autres enfants existants restent ici, à l'intérieur du provider */}
      {/* ... PorteSheet, PasserConfirmSheet, etc. ... */}
    </QgEditProvider>
  );
```

Concrètement : déclarer `editEnabled` juste avant le `return`, puis ouvrir `<QgEditProvider enabled={editEnabled}>` en racine du JSX, fermer `</QgEditProvider>` tout à la fin (après le dernier `<GazetteSheet ...>` fermant). Indenter en conséquence.

- [ ] **Step 3 : afficher le `QgEditPanel` quand `editEnabled`**

Toujours dans `layout.tsx`, juste avant le `</QgEditProvider>` final, ajouter :

```tsx
      {editEnabled && <QgEditPanel />}
```

Avec l'import correspondant en haut du fichier :

```ts
import { QgEditPanel } from "@/components/mobile/qg/dev/QgEditPanel";
```

- [ ] **Step 4 : afficher le `QgEditOverlay` à l'intérieur du `UnifiedPanorama`**

Dans `UnifiedPanorama.tsx`, juste après la ligne `<div style={objectsLayer}>{children}</div>` (ligne ~215), insérer :

```tsx
        {children}
        <QgEditOverlayIfEnabled />
```

Et créer en bas du fichier (après la fonction principale) :

```tsx
function QgEditOverlayIfEnabled() {
  if (process.env.NEXT_PUBLIC_QG_EDIT !== "1") return null;
  // import dynamique pour éviter de charger les deps de dev en prod
  // — Next compile l'expression côté serveur, ça reste tree-shakable
  // si la variable n'est pas définie au build.
  const { QgEditOverlay } = require("../qg/dev/QgEditOverlay") as typeof import("../qg/dev/QgEditOverlay");
  return <QgEditOverlay />;
}
```

Ajouter `"use client";` est déjà en tête de fichier (vérifier).

Note : dans Next 16, `require` synchrone dans un composant client compile en lazy load. Si le linter rouspète, remplacer par un `import` statique en haut — le tree-shaking de Next éliminera le code mort si `NEXT_PUBLIC_QG_EDIT` n'est pas défini au build, car c'est une string littérale.

**Variante simple (préférée si le `require` pose souci) :** import statique + condition runtime :

```tsx
// en haut de UnifiedPanorama.tsx
import { QgEditOverlay } from "../qg/dev/QgEditOverlay";

// dans le JSX, après {children}
{process.env.NEXT_PUBLIC_QG_EDIT === "1" && <QgEditOverlay />}
```

C'est ~5 Ko de code dev dans le bundle prod, négligeable. Aller sur cette variante.

- [ ] **Step 5 : sanity-check compilation**

```bash
npx tsc --noEmit
npm run build
```

Attendu : build OK. Si tu veux activer le panel et l'overlay, relancer en dev avec :

```bash
NEXT_PUBLIC_QG_EDIT=1 npm run dev
```

Tu dois voir un cadre en pointillés autour de chaque objet QG + chaque chat baladeur, et le panneau « QG edit mode » en bas à droite.

- [ ] **Step 6 : commit**

```bash
git add src/app/(panorama)/layout.tsx src/components/mobile/panorama/UnifiedPanorama.tsx
git commit -m "feat(qg-dev): remonte l'outil de dev sur le panorama unifié (gated NEXT_PUBLIC_QG_EDIT)"
```

---

### Task 9 — Vérification fonctionnelle (sans positionnement final)

**Files :** aucune modif.

- [ ] **Step 1 : lancer la suite complète de tests**

```bash
npm run test:run
```

Attendu : tous les tests passent (au moins ceux des Tasks précédentes + les 297 tests existants).

- [ ] **Step 2 : lancer le dev server sans l'edit mode**

```bash
npm run dev
```

Ouvrir `/bureau` sur mobile (devtools). Le chat doit apparaître à l'un des 3 emplacements placeholders (jour 1 → atelier-fenetre, jour 0 → qg-fenetre selon `jourActuel` réel). Vérifier que :
- En présence de `chatSurFauteuil`, aucun chat baladeur n'apparaît.
- Sans `chatSurFauteuil`, un chat est visible (même si la position est encore placeholder).
- Aucun clic sur le chat ne fait quoi que ce soit (pointer-events: none).

Note : aucun changement de code à ce stade, juste une vérification visuelle. Si quelque chose cloche, ouvrir un debug avant Task 10.

---

### Task 10 — Session de placement manuelle (utilisateur)

**Files :** aucune (cette étape est interactive, le développeur AI attend).

- [ ] **Step 1 : lancer le dev server avec l'outil de dev**

```bash
NEXT_PUBLIC_QG_EDIT=1 npm run dev
```

- [ ] **Step 2 : positionner les 3 chats**

Sur le panorama, drag les 3 cadres `qg-fenetre`, `atelier-fenetre`, `atelier-marche` jusqu'aux emplacements souhaités. Ajuster la taille via la poignée bas-droite. Quand satisfait, cliquer **Copier** dans le panneau. Le presse-papier contient le snippet pour les chats.

- [ ] **Step 3 : transmettre les coords**

Coller dans le chat avec moi (Claude) le bloc `// Chat baladeur` du snippet copié. Je passe à la Task 11.

---

### Task 11 — Hardcoder les coords définitives

**Files:**
- Modify : `src/components/mobile/qg/chatBaladeurLayout.ts`

- [ ] **Step 1 : remplacer les coords placeholder**

Reprendre le snippet fourni à la Task 10 et l'injecter dans `CHAT_BALADEUR_LAYOUT`. Exemple (valeurs à remplacer) :

```ts
export const CHAT_BALADEUR_LAYOUT: Record<
  ChatBaladeurId,
  { left: number; bottom: number; width: number }
> = {
  "qg-fenetre":      { left: 73.4, bottom: 41.2, width: 5.8 },
  "atelier-fenetre": { left: 378.1, bottom: 35.6, width: 5.4 },
  "atelier-marche":  { left: 442.7, bottom: 12.8, width: 5.1 },
};
```

- [ ] **Step 2 : vérifier visuellement sans l'edit mode**

```bash
npm run dev
```

(Sans `NEXT_PUBLIC_QG_EDIT=1`.) Naviguer dans le panorama, vérifier que les 3 chats apparaissent au bon endroit selon `jourActuel`. Pour tester rapidement les 3 : passer un jour, observer le chat, recommencer.

- [ ] **Step 3 : commit**

```bash
git add src/components/mobile/qg/chatBaladeurLayout.ts
git commit -m "feat(qg): coords finales des 3 chats baladeurs"
```

---

### Task 12 — Lint + tests final, push

**Files :** aucune.

- [ ] **Step 1 : lint**

```bash
npm run lint
```

Attendu : pas d'erreur. Si warnings sur `require` ou hooks dans `useCoord`, les justifier ou réécrire proprement.

- [ ] **Step 2 : suite de tests**

```bash
npm run test:run
```

Attendu : 100 % vert.

- [ ] **Step 3 : build de prod**

```bash
npm run build
```

Attendu : build OK, pas d'erreur de type.

- [ ] **Step 4 (optionnel) : push de la branche**

```bash
git push -u origin feat/qg-decor-ludique
```

(Seulement si l'utilisateur le demande explicitement.)

---

## Notes d'exécution

- **`pointer-events: none` est essentiel.** Le chat baladeur ne doit jamais intercepter les hotspots existants (gramophone, fauteuil, hotspots atelier).
- **`zIndex: 2`** = même calque que les objets QG. Si un chat se retrouve en dessous d'un objet interactif, c'est OK visuellement (le chat est décoratif).
- **Pas d'audio.** Aucune intégration avec `startCatPurr` / `stopCatPurr` — purement décoratif (choix A confirmé).
- **Aucune migration de save.** `selectChatBaladeur` est dérivé de `jourActuel` qui existe déjà.
- **L'outil de dev reste branché en prod** (mais inerte sans `NEXT_PUBLIC_QG_EDIT=1`). Coût : ~5 Ko de JS mort dans le bundle, acceptable.
