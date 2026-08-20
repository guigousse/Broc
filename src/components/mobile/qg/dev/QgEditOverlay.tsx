"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import { type BazarObjetKey } from "@/components/bazar/bazarLayout";
import {
  useQgObjet,
  useChatBaladeurCoord,
  useQgEditContext,
  familleEditable,
  type EditableKey,
} from "./QgEditContext";

const QG_KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];
const CHAT_KEYS = [...CHAT_BALADEUR_ORDER] as ChatBaladeurId[];
const ALL_KEYS: EditableKey[] = [...QG_KEYS, ...CHAT_KEYS];

interface OutlineProps {
  editKey: EditableKey;
}

/**
 * Dispatch par COMPOSANT (et non par hook) : chaque famille de clé a son
 * wrapper qui appelle SON hook inconditionnellement puis rend le corps
 * partagé avec la coordonnée en prop — conforme aux rules-of-hooks
 * (l'ancien `useCoord` dispatchait des hooks conditionnellement).
 *
 * La FORME du cadre descend elle aussi par famille, en prop, pas en hook :
 * le Bazar pose ses articles dans une case CARRÉE (`ArticleBazar` a gagné
 * `aspectRatio: 1/1`) et le cadre de calage doit coïncider avec elle pour que
 * l'auteur vise juste. Le QG (bureau) et le chat baladeur restent des images
 * ancrées au pied, de hauteur libre : leur calage `minHeight: 4vh` est déjà
 * fait et livré, y toucher le casserait.
 */
function ObjetOutline({ editKey }: OutlineProps) {
  const famille = familleEditable(editKey);
  if (famille === "chat") return <OutlineChat editKey={editKey as ChatBaladeurId} />;
  if (famille === "bazar") return <OutlineBazar editKey={editKey as BazarObjetKey} />;
  return <OutlineQg editKey={editKey as QgObjetKey} />;
}

function OutlineChat({ editKey }: { editKey: ChatBaladeurId }) {
  const coord = useChatBaladeurCoord(editKey);
  return <OutlineAvecCoord editKey={editKey} coord={coord} forme="libre" />;
}
function OutlineQg({ editKey }: { editKey: QgObjetKey }) {
  const coord = useQgObjet(editKey);
  return <OutlineAvecCoord editKey={editKey} coord={coord} forme="libre" />;
}
function OutlineBazar({ editKey }: { editKey: BazarObjetKey }) {
  const coord = useQgObjet(editKey);
  return <OutlineAvecCoord editKey={editKey} coord={coord} forme="carree" />;
}

function OutlineAvecCoord({
  editKey,
  coord,
  forme,
}: OutlineProps & {
  coord: { left: number; bottom: number; width: number };
  /** "carree" : cadre carré coïncidant avec la case du Bazar (aspectRatio 1/1).
   *  "libre" : rectangle bas, `minHeight: 4vh` — comportement historique QG/chat. */
  forme: "carree" | "libre";
}) {
  const { left, bottom, width } = coord;
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

  const formeStyle: CSSProperties =
    forme === "carree" ? { aspectRatio: "1 / 1" } : { minHeight: "4vh" };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: `${left}vw`,
        bottom: `${bottom}%`,
        width: `${width}vw`,
        ...formeStyle,
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
          ...formeStyle,
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

interface QgEditOverlayProps {
  /** Clés à afficher sur CETTE scène. Non fourni : toutes les clés connues. */
  cles?: EditableKey[];
}

export function QgEditOverlay({ cles }: QgEditOverlayProps = {}) {
  const ctx = useQgEditContext();
  if (!ctx?.enabled || !ctx.active) return null;
  const aAfficher = cles ?? ALL_KEYS;
  return (
    <>
      {aAfficher.map((key) => (
        <ObjetOutline key={key} editKey={key} />
      ))}
    </>
  );
}
