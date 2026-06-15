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
import {
  STOCKAGE_BOX_ORDER,
  STOCKAGE_BOXES_LAYOUT,
  type StockageBoxKey,
} from "../stockageBoxesLayout";
import {
  ATELIER_SLOT_LAYOUT,
  ATELIER_SLOT_ORDER,
  type AtelierSlotKey,
} from "@/components/mobile/atelier-pano/slotsLayout";

const STORAGE_KEY = "broc.qg-edit.overrides";
const ACTIVE_STORAGE_KEY = "broc.qg-edit.active";

export type EditableKey =
  | QgObjetKey
  | ChatBaladeurId
  | StockageBoxKey
  | AtelierSlotKey;

const CHAT_KEYS = new Set<string>(CHAT_BALADEUR_ORDER);
const BOX_KEYS = new Set<string>(STOCKAGE_BOX_ORDER);
const SLOT_KEYS = new Set<string>(ATELIER_SLOT_ORDER);

function isChatKey(key: EditableKey): key is ChatBaladeurId {
  return CHAT_KEYS.has(key);
}

function isBoxKey(key: EditableKey): key is StockageBoxKey {
  return BOX_KEYS.has(key);
}

function isSlotKey(key: EditableKey): key is AtelierSlotKey {
  return SLOT_KEYS.has(key);
}

function baseCoord(key: EditableKey): {
  left: number;
  bottom: number;
  width: number;
} {
  if (isBoxKey(key)) {
    const b = STOCKAGE_BOXES_LAYOUT[key];
    return { left: b.left, bottom: b.bottom, width: b.width };
  }
  if (isSlotKey(key)) return ATELIER_SLOT_LAYOUT[key];
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

/** Coords effectives (base + override) pour un carton de stockage. */
export function useStockageBoxCoord(key: StockageBoxKey): {
  left: number;
  bottom: number;
  width: number;
} {
  return useEditableCoord(key);
}

/** Coords effectives (base + override) pour un slot de restauration atelier. */
export function useAtelierSlotCoord(key: AtelierSlotKey): {
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
