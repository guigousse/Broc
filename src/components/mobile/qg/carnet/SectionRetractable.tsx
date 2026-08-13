"use client";

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { CleSection } from "./useCarnetSections";

interface Props {
  cle: CleSection;
  icone: LucideIcon;
  titre: string;
  sousTitre?: string;
  /** Repliée seulement : `QUÊTES DU JOUR (2/3) · 1 prête`. */
  compteur?: { total: number; faits: number; pretes: number };
  repliee: boolean;
  onBasculer: () => void;
  children: ReactNode;
}

/**
 * En-tête collante pendant que le corps du carnet défile. Le conteneur
 * défilant est le corps du carnet, jamais `window` (le body est verrouillé
 * sur cette app) — `position: sticky` suppose donc un parent sans
 * `overflow: hidden` sur l'axe vertical entre elle et ce conteneur.
 *
 * Le fond DOIT être opaque : une en-tête translucide laisserait le contenu
 * défiler visiblement dessous, ce qui casse l'illusion de collant.
 */
const enTete: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "10px 12px",
  background: "var(--paper-200)",
  border: "none",
  borderBottom: "1px solid var(--brass-500)",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  color: "var(--ink-700)",
};

const titreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const compteurStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 400,
  color: "var(--ink-500)",
  whiteSpace: "nowrap",
};

const finDEnTete: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
};

const sousTitreStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-500)",
  whiteSpace: "nowrap",
};

const chevronStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--ink-500)",
};

/**
 * Une des trois sections du carnet (histoire, quêtes du jour, quêtes de la
 * semaine) : en-tête collante + contenu repliable.
 *
 * Repliée = démontée, pas masquée en CSS : les lignes de quête à l'intérieur
 * tournent des minuteurs d'une seconde, les laisser montées derrière un
 * `display: none` les ferait tourner pour rien.
 *
 * Le compteur d'en-tête repliée est la règle qui rend le repli sans danger :
 * sans lui un joueur pourrait replier une section et ne jamais savoir qu'une
 * quête à l'intérieur est prête à livrer. Il n'apparaît donc que repliée —
 * dépliée, l'information est déjà sous les yeux — et la mention « prête »
 * disparaît quand `pretes === 0`.
 */
export function SectionRetractable({
  icone: Icone,
  titre,
  sousTitre,
  compteur,
  repliee,
  onBasculer,
  children,
}: Props) {
  const { d, tr } = useLangue();

  return (
    <div>
      <button type="button" style={enTete} aria-expanded={!repliee} onClick={onBasculer}>
        <Icone size={16} color="var(--brass-500)" aria-hidden />
        <span style={titreStyle}>{titre}</span>
        {repliee && compteur && (
          <span style={compteurStyle}>
            {tr(d.carnet.sectionCompteur, { faits: compteur.faits, total: compteur.total })}
            {compteur.pretes > 0
              ? tr(
                  compteur.pretes > 1 ? d.carnet.sectionPretes_n : d.carnet.sectionPretes_un,
                  { n: compteur.pretes },
                )
              : ""}
          </span>
        )}
        <span style={finDEnTete}>
          {sousTitre && <span style={sousTitreStyle}>{sousTitre}</span>}
          <span aria-hidden style={chevronStyle}>{repliee ? "▸" : "▾"}</span>
        </span>
      </button>
      {!repliee && children}
    </div>
  );
}
