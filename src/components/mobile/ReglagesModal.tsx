"use client";

import { useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useGameActions } from "@/context/GameContext";
import { useSettings, type TailleFonte } from "@/context/SettingsContext";
import type { AudioPrefs } from "@/lib/audio/audioManager";
import { DebugNotifs } from "@/components/mobile/DebugNotifs";

interface ReglagesModalProps {
  open: boolean;
  onClose: () => void;
}

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  backgroundColor: "var(--forest-900)",
  backgroundImage:
    "radial-gradient(ellipse at 50% 35%, rgba(40,74,56,0.7) 0%, rgba(15,31,24,0) 65%), url(/assets/grain-overlay.svg)",
  backgroundSize: "cover, 320px 320px",
  paddingTop: "var(--safe-top)",
  paddingBottom: "var(--safe-bottom)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const topBar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "1px solid var(--brass-700)",
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  letterSpacing: "0.32em",
  textTransform: "uppercase",
  color: "var(--brass-300)",
  fontWeight: 700,
};

const closeBtn: CSSProperties = {
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  padding: 6,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

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

const rowLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--paper-300)",
  marginBottom: 8,
};

const segBtn = (active: boolean, disabled = false): CSSProperties => ({
  flex: 1,
  padding: "10px 6px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  background: active ? "var(--forest-800)" : "var(--paper-100)",
  color: active ? "var(--brass-300)" : "var(--ink-700)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
});

const togglesRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  fontFamily: "var(--font-serif)",
  fontSize: 14,
  color: "var(--paper-300)",
};

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "1px solid var(--brass-500)",
        background: on ? "var(--forest-700)" : "var(--paper-500)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "var(--brass-300)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}

export function ReglagesModal({ open, onClose }: ReglagesModalProps) {
  const {
    audioPrefs,
    setAudioPref,
    setVolume,
    playClick,
    tailleFonte,
    setTailleFonte,
  } = useSettings();
  // Actions seules : la modale ne re-rend plus à chaque mutation d'état du jeu.
  const { reset } = useGameActions();
  const [confirmSuppression, setConfirmSuppression] = useState(false);

  if (!open) return null;

  const onToggleAudio = (k: keyof AudioPrefs) => {
    playClick();
    setAudioPref(k, !audioPrefs[k]);
  };

  const onTaille = (t: TailleFonte) => {
    playClick();
    setTailleFonte(t);
  };

  const onSupprimerSave = () => {
    playClick();
    setConfirmSuppression(true);
  };

  const onFermer = () => {
    playClick();
    onClose();
  };

  const tailles: { id: TailleFonte; nom: string }[] = [
    { id: "petit", nom: "Petit" },
    { id: "normal", nom: "Normal" },
    { id: "grand", nom: "Grand" },
  ];

  const themes = [
    { id: "auto", nom: "Auto" },
    { id: "clair", nom: "Clair" },
    { id: "sombre", nom: "Sombre" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Réglages" style={wrap}>
      <BrassCorners color="var(--brass-500)" inset={10} size={32} />
      <div style={topBar}>
        <h2 style={titleStyle}>— Réglages —</h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <section style={section}>
        <h3 style={sectionTitle}>Son</h3>

        <div style={rowLabel}>Volume général — {audioPrefs.volume}</div>
        <input
          type="range"
          min={0}
          max={100}
          value={audioPrefs.volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ width: "100%", marginBottom: 14 }}
          aria-label="Volume général"
        />

        <div style={togglesRow}>
          <span>Bruit de foule</span>
          <Toggle
            on={audioPrefs.foule}
            onToggle={() => onToggleAudio("foule")}
          />
        </div>
        <div style={togglesRow}>
          <span>Sons d&apos;encaissement</span>
          <Toggle
            on={audioPrefs.cash}
            onToggle={() => onToggleAudio("cash")}
          />
        </div>
        <div style={togglesRow}>
          <span>Clics</span>
          <Toggle
            on={audioPrefs.clic}
            onToggle={() => onToggleAudio("clic")}
          />
        </div>
      </section>

      <section style={section}>
        <h3 style={sectionTitle}>Affichage</h3>

        <div style={rowLabel}>Taille de police</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {tailles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTaille(t.id)}
              style={segBtn(tailleFonte === t.id)}
            >
              {t.nom}
            </button>
          ))}
        </div>

        <div
          style={{
            ...rowLabel,
            fontStyle: "italic",
            color: "var(--brass-700)",
          }}
        >
          Thème (à venir)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled
              style={segBtn(false, true)}
            >
              {t.nom}
            </button>
          ))}
        </div>
      </section>

      <section style={section}>
        <h3 style={sectionTitle}>Partie</h3>
        <button
          type="button"
          onClick={onSupprimerSave}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "var(--vermillion-600)",
            color: "var(--paper-100)",
            border: "1px solid var(--velvet-700)",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Supprimer la sauvegarde
        </button>
      </section>

      <DebugNotifs />

      <section style={section}>
        <h3 style={sectionTitle}>À propos</h3>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--brass-700)",
            lineHeight: 1.8,
          }}
        >
          <div>ver. 1.0 · saison de printemps · 1924</div>
          <div>Broc — une simulation de brocante</div>
          <div>Conçu par G. Fenard · 2026</div>
          <div style={{ marginTop: 8 }}>
            <a
              href="/privacy"
              style={{ color: "var(--brass-700)", textDecoration: "underline" }}
            >
              Confidentialité
            </a>
            {" · "}
            <a
              href="/mentions-legales"
              style={{ color: "var(--brass-700)", textDecoration: "underline" }}
            >
              Mentions légales
            </a>
          </div>
        </div>
      </section>
      <ConfirmModal
        open={confirmSuppression}
        onClose={() => setConfirmSuppression(false)}
        onConfirm={reset}
        titre="Supprimer la sauvegarde"
        confirmLabel="Supprimer"
        danger
      >
        Toute votre progression sera définitivement effacée. Cette action est
        irréversible. Êtes-vous sûr ?
      </ConfirmModal>
    </div>
  );
}
