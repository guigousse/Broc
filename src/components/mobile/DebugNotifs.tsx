"use client";

/**
 * TEMPORAIRE — panneau de diagnostic des notifications (à retirer ensuite).
 * Affiche l'état (permission/pending) et permet d'envoyer une notif immédiate
 * ou planifiée à +10 s, en remontant l'erreur native à l'écran.
 */

import { useState, type CSSProperties } from "react";
import { debugEtat, debugProgrammer } from "@/lib/notifications/debugNotif";

const section: CSSProperties = {
  padding: "20px 24px",
  borderBottom: "1px dotted var(--brass-700)",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-500)",
  marginBottom: 14,
};

const btn: CSSProperties = {
  flex: 1,
  padding: "10px 6px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: "var(--paper-100)",
  color: "var(--ink-700)",
  cursor: "pointer",
};

const outBox: CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  background: "var(--forest-900)",
  border: "1px solid var(--brass-700)",
  color: "var(--paper-200)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  userSelect: "text",
  WebkitUserSelect: "text",
};

export function DebugNotifs() {
  const [out, setOut] = useState("(appuie sur un bouton)");
  const [busy, setBusy] = useState(false);

  const run = (label: string, fn: () => Promise<string>) => async () => {
    setBusy(true);
    setOut(label + "…");
    try {
      setOut(await fn());
    } catch (e) {
      setOut("EXCEPTION: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={section}>
      <h3 style={sectionTitle}>🔧 Debug notifs (temporaire)</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={busy}
          onClick={run("état", debugEtat)}
          style={btn}
        >
          État
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={run("immédiate", () => debugProgrammer(0))}
          style={btn}
        >
          Immédiate
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={run("+10 s", () => debugProgrammer(10))}
          style={btn}
        >
          +10 s
        </button>
      </div>
      <div style={outBox}>{out}</div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--brass-700)",
          lineHeight: 1.5,
        }}
      >
        « +10 s » : appuie, verrouille l&apos;écran, attends 10 s → la bannière
        doit tomber. Recopie la ligne de résultat.
      </div>
    </section>
  );
}
