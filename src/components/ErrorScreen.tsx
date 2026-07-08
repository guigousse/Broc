"use client";

import { useState } from "react";
import { viderSlotActif } from "@/lib/storage/slots";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Écran de secours affiché par les error boundaries (`error.tsx`,
 * `global-error.tsx`) en cas de crash de rendu — évite l'écran blanc.
 * Propose de recharger, ou de réinitialiser la partie si l'état est corrompu.
 */
export function ErrorScreen({
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const { d } = useLangue();

  function reinitialiser() {
    try {
      // Ne réinitialise QUE la partie active (les autres emplacements sont préservés).
      viderSlotActif();
    } catch {
      // ignore
    }
    window.location.href = "/";
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "32px 24px",
        textAlign: "center",
        background: "#1d2a20",
        color: "#f3ead4",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}
    >
      <div style={{ fontSize: 48 }}>🧰</div>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 26, margin: 0 }}>
        {d.chrome.errorTitre}
      </h1>
      <p style={{ fontSize: 18, maxWidth: 420, opacity: 0.9, margin: 0 }}>
        {d.chrome.errorCorps}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <button onClick={() => (reset ? reset() : window.location.reload())} style={primary}>
          {d.chrome.errorRecharger}
        </button>

        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={ghost}>
            {d.chrome.errorReinitialiser}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 15, opacity: 0.85, margin: 0, maxWidth: 360 }}>
              {d.chrome.errorConfirmCorps}
            </p>
            <button onClick={reinitialiser} style={danger}>
              {d.chrome.errorConfirmBouton}
            </button>
            <button onClick={() => setConfirmReset(false)} style={ghost}>
              {d.commun.annuler}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const baseBtn: React.CSSProperties = {
  fontFamily: "'Cinzel', serif",
  fontSize: 15,
  padding: "12px 24px",
  borderRadius: 8,
  cursor: "pointer",
  border: "1px solid transparent",
};
const primary: React.CSSProperties = {
  ...baseBtn,
  background: "#c8a24a",
  color: "#1d2a20",
  fontWeight: 600,
};
const ghost: React.CSSProperties = {
  ...baseBtn,
  background: "transparent",
  color: "#f3ead4",
  borderColor: "#6b7a64",
};
const danger: React.CSSProperties = {
  ...baseBtn,
  background: "#a83232",
  color: "#f3ead4",
  fontWeight: 600,
};
