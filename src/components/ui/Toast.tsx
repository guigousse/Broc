"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ToastType = "succes" | "info" | "erreur";

interface ToastOptions {
  type?: ToastType;
}

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DUREE_MS = 2500;

const ACCENT: Record<ToastType, string> = {
  succes: "var(--brass-500)",
  info: "var(--brass-500)",
  erreur: "var(--vermillion-600)",
};

const bannerStyle = (type: ToastType): CSSProperties => ({
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: "calc(var(--tab-h) + var(--safe-bottom) + 8px)",
  zIndex: 200,
  minHeight: 40,
  maxWidth: "min(420px, calc(100vw - 24px))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "8px 18px",
  boxSizing: "border-box",
  background: "var(--forest-800)",
  border: `1px solid ${ACCENT[type]}`,
  boxShadow:
    "inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-700), 0 6px 16px rgba(15,31,24,0.4)",
  color: "var(--paper-100)",
  fontFamily: "var(--font-display)",
  fontSize: 11.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textAlign: "center",
  lineHeight: 1.35,
  animation: "broc-toast-in 220ms ease-out",
  pointerEvents: "none",
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastActif, setToastActif] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, opts?: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    idRef.current += 1;
    setToastActif({
      id: idRef.current,
      message,
      type: opts?.type ?? "info",
    });
    timerRef.current = setTimeout(() => {
      setToastActif(null);
      timerRef.current = null;
    }, TOAST_DUREE_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Conteneur toujours présent pour que les lecteurs d'écran captent
          les annonces (aria-live exige un nœud monté en amont). */}
      <div role="status" aria-live="polite">
        {toastActif && (
          <div key={toastActif.id} style={bannerStyle(toastActif.type)}>
            {toastActif.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé sous <ToastProvider>.");
  }
  return ctx;
}

const NOOP_TOAST: ToastContextValue = { toast: () => {} };

/**
 * Variante non-bloquante : retourne un toast no-op si aucun `ToastProvider`
 * n'est présent (utile pour les composants/contextes qui peuvent vivre hors
 * du provider, ex. tests unitaires) au lieu de lever une erreur.
 */
export function useToastSafe(): ToastContextValue {
  return useContext(ToastContext) ?? NOOP_TOAST;
}
