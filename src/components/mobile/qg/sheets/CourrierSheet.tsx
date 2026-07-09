"use client";

import {
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { FloatingActionButton } from "@/components/mobile/qg/FloatingActionButton";
import { getExpediteur } from "@/data/expediteursCourrier";
import { useSettings } from "@/context/SettingsContext";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomTemplate, signatureExpediteur } from "@/lib/i18n/contenu";
import type { Locale } from "@/lib/i18n/locales";
import type { DictionnaireUI, tr as TrFn } from "@/lib/i18n/ui";
import type { Courrier } from "@/types/game";

interface CourrierSheetProps {
  open: boolean;
  onClose: () => void;
  courriers: Courrier[];
  onMarquerLu: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/* Markdown ultra-minimal : **gras** seulement.                       */
/* ------------------------------------------------------------------ */
const strongStyle: CSSProperties = {
  fontWeight: 700,
  color: "#1a1308",
  borderBottom: "1.5px solid #1a1308",
  padding: "0 1px",
  whiteSpace: "nowrap",
};

function renderParaText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={match.index} style={strongStyle}>
        {match[1]}
      </strong>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const scrim: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,30,22,0.55)",
  zIndex: 50,
  animation: "broc-fade-in 160ms ease",
};

const stage: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 51,
  display: "flex",
  flexDirection: "column",
  padding: "max(24px, env(safe-area-inset-top)) 16px 0",
  overflow: "hidden",
};

const closeIconBtn: CSSProperties = {
  position: "absolute",
  top: "max(12px, env(safe-area-inset-top))",
  right: 12,
  width: 36,
  height: 36,
  borderRadius: 18,
  background: "rgba(20,15,5,0.45)",
  border: "1px solid rgba(217,192,122,0.5)",
  color: "var(--brass-300)",
  fontFamily: "var(--font-display)",
  fontSize: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  zIndex: 52,
};

const scrollArea: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  // Réserve la hauteur de la tab bar pour que le bouton Récupérer reste
  // accessible sans chevaucher le bandeau inférieur.
  paddingBottom:
    "calc(24px + var(--mobile-tabbar-h) + env(safe-area-inset-bottom))",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const lettreCard: CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 420,
  background:
    "linear-gradient(135deg, #f6ecd2 0%, #f1e4c0 55%, #e7d6a8 100%)",
  border: "1px solid #b89c5e",
  boxShadow:
    "inset 0 0 28px rgba(120, 90, 40, 0.18), 0 6px 16px rgba(0,0,0,0.25)",
  padding: "18px 20px 16px",
  margin: "0 0 18px",
  borderRadius: 2,
};

const titreLettre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "0 0 12px",
  color: "var(--ink-700)",
  borderBottom: "1px dotted #a88f5a",
  paddingBottom: 6,
};

const corpsLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 17,
  lineHeight: 1.4,
  color: "#3a2f1e",
  margin: "0 0 14px",
  textIndent: "1.6em",
  textAlign: "left",
};

const corpsLettrePremier: CSSProperties = {
  ...corpsLettre,
  textIndent: 0,
};

const signatureLettre: CSSProperties = {
  fontFamily: "var(--font-handwriting)",
  fontSize: 20,
  lineHeight: 1.3,
  marginTop: 12,
  paddingRight: 6,
  whiteSpace: "pre-line",
  textAlign: "right",
  color: "#2a2008",
  transform: "rotate(-2deg)",
  transformOrigin: "right center",
};

const actionBtnWrap: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  display: "flex",
  justifyContent: "center",
  marginTop: 20,
};

/* ------------------------------------------------------------------ */
/* Rendus                                                              */
/* ------------------------------------------------------------------ */

function renderLettre(c: Courrier, locale: Locale) {
  if (c.payload.type !== "lettre") return null;
  const p = c.payload;
  const exp = getExpediteur(p.expediteurId);
  return (
    <>
      <h3 style={titreLettre}>{p.titre}</h3>
      {p.corps.map((para, i) => (
        <p key={i} style={i === 0 ? corpsLettrePremier : corpsLettre}>
          {renderParaText(para)}
        </p>
      ))}
      {exp && (
        <div style={signatureLettre}>
          {signatureExpediteur(p.expediteurId, locale)}
        </div>
      )}
    </>
  );
}

