"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hauteur max en % du viewport. Défaut 88. */
  maxHeightPct?: number;
  /**
   * Décoration positionnée absolu au-dessus du bord supérieur de la sheet.
   * Utile pour qu'un personnage / avatar "sorte" du cadre vers le haut.
   * Quand fourni, le titre et le séparateur d'en-tête sont masqués et seul
   * le bouton Fermer reste accessible en haut à droite.
   */
  topDecoration?: ReactNode;
}

const scrimStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.45)",
  zIndex: 40,
  animation: "broc-fade-in 160ms ease",
};

const sheetWrap = (maxHeightPct: number): CSSProperties => ({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 41,
  background: "var(--paper-200)",
  borderTop: "2px solid var(--forest-800)",
  borderRadius: "14px 14px 0 0",
  boxShadow: "0 -6px 18px rgba(40,25,5,0.20)",
  maxHeight: `${maxHeightPct}%`,
  display: "flex",
  flexDirection: "column",
  paddingBottom: "calc(16px + var(--safe-bottom))",
  animation: "broc-slide-up 200ms ease",
  touchAction: "none",
});

const handleStyle: CSSProperties = {
  width: 40,
  height: 4,
  background: "var(--paper-500)",
  borderRadius: 2,
  margin: "8px auto 6px",
  cursor: "grab",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 16px 8px",
  borderBottom: "1px solid var(--brass-500)",
};

// Seuils de fermeture par swipe vers le bas.
const DISMISS_RATIO = 0.3; // 30% de la hauteur
const DISMISS_VELOCITY = 0.5; // px/ms

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeightPct = 88,
  topDecoration,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    startT: number;
    pointerId: number;
    sheetH: number;
  } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Reset translateY quand on rouvre.
  useEffect(() => {
    if (open) setDragY(0);
  }, [open]);

  if (!open) return null;

  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    if (!sheetRef.current) return;
    dragRef.current = {
      startY: e.clientY,
      startT: performance.now(),
      pointerId: e.pointerId,
      sheetH: sheetRef.current.getBoundingClientRect().height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveDrag(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = Math.max(0, e.clientY - d.startY);
    setDragY(dy);
  }

  function endDrag(e: ReactPointerEvent<HTMLElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = Math.max(0, e.clientY - d.startY);
    const dt = performance.now() - d.startT;
    const velocity = dt > 0 ? dy / dt : 0;
    const ratio = d.sheetH > 0 ? dy / d.sheetH : 0;
    dragRef.current = null;

    if (ratio > DISMISS_RATIO || velocity > DISMISS_VELOCITY) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  const dragStyle: CSSProperties = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: dragRef.current ? "none" : "transform 200ms ease",
    opacity: dragY > 0 ? Math.max(0.4, 1 - dragY / 600) : 1,
  };

  return (
    <>
      <div style={scrimStyle} onClick={onClose} aria-hidden />
      <div
        ref={sheetRef}
        style={{ ...sheetWrap(maxHeightPct), ...dragStyle }}
        role="dialog"
        aria-modal="true"
      >
        {topDecoration ? (
          <div style={topDecorationStyle}>{topDecoration}</div>
        ) : (
          <>
            <div
              style={handleStyle}
              aria-hidden
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
            <div
              style={headerStyle}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--forest-800)",
                }}
              >
                {title ?? ""}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--brass-700)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                Fermer ✕
              </button>
            </div>
          </>
        )}
        <div
          style={{
            overflowY: "auto",
            padding: topDecoration ? 0 : "12px 16px",
            touchAction: "pan-y",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

const topDecorationStyle: CSSProperties = {
  position: "absolute",
  top: -138,
  left: 16,
  right: 16,
  zIndex: 2,
  pointerEvents: "none",
};
