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
