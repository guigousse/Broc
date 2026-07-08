"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useSettings, type TailleFonte } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";
import type { AudioPrefs } from "@/lib/audio/audioManager";
import {
  demanderPermission,
  notificationsDisponibles,
  permissionAccordee,
} from "@/lib/notifications";
import { notifsActives, setNotifsActives } from "@/lib/notifications/prefs";

interface ReglagesModalProps {
  open: boolean;
  onClose: () => void;
}

/* Même habillage que les overlays Parties / Crédits du menu principal :
   écran-titre flouté derrière, encadrés verts flottants devant.
   La suppression de partie vit dans l'overlay Charger (poubelle par slot),
   et les infos « À propos » dans la modal Crédits. */

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(15,31,24,0.35)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
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

const carte: CSSProperties = {
  background: "var(--forest-800)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "0 16px 32px rgba(0,0,0,0.38), inset 0 0 0 2px var(--forest-800), inset 0 0 0 3px var(--brass-500)",
  borderRadius: "var(--radius-card)",
  padding: "18px 16px",
  margin: "0 24px 14px",
};

const sectionTitle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "var(--brass-500)",
  margin: "0 0 14px",
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
  borderRadius: 6,
  background: active ? "var(--forest-700)" : "var(--paper-100)",
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
  const { locale, setLocale } = useLangue();

  if (!open) return null;

  const onToggleAudio = (k: keyof AudioPrefs) => {
    playClick();
    setAudioPref(k, !audioPrefs[k]);
  };

  const onTaille = (t: TailleFonte) => {
    playClick();
    setTailleFonte(t);
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

  return (
    <div role="dialog" aria-modal="true" aria-label="Réglages" style={wrap}>
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

      <div style={{ marginTop: 18 }}>
        <section style={carte} aria-label="Son">
          <h3 style={sectionTitle}>Son</h3>

          <div style={rowLabel}>Volume général — {audioPrefs.volume}</div>
          <input
            type="range"
            min={0}
            max={100}
            value={audioPrefs.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: "100%",
              marginBottom: 14,
              accentColor: "var(--brass-500)",
            }}
            aria-label="Volume général"
          />

          <div style={togglesRow}>
            <span>Musique</span>
            <Toggle
              on={audioPrefs.musique}
              onToggle={() => onToggleAudio("musique")}
            />
          </div>
          <div style={togglesRow}>
            <span>Effets sonores</span>
            <Toggle
              on={audioPrefs.effets}
              onToggle={() => onToggleAudio("effets")}
            />
          </div>
          <div style={togglesRow}>
            <span>Sons d&apos;ambiance</span>
            <Toggle
              on={audioPrefs.ambiance}
              onToggle={() => onToggleAudio("ambiance")}
            />
          </div>
        </section>

        <section style={carte} aria-label="Affichage">
          <h3 style={sectionTitle}>Affichage</h3>

          <div style={rowLabel}>Taille de police</div>
          <div style={{ display: "flex", gap: 8 }}>
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
        </section>

        <section style={carte} aria-label="Langue">
          <h3 style={sectionTitle}>Langue</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  playClick();
                  setLocale(l);
                }}
                style={segBtn(locale === l)}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </section>

        <SectionNotifications />
      </div>
    </div>
  );
}

/**
 * Encadré Notifications : préférence joueur (toggle) + état de la permission
 * système iOS avec bouton « Autoriser » (le prompt ne peut venir que d'un
 * geste). Hors app iOS (web/dev), simple mention d'indisponibilité.
 */
function SectionNotifications() {
  const { playClick } = useSettings();
  const dispo = notificationsDisponibles();
  const [actives, setActives] = useState(true);
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    setActives(notifsActives());
    if (dispo) void permissionAccordee().then(setPermission);
  }, [dispo]);

  const onToggle = () => {
    playClick();
    const suivant = !actives;
    setActives(suivant);
    setNotifsActives(suivant);
  };

  const onAutoriser = () => {
    playClick();
    void demanderPermission().then(setPermission);
  };

  return (
    <section style={carte} aria-label="Notifications">
      <h3 style={sectionTitle}>Notifications</h3>

      <div style={togglesRow}>
        <span>Rappels (énergie, atelier, quêtes)</span>
        <Toggle on={actives} onToggle={onToggle} />
      </div>

      {!dispo ? (
        <div
          style={{ ...rowLabel, fontStyle: "italic", color: "var(--brass-700)" }}
        >
          Disponibles sur l&apos;application iOS
        </div>
      ) : permission === false ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ ...rowLabel, marginBottom: 0 }}>
            Permission système requise
          </span>
          <button type="button" onClick={onAutoriser} style={segBtn(true)}>
            Autoriser
          </button>
        </div>
      ) : permission === true ? (
        <div style={{ ...rowLabel, color: "var(--brass-500)" }}>
          Permission accordée ✓
        </div>
      ) : null}
    </section>
  );
}
