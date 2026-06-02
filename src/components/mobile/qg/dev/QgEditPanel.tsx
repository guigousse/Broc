"use client";

import { useState } from "react";
import { QG_LAYOUT, type QgObjetKey } from "../layout";
import { useQgObjet, useQgEditContext } from "./QgEditContext";

const KEYS = Object.keys(QG_LAYOUT.objets) as QgObjetKey[];

function KeyRow({ qgKey }: { qgKey: QgObjetKey }) {
  const { left, bottom, width } = useQgObjet(qgKey);
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, color: "#e8d5a3" }}>
      <span style={{ color: "#a8c4e0" }}>{qgKey}</span>
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

  function handleCopy() {
    const lines = KEYS.map((key) => {
      // Access live values via DOM would require hooks, but we need them all together.
      // We'll build the snippet from the ctx overrides + base values.
      const base = QG_LAYOUT.objets[key];
      const o = ctx?.overrides[key];
      const left = o?.left ?? base.left;
      const bottom = o?.bottom ?? base.bottom;
      const width = o?.width ?? base.width;
      return `    ${key}: { left: ${left.toFixed(1)}, bottom: ${bottom.toFixed(1)}, width: ${width.toFixed(1)} },`;
    });
    const snippet = lines.join("\n");
    navigator.clipboard.writeText(snippet).catch(() => {
      // silently ignore clipboard errors in insecure contexts
    });
  }

  function handleReset() {
    ctx?.resetAll();
  }

  if (collapsed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 12,
          right: 12,
          zIndex: 100,
          background: "rgba(20, 16, 10, 0.9)",
          border: "1px solid var(--brass-500)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "var(--brass-500)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed(false)}
      >
        QG edit mode
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 100,
        background: "rgba(20, 16, 10, 0.92)",
        border: "1px solid var(--brass-500)",
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 280,
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
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

      {/* Code snippet */}
      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          borderRadius: 4,
          padding: "6px 8px",
          marginBottom: 8,
        }}
      >
        {KEYS.map((key) => (
          <KeyRow key={key} qgKey={key} />
        ))}
      </div>

      {/* Actions */}
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
