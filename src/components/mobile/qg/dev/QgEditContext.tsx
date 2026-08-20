"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_LAYOUT } from "../chatBaladeurLayout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import { BAZAR_LAYOUT, type BazarObjetKey } from "@/components/bazar/bazarLayout";

const STORAGE_KEY = "broc.qg-edit.overrides";
const ACTIVE_STORAGE_KEY = "broc.qg-edit.active";

export type EditableKey = QgObjetKey | ChatBaladeurId | BazarObjetKey;

const CHAT_KEYS = new Set<string>(CHAT_BALADEUR_ORDER);
const BAZAR_KEYS = new Set<string>(Object.keys(BAZAR_LAYOUT.objets));

function isChatKey(key: EditableKey): key is ChatBaladeurId {
  return CHAT_KEYS.has(key);
}

function isBazarKey(key: EditableKey): key is BazarObjetKey {
  return BAZAR_KEYS.has(key);
}

/** Famille d'une clé éditable : chaque famille a son propre dictionnaire de base. */
export type FamilleEditable = "qg" | "chat" | "bazar";

export function familleEditable(key: EditableKey): FamilleEditable {
  if (isChatKey(key)) return "chat";
  if (isBazarKey(key)) return "bazar";
  return "qg";
}

/**
 * Coordonnée AUTHORÉE d'une clé, sans override. Exportée parce que le panneau
 * de calage en a besoin pour composer son extrait à recopier : il en avait sa
 * propre copie, qui ne connaissait que le QG et le chat — sur une clé du Bazar
 * elle lisait `QG_LAYOUT.objets[cle]` → `undefined.left`, donc une exception.
 */
export function coordBase(key: EditableKey): {
  left: number;
  bottom: number;
  width: number;
} {
  if (isChatKey(key)) return CHAT_BALADEUR_LAYOUT[key];
  if (isBazarKey(key)) return BAZAR_LAYOUT.objets[key];
  return QG_LAYOUT.objets[key as QgObjetKey];
}

export interface ObjetOverride {
  left?: number;
  bottom?: number;
  width?: number;
}

interface QgEditContextValue {
  enabled: boolean;
  /** Toggle runtime : quand false, overlay/preview-all sont masqués. */
  active: boolean;
  setActive: (a: boolean) => void;
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
  // Init synchrone depuis localStorage en mode édition — empêche le reset
  // visuel sur les navigations (re-render de PanoramaInner).
  const [overrides, setOverrides] = useState<
    Partial<Record<EditableKey, ObjetOverride>>
  >(() => {
    if (!enabled || typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Partial<Record<EditableKey, ObjetOverride>>;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      /* ignore */
    }
  }, [overrides, enabled]);

  // Toggle « actif » : par défaut true à l'entrée en mode édition.
  const [active, setActiveState] = useState<boolean>(() => {
    if (!enabled || typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
      return raw === null ? true : raw === "1";
    } catch {
      return true;
    }
  });
  const setActive = useCallback((a: boolean) => {
    setActiveState(a);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ACTIVE_STORAGE_KEY, a ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
  }, []);

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
  const resetAll = useCallback(() => {
    setOverrides({});
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  return (
    <QgEditContext.Provider
      value={{
        enabled,
        active,
        setActive,
        overrides,
        setOverride,
        resetOverride,
        resetAll,
      }}
    >
      {children}
    </QgEditContext.Provider>
  );
}

/** Coords effectives (base + override) pour un objet éditable (QG, chat, Bazar…). */
export function useQgObjet(key: EditableKey): {
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
  const base = coordBase(key);
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