const cibleEncart: CSSProperties = {
  marginTop: 14,
  padding: "10px 12px",
  border: "1px dashed #a88f5a",
  background: "rgba(255,250,235,0.5)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "#3a2f1e",
  display: "grid",
  gap: 4,
};

function renderMission(
  c: Courrier,
  d: DictionnaireUI,
  tr: typeof TrFn,
  locale: Locale,
) {
  if (c.payload.type !== "mission") return null;
  const p = c.payload;
  const exp = getExpediteur(p.expediteurId);
  return (
    <>
      <h3 style={titreLettre}>{p.titre}</h3>
      {p.corps.map((para, i) => (
        <p key={i} style={i === 0 ? corpsLettrePremier : corpsLettre}>
          {renderParaText(para)}
        </p>
      ))}
      <div style={cibleEncart}>
        <div>
          <strong>
            {p.cibles.length > 1
              ? d.sheets.objetsRecherches
              : d.sheets.objetRecherche}
          </strong>{" "}
          {p.cibles
            .map((cible) => {
              const nom = nomTemplate(cible.templateId, locale);
              const suffixe = cible.etatMin
                ? ` ${tr(d.sheets.etatMinSuffixe, { etat: libelleEtat(cible.etatMin, d) })}`
                : "";
              return `${nom}${suffixe}`;
            })
            .join(", ")}
        </div>
        <div>
          <strong>{d.sheets.recompenseLabel}</strong> +{p.recompense.argent} €
        </div>
        {p.jourLimite !== undefined && (
          <div>
            <strong>{d.sheets.avantLeJour}</strong> {p.jourLimite}
          </div>
        )}
      </div>
      {exp && (
        <div style={signatureLettre}>
          {signatureExpediteur(p.expediteurId, locale)}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

export function CourrierSheet({
  open,
  onClose,
  courriers,
  onMarquerLu,
}: CourrierSheetProps) {
  const { playClick, playCash } = useSettings();
  const { d, tr, locale } = useLangue();

  const nonLus = useMemo(
    () =>
      courriers
        .filter((c) => !c.lu)
        .sort((a, b) => b.jourRecu - a.jourRecu),
    [courriers],
  );

  // Auto-close quand la pile est vide.
  useEffect(() => {
    if (!open) return;
    if (nonLus.length > 0) return;
    onClose();
  }, [open, nonLus.length, onClose]);

  // Bloque le scroll du body pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || nonLus.length === 0) return null;

  // On affiche une lettre à la fois (la plus récente) pour permettre un
  // unique bouton d'action fixé en bas.
  const courant = nonLus[0];
  const recompenseArgent =
    courant.payload.type === "lettre" ? courant.payload.recompense?.argent : null;
  const estMission = courant.payload.type === "mission";

  const handleValider = () => {
    if (recompenseArgent) {
      playCash();
    } else {
      playClick();
    }
    onMarquerLu(courant.id);
  };

  return (
    <>
      <div style={scrim} onClick={onClose} aria-hidden />
      <div style={stage} role="dialog" aria-modal="true">
        <button
          type="button"
          style={closeIconBtn}
          onClick={onClose}
          aria-label={d.commun.fermer}
        >
          ✕
        </button>
        <div style={scrollArea}>
          <article style={lettreCard}>
            {courant.payload.type === "mission"
              ? renderMission(courant, d, tr, locale)
              : renderLettre(courant, locale)}
          </article>
          <div style={actionBtnWrap}>
            <FloatingActionButton onClick={handleValider} minWidth={220}>
              {estMission
                ? d.sheets.accepterMission
                : recompenseArgent
                  ? tr(d.sheets.recupererMontant, { montant: recompenseArgent })
                  : d.sheets.compris}
            </FloatingActionButton>
          </div>
        </div>
      </div>
    </>
  );
}
