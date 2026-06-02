"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";

export interface QgObjetOverride {
  left?: number;
  bottom?: number;
  width?: number;
}

interface QgEditContextValue {
  enabled: boolean;
  overrides: Partial<Record<QgObjetKey, QgObjetOverride>>;
  setOverride: (key: QgObjetKey, partial: QgObjetOverride) => void;
  resetOverride: (key: QgObjetKey) => void;
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
    Partial<Record<QgObjetKey, QgObjetOverride>>
  >({});

  const setOverride = useCallback(
    (key: QgObjetKey, partial: QgObjetOverride) => {
      setOverrides((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? {}), ...partial },
      }));
    },
    [],
  );
  const resetOverride = useCallback((key: QgObjetKey) => {
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

/** Returns the effective coordinates (base + override) for one object. */
export function useQgObjet(key: QgObjetKey): {
  left: number;
  bottom: number;
  width: number;
} {
  const base = QG_LAYOUT.objets[key];
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
