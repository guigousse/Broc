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
const LS_ENABLED_KEY = "broc.cadre-edit.enabled";

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
    const q = params.get("cadreedit");
    if (q === "1") {
      try {
        window.localStorage.setItem(LS_ENABLED_KEY, "1");
      } catch {
        // ignore
      }
      setEnabled(true);
      return;
    }
    if (q === "0") {
      try {
        window.localStorage.removeItem(LS_ENABLED_KEY);
      } catch {
        // ignore
      }
      setEnabled(false);
      return;
    }
    try {
      if (window.localStorage.getItem(LS_ENABLED_KEY) === "1") setEnabled(true);
    } catch {
      // ignore
    }
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

  return (
    <Ctx.Provider value={value}>
      {children}
      {enabled && (
        <div
          style={{
            position: "fixed",
            top: "calc(var(--safe-top, 0px) + var(--mobile-header-h, 0px))",
            left: 0,
            right: 0,
            background: "rgba(220,170,60,0.92)",
            color: "var(--forest-800)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            padding: "4px 12px",
            textAlign: "center",
            zIndex: 101,
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          }}
        >
          🛠 Cadre edit mode actif — `?cadreedit=0` pour quitter
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Fusionne un FrameCoord avec son override courant si présent. */
export function applyOverride(coord: FrameCoord, override?: FrameOverride): FrameCoord {
  if (!override) return coord;
  return { ...coord, ...override };
}
