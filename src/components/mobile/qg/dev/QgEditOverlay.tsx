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
