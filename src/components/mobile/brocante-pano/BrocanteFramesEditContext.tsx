"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FrameCoord } from "./brocantePanoramaLayout";

export type FrameOverride = Partial<
  Pick<FrameCoord, "left" | "top" | "width" | "height" | "cadreIndex">
>;

interface EditCtx {
  enabled: boolean;
  overrides: Record<string, FrameOverride>;
  setOverride: (id: string, patch: FrameOverride) => void;
  resetOverride: (id: string) => void;
  resetAll: () => void;
}

const LS_KEY = "broc.cadre-edit.overrides";

const Ctx = createContext<EditCtx>({
  enabled: false,
  overrides: {},
  setOverride: () => {},
  resetOverride: () => {},
  resetAll: () => {},
});

export function useBrocanteFramesEdit() {
  return useContext(Ctx);
}

/**
 * Active si l'URL contient `?cadreedit=1` au mount. Persiste les overrides
 * de coords/cadre en localStorage pour survivre aux refreshes pendant
 * l'édition.
 */
export function BrocanteFramesEditProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, FrameOverride>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("cadreedit") === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(overrides));
    } catch {
      // ignore
    }
  }, [overrides]);

  const setOverride = useCallback((id: string, patch: FrameOverride) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const resetOverride = useCallback((id: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setOverrides({}), []);

  const value = useMemo<EditCtx>(
    () => ({ enabled, overrides, setOverride, resetOverride, resetAll }),
    [enabled, overrides, setOverride, resetOverride, resetAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Fusionne un FrameCoord avec son override courant si présent. */
export function applyOverride(coord: FrameCoord, override?: FrameOverride): FrameCoord {
  if (!override) return coord;
  return { ...coord, ...override };
}
