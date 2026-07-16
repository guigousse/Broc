"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGameActions, useGameStateOnly } from "@/context/GameContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { tutorielActif } from "@/lib/tutoriel";

const wrap: CSSProperties = {
  position: "fixed",
  top: "calc(var(--safe-top, 0px) + 8px)",
  left: 12,
  right: 12,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(26, 51, 38, 0.92)",
  border: "1px solid var(--brass-500, #b89c5e)",
  color: "#f6ecd2",
  pointerEvents: "auto",
};

const texteStyle: CSSProperties = {
  flex: 1,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.3,
};

const passerStyle: CSSProperties = {
  flexShrink: 0,
  background: "transparent",
  border: "1px solid rgba(246, 236, 210, 0.5)",
  borderRadius: 8,
  color: "#f6ecd2",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  padding: "6px 10px",
  cursor: "pointer",
};

export function TutorielBanniere() {
  const { state } = useGameStateOnly();
  const { terminerTutoriel } = useGameActions();
  const { d } = useLangue();
  const [confirme, setConfirme] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (!state || !tutorielActif(state)) return null;
  const etape = state.tutorielEtape as Exclude<
    typeof state.tutorielEtape,
    "termine"
  >;

  const onPasser = () => {
    if (confirme) {
      terminerTutoriel();
      return;
    }
    setConfirme(true);
    timerRef.current = setTimeout(() => setConfirme(false), 3000);
  };

  return (
    <div style={wrap} role="status">
      <span style={texteStyle}>{d.tutoriel.instructions[etape]}</span>
      <button type="button" style={passerStyle} onClick={onPasser}>
        {confirme ? d.tutoriel.confirmerPasser : d.tutoriel.passer}
      </button>
    </div>
  );
}
