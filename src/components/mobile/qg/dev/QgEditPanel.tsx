"use client";

import { useState } from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { CHAT_BALADEUR_LAYOUT } from "../chatBaladeurLayout";
import { CHAT_BALADEUR_ORDER, type ChatBaladeurId } from "@/lib/chatBaladeur";
import {
  ETAGERE_LEG_MASK_LAYOUT,
  STOCKAGE_BOX_ORDER,
  STOCKAGE_BOXES_LAYOUT,
  type StockageBoxKey,
} from "../stockageBoxesLayout";
import {
  ETAGERE_LEG_KEY,
  useQgObjet,
  useChatBaladeurCoord,
  useStockageBoxCoord,
  useEtagereLegMaskCoord,
  useQgEditContext,
  type EditableKey,
} from "./QgEditContext";

const QG_KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];
const CHAT_KEYS = [...CHAT_BALADEUR_ORDER] as ChatBaladeurId[];
const BOX_KEYS = [...STOCKAGE_BOX_ORDER] as StockageBoxKey[];

// Position au-dessous du header mobile (var injectée par MobileLayout).
const ANCHOR_STYLE = {
  position: "fixed" as const,
  top: "calc(var(--safe-top) + var(--mobile-header-h) + 8px)",
  right: 12,
  zIndex: 100,
};

function QgRow({ qgKey }: { qgKey: QgObjetKey }) {
  const { left, bottom, width } = useQgObjet(qgKey);
  return <CoordRow name={qgKey} left={left} bottom={bottom} width={width} />;
}

function ChatRow({ chatKey }: { chatKey: ChatBaladeurId }) {
  const { left, bottom, width } = useChatBaladeurCoord(chatKey);
  return <CoordRow name={chatKey} left={left} bottom={bottom} width={width} />;
}

function BoxRow({ boxKey }: { boxKey: StockageBoxKey }) {
  const { left, bottom, width } = useStockageBoxCoord(boxKey);
  return <CoordRow name={boxKey} left={left} bottom={bottom} width={width} />;
}

function LegRow() {
  const { left, bottom, width } = useEtagereLegMaskCoord();
  return (
    <CoordRow name={ETAGERE_LEG_KEY} left={left} bottom={bottom} width={width} />
  );
}

function CoordRow({
  name,
  left,
  bottom,
  width,
}: {
  name: string;
  left: number;
  bottom: number;
  width: number;
}) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, color: "#e8d5a3" }}>
      <span style={{ color: "#a8c4e0" }}>{name}</span>
      {": { left: "}
      <span style={{ color: "#b8e0a8" }}>{left.toFixed(1)}</span>
      {", bottom: "}
      <span style={{ color: "#b8e0a8" }}>{bottom.toFixed(1)}</span>
      {", width: "}
      <span style={{ color: "#b8e0a8" }}>{width.toFixed(1)}</span>
      {" },"}
    </div>
  );
}

