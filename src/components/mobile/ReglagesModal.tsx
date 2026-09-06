"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import type { AudioPrefs } from "@/lib/audio/audioManager";
import {
  demanderPermission,
  notificationsDisponibles,
  permissionAccordee,
} from "@/lib/notifications";
import { notifsActives, setNotifsActives } from "@/lib/notifications/prefs";
import { vibrationsActives, setVibrationsActives } from "@/lib/haptique/prefs";
import { definirEnergieInfinie } from "@/lib/iap/energieInfinie";
import { getIapProvider, achatDisponible } from "@/lib/iap/iapProvider";
import { plateformeNative } from "@/lib/plateforme";
import {
  montrerOptionsConfidentialite,
  optionsConfidentialiteRequises,
} from "@/lib/ads/adMobProvider";
import { useToastSafe } from "@/components/ui/Toast";

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

const selectWrap: CSSProperties = { position: "relative" };

const selectLangue: CSSProperties = {
  width: "100%",
  padding: "10px 36px 10px 12px",
  fontFamily: "var(--font-display)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid var(--brass-500)",
  borderRadius: 6,
  background: "var(--paper-100)",
  color: "var(--ink-700)",
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
};

const chevron: CSSProperties = {
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "var(--ink-700)",
  fontSize: 10,
};

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
  label,
}: {
  on: boolean;
  onToggle: () => void;
  /** Nom accessible : le libellé voisin est un simple <span>, non relié. */
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
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
  } = useSettings();
  const { locale, setLocale, d, tr } = useLangue();
  const [vibrations, setVibrations] = useState(true);

  useEffect(() => {
    setVibrations(vibrationsActives());
  }, []);

  if (!open) return null;

  const onToggleVibrations = () => {
    playClick();
    const suivant = !vibrations;
    setVibrations(suivant);
    setVibrationsActives(suivant);
  };

  const onToggleAudio = (k: keyof AudioPrefs) => {
    playClick();
    setAudioPref(k, !audioPrefs[k]);
  };

  const onFermer = () => {
    playClick();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={d.reglages.titre} style={wrap}>
      <div style={topBar}>
        <h2 style={titleStyle}>{d.reglages.titre}</h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label={d.commun.fermer}
          style={closeBtn}
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <section style={carte} aria-label={d.reglages.son}>
          <h3 style={sectionTitle}>{d.reglages.son}</h3>

          <div style={rowLabel}>{tr(d.reglages.volumeGeneral, { n: audioPrefs.volume })}</div>
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
            aria-label={tr(d.reglages.volumeGeneral, { n: audioPrefs.volume })}
          />

          <div style={togglesRow}>
            <span>{d.reglages.musique}</span>
            <Toggle
              on={audioPrefs.musique}
              onToggle={() => onToggleAudio("musique")}
              label={d.reglages.musique}
            />
          </div>
          <div style={togglesRow}>
            <span>{d.reglages.effets}</span>
            <Toggle
              on={audioPrefs.effets}
              onToggle={() => onToggleAudio("effets")}
              label={d.reglages.effets}
            />
          </div>
          <div style={togglesRow}>
            <span>{d.reglages.ambiance}</span>
            <Toggle
              on={audioPrefs.ambiance}
              onToggle={() => onToggleAudio("ambiance")}
              label={d.reglages.ambiance}
            />
          </div>
          <div style={togglesRow}>
            <span>{d.reglages.vibrations}</span>
            <Toggle
              on={vibrations}
              onToggle={onToggleVibrations}
              label={d.reglages.vibrations}
            />
          </div>
        </section>

        <section style={carte} aria-label={d.reglages.langue}>
          <h3 style={sectionTitle}>{d.reglages.langue}</h3>
          <div style={selectWrap}>
            <select
              value={locale}
              onChange={(e) => {
                playClick();
                setLocale(e.target.value as Locale);
              }}
              aria-label={d.reglages.langue}
              style={selectLangue}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
            <span aria-hidden style={chevron}>▾</span>
          </div>
        </section>

        <SectionNotifications />
        {plateformeNative() === "android" && <SectionConfidentialite />}
        {achatDisponible() && <SectionAchats />}
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
  const { d } = useLangue();
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
    <section style={carte} aria-label={d.reglages.notifications}>
      <h3 style={sectionTitle}>{d.reglages.notifications}</h3>

      <div style={togglesRow}>
        <span>{d.reglages.rappels}</span>
        <Toggle on={actives} onToggle={onToggle} label={d.reglages.rappels} />
      </div>

      {!dispo ? (
        <div
          style={{ ...rowLabel, fontStyle: "italic", color: "var(--brass-700)" }}
        >
          {d.reglages.notifsIndispo}
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
            {d.reglages.permissionRequise}
          </span>
          <button type="button" onClick={onAutoriser} style={segBtn(true)}>
            {d.reglages.autoriser}
          </button>
        </div>
      ) : permission === true ? (
        <div style={{ ...rowLabel, color: "var(--brass-500)" }}>
          {d.reglages.permissionAccordee}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Encadré Confidentialité : rouvre le formulaire de consentement UMP (pubs
 * personnalisées ou non ; la mesure d'audience y est adossée). Google l'exige
 * pour les joueurs européens — sans lui, la seule issue est de réinstaller.
 * Android seulement (sous-projet B) : le pont iOS ne l'implémente pas encore.
 * Rendu uniquement quand UMP juge le point d'entrée requis.
 */
function SectionConfidentialite() {
  const { playClick } = useSettings();
  const { d } = useLangue();
  const { toast } = useToastSafe();
  const [requis, setRequis] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let vivant = true;
    void optionsConfidentialiteRequises().then((r) => {
      if (vivant) setRequis(r);
    });
    return () => {
      vivant = false;
    };
  }, []);

  if (!requis) return null;

  const ouvrir = async () => {
    if (enCours) return;
    playClick();
    setEnCours(true);
    try {
      await montrerOptionsConfidentialite();
    } catch {
      toast(d.sheets.erreurPub, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section style={carte} aria-label={d.reglages.confidentialite}>
      <h3 style={sectionTitle}>{d.reglages.confidentialite}</h3>
      <button
        type="button"
        onClick={() => void ouvrir()}
        disabled={enCours}
        style={segBtn(true, enCours)}
      >
        {d.reglages.optionsConfidentialite}
      </button>
    </section>
  );
}

/** Restauration du non-consommable « Énergie infinie » — bouton exigé par
 *  Apple. Visible partout où une boutique est branchée : en dev/web le stub
 *  relit le drapeau local, sur Android rien n'est branché et la section
 *  n'est pas rendue du tout. */
function SectionAchats() {
  const { d } = useLangue();
  const { toast } = useToastSafe();
  const [enCours, setEnCours] = useState(false);

  const restaurer = async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const actif = await getIapProvider().restaurer();
      definirEnergieInfinie(actif);
      if (actif) {
        toast(d.reglages.achatsRestaures, { type: "succes" });
      } else {
        toast(d.reglages.rienARestaurer);
      }
    } catch {
      toast(d.chrome.erreurAchat, { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  };

  return (
    <section style={carte} aria-label={d.reglages.achats}>
      <h3 style={sectionTitle}>{d.reglages.achats}</h3>
      <button
        type="button"
        onClick={() => void restaurer()}
        disabled={enCours}
        style={segBtn(true, enCours)}
      >
        {enCours ? d.reglages.restaurationEnCours : d.reglages.restaurerAchats}
      </button>
    </section>
  );
}
