"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPE } from "react";
import type { BrocanteTier } from "@/types/game";
import { SCENE_FRAMES, type FrameCoord } from "./brocantePanoramaLayout";
import { applyOverride, useBrocanteFramesEdit } from "./BrocanteFramesEditContext";

interface EditOverlayProps {
  tier: BrocanteTier;
  /** Référence vers le `<section>` de la scène, utilisée pour convertir px → %. */
  sceneRef: React.RefObject<HTMLElement | null>;
}

type Op =
  | { kind: "move"; id: string; startX: number; startY: number; baseLeft: number; baseTop: number }
  | { kind: "resize"; id: string; startX: number; startY: number; baseW: number; baseH: number; baseLeft: number; baseTop: number; corner: "tl" | "tr" | "bl" | "br" };

function pctToNum(v: string) {
  return Number.parseFloat(v.replace("%", ""));
}
function numToPct(v: number) {
  return `${v.toFixed(2)}%`;
}

const handleBase: CSSProperties = {
  position: "absolute",
  width: 14,
  height: 14,
  background: "var(--brass-300)",
  border: "1.5px solid var(--forest-800)",
  borderRadius: 2,
  boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
  cursor: "nwse-resize",
  zIndex: 60,
  touchAction: "none",
};

const moveHandleStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(220,170,60,0.08)",
  outline: "1.5px dashed var(--brass-300)",
  outlineOffset: -2,
  cursor: "move",
  zIndex: 55,
  touchAction: "none",
};

const labelStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: -22,
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.08em",
  padding: "2px 6px",
  borderRadius: 2,
  pointerEvents: "none",
  zIndex: 61,
  whiteSpace: "nowrap",
};

const panelStyle: CSSProperties = {
  position: "fixed",
  right: 12,
  bottom: "calc(var(--mobile-tabbar-h, 0px) + var(--safe-bottom, 0px) + 12px)",
  background: "var(--forest-800)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "10px 12px",
  borderRadius: 6,
  boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
  border: "1px solid var(--brass-500)",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxWidth: 280,
};

const btnStyle: CSSProperties = {
  background: "var(--brass-500)",
  color: "var(--forest-800)",
  border: "1px solid var(--brass-700)",
  borderRadius: 3,
  padding: "5px 10px",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontWeight: 700,
};

export function BrocanteFramesEditOverlay({ tier, sceneRef }: EditOverlayProps) {
  const { enabled, overrides, setOverride, resetAll } = useBrocanteFramesEdit();
  const [op, setOp] = useState<Op | null>(null);
  const [copied, setCopied] = useState(false);
  const opRef = useRef<Op | null>(null);
  opRef.current = op;

  // Listeners globaux pour pointer move/up — capturent même si la souris
  // quitte le rectangle d'origine.
  useEffect(() => {
    if (!enabled || !op) return;
    const onMove = (e: PointerEvent) => {
      const current = opRef.current;
      if (!current) return;
      const scene = sceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const dxPct = ((e.clientX - current.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - current.startY) / rect.height) * 100;
      if (current.kind === "move") {
        setOverride(current.id, {
          left: numToPct(Math.max(0, current.baseLeft + dxPct)),
          top: numToPct(Math.max(0, current.baseTop + dyPct)),
        });
      } else {
        // resize : selon coin, on déplace + agrandit
        const c = current;
        let newLeft = c.baseLeft;
        let newTop = c.baseTop;
        let newW = c.baseW;
        let newH = c.baseH;
        if (c.corner === "br") {
          newW = Math.max(2, c.baseW + dxPct);
          newH = Math.max(2, c.baseH + dyPct);
        } else if (c.corner === "tr") {
          newW = Math.max(2, c.baseW + dxPct);
          newH = Math.max(2, c.baseH - dyPct);
          newTop = c.baseTop + dyPct;
        } else if (c.corner === "bl") {
          newW = Math.max(2, c.baseW - dxPct);
          newH = Math.max(2, c.baseH + dyPct);
          newLeft = c.baseLeft + dxPct;
        } else if (c.corner === "tl") {
          newW = Math.max(2, c.baseW - dxPct);
          newH = Math.max(2, c.baseH - dyPct);
          newLeft = c.baseLeft + dxPct;
          newTop = c.baseTop + dyPct;
        }
        setOverride(current.id, {
          left: numToPct(newLeft),
          top: numToPct(newTop),
          width: numToPct(newW),
          height: numToPct(newH),
        });
      }
    };
    const onUp = () => setOp(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled, op, sceneRef, setOverride]);

  if (!enabled) return null;

  const frames = SCENE_FRAMES[tier];

  const exportJson = () => {
    const result = frames.map((f) => applyOverride(f, overrides[f.id]));
    const text = JSON.stringify(result, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    } else {
      console.log(text);
    }
  };

  return (
    <>
      {frames.map((coord) => {
        const merged = applyOverride(coord, overrides[coord.id]);
        const rect: CSSProperties = {
          position: "absolute",
          left: merged.left,
          top: merged.top,
          width: merged.width,
          height: merged.height,
          pointerEvents: "none",
          zIndex: 50,
        };
        const onMoveStart = (e: RPE<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
          setOp({
            kind: "move",
            id: coord.id,
            startX: e.clientX,
            startY: e.clientY,
            baseLeft: pctToNum(merged.left),
            baseTop: pctToNum(merged.top),
          });
        };
        const onResizeStart = (corner: "tl" | "tr" | "bl" | "br") => (
          e: RPE<HTMLDivElement>,
        ) => {
          e.preventDefault();
          e.stopPropagation();
          setOp({
            kind: "resize",
            id: coord.id,
            startX: e.clientX,
            startY: e.clientY,
            baseLeft: pctToNum(merged.left),
            baseTop: pctToNum(merged.top),
            baseW: pctToNum(merged.width),
            baseH: pctToNum(merged.height),
            corner,
          });
        };
        return (
          <div key={coord.id} style={rect}>
            <div style={labelStyle}>
              {coord.id} · {merged.left} / {merged.top} · {merged.width} × {merged.height}
            </div>
            <div style={moveHandleStyle} onPointerDown={onMoveStart} aria-label={`Déplacer ${coord.id}`} />
            <div
              style={{ ...handleBase, left: -7, top: -7, cursor: "nwse-resize" }}
              onPointerDown={onResizeStart("tl")}
              aria-label={`Resize ${coord.id} TL`}
            />
            <div
              style={{ ...handleBase, right: -7, top: -7, cursor: "nesw-resize" }}
              onPointerDown={onResizeStart("tr")}
              aria-label={`Resize ${coord.id} TR`}
            />
            <div
              style={{ ...handleBase, left: -7, bottom: -7, cursor: "nesw-resize" }}
              onPointerDown={onResizeStart("bl")}
              aria-label={`Resize ${coord.id} BL`}
            />
            <div
              style={{ ...handleBase, right: -7, bottom: -7, cursor: "nwse-resize" }}
              onPointerDown={onResizeStart("br")}
              aria-label={`Resize ${coord.id} BR`}
            />
          </div>
        );
      })}
      <div style={panelStyle}>
        <div style={{ fontWeight: 700 }}>Cadres — tier {tier}</div>
        <div style={{ color: "var(--brass-700)" }}>
          Drag pour déplacer · Coins pour redimensionner
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={btnStyle} onClick={exportJson}>
            {copied ? "✓ Copié" : "Copier JSON"}
          </button>
          <button
            type="button"
            style={{ ...btnStyle, background: "transparent", color: "var(--brass-300)" }}
            onClick={() => {
              if (confirm("Reset tous les overrides ?")) resetAll();
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