export function QgEditPanel() {
  const ctx = useQgEditContext();
  const [collapsed, setCollapsed] = useState(false);
  const active = ctx?.active ?? false;

  function effective(key: EditableKey) {
    const isChat = (CHAT_BALADEUR_ORDER as readonly string[]).includes(key);
    const isBox = (STOCKAGE_BOX_ORDER as readonly string[]).includes(key);
    const isLeg = key === ETAGERE_LEG_KEY;
    const base = isLeg
      ? ETAGERE_LEG_MASK_LAYOUT
      : isBox
        ? STOCKAGE_BOXES_LAYOUT[key as StockageBoxKey]
        : isChat
          ? CHAT_BALADEUR_LAYOUT[key as ChatBaladeurId]
          : QG_LAYOUT.objets[key as QgObjetKey];
    const o = ctx?.overrides[key];
    return {
      left: o?.left ?? base.left,
      bottom: o?.bottom ?? base.bottom,
      width: o?.width ?? base.width,
    };
  }

  function handleCopy() {
    const qg = QG_KEYS.map((k) => {
      const e = effective(k);
      return `    ${k}: { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
    });
    const chat = CHAT_KEYS.map((k) => {
      const e = effective(k);
      return `  "${k}": { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
    });
    const boxes = BOX_KEYS.map((k) => {
      const e = effective(k);
      return `  ${k}: { left: ${e.left.toFixed(1)}, bottom: ${e.bottom.toFixed(1)}, width: ${e.width.toFixed(1)} },`;
    });
    const leg = effective(ETAGERE_LEG_KEY);
    const legLine = `  ${ETAGERE_LEG_KEY}: { left: ${leg.left.toFixed(1)}, bottom: ${leg.bottom.toFixed(1)}, width: ${leg.width.toFixed(1)} },`;
    const snippet =
      "// QG objets\n" +
      qg.join("\n") +
      "\n\n// Chat baladeur\n" +
      chat.join("\n") +
      "\n\n// Cartons stockage\n" +
      boxes.join("\n") +
      "\n\n// Masque étagère\n" +
      legLine;
    navigator.clipboard.writeText(snippet).catch(() => {
      /* clipboard indisponible en contexte non sécurisé : on ignore */
    });
  }

  function handleReset() {
    ctx?.resetAll();
  }

  if (collapsed) {
    return (
      <div
        style={{
          ...ANCHOR_STYLE,
          background: "rgba(20, 16, 10, 0.9)",
          border: "1px solid var(--brass-500)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--brass-500)",
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
        onClick={() => setCollapsed(false)}
      >
        <span>QG edit</span>
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 8,
            background: active ? "var(--brass-500)" : "rgba(168,120,60,0.25)",
            color: active ? "#1a1208" : "var(--brass-500)",
            fontWeight: "bold",
          }}
        >
          {active ? "ON" : "OFF"}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...ANCHOR_STYLE,
        background: "rgba(20, 16, 10, 0.92)",
        border: "1px solid var(--brass-500)",
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 280,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "70vh",
        overflowY: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            fontWeight: "bold",
            letterSpacing: "0.08em",
          }}
        >
          QG edit mode
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => ctx?.setActive(!active)}
            style={{
              background: active ? "var(--brass-500)" : "transparent",
              border: "1px solid var(--brass-500)",
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: "bold",
              color: active ? "#1a1208" : "var(--brass-500)",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
            aria-pressed={active}
            aria-label={active ? "Désactiver l'outil" : "Activer l'outil"}
          >
            {active ? "ACTIF" : "INACTIF"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--brass-500)",
              cursor: "pointer",
              fontSize: 13,
              padding: "0 2px",
              lineHeight: 1,
            }}
            aria-label="Replier"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          borderRadius: 4,
          padding: "6px 8px",
          marginBottom: 8,
          opacity: active ? 1 : 0.45,
        }}
      >
        <div style={{ color: "#8aa", fontSize: 10, marginBottom: 4 }}>// QG objets</div>
        {QG_KEYS.map((k) => (
          <QgRow key={k} qgKey={k} />
        ))}
        <div style={{ color: "#8aa", fontSize: 10, margin: "6px 0 4px" }}>// Chat baladeur</div>
        {CHAT_KEYS.map((k) => (
          <ChatRow key={k} chatKey={k} />
        ))}
        <div style={{ color: "#8aa", fontSize: 10, margin: "6px 0 4px" }}>// Cartons stockage</div>
        {BOX_KEYS.map((k) => (
          <BoxRow key={k} boxKey={k} />
        ))}
        <div style={{ color: "#8aa", fontSize: 10, margin: "6px 0 4px" }}>// Masque étagère</div>
        <LegRow />
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            background: "var(--brass-500)",
            border: "none",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#1a1208",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Copier
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid rgba(168,120,60,0.5)",
            borderRadius: 4,
            padding: "5px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--brass-500)",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
