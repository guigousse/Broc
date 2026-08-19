"use client";

import { type CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { RecompenseEffective } from "@/lib/recompenses";

interface Props {
  recompense: RecompenseEffective;
  variante: "bandeau" | "ligne";
  label?: string;
  allume?: boolean;
}

const bandeau = (allume: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  padding: "8px 12px",
  borderTop: allume ? "1px solid #c8a24a" : "1px dashed rgba(110,31,31,0.25)",
  background: allume ? "rgba(200,162,74,0.14)" : "rgba(234,223,192,0.5)",
});

const ligne: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
};

const labelStyle = (allume: boolean): CSSProperties => ({
  fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: allume ? "#2c5e3f" : "#6e1f1f", marginRight: "auto",
});

/** Teintes par type de gain : cire (argent), laiton (xp), vert (énergie), laiton
 *  foncé (jetons du Bazar — distinct du laiton clair de l'XP). */
const JETON_STYLES: Record<"argent" | "xp" | "energie" | "bazar", CSSProperties> = {
  argent: { background: "#6e1f1f", color: "#f4e9cd", border: "1px solid #b03030" },
  xp: { background: "#e3d7b6", color: "#5a4210", border: "1px solid #c8a24a" },
  energie: { background: "#2c5e3f", color: "#f4e9cd", border: "1px solid #4a8a63" },
  bazar: { background: "var(--brass-800)", color: "#f4e9cd", border: "1px solid #c8a24a" },
};

const jetonBase: CSSProperties = {
  display: "inline-block", padding: "3px 9px", borderRadius: 11,
  fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
  whiteSpace: "nowrap",
};

export function RecompenseJetons({ recompense, variante, label, allume = false }: Props) {
  const { d, tr } = useLangue();
  const jetons: Array<{ type: "argent" | "xp" | "energie" | "bazar"; texte: string }> = [];
  if (recompense.argent > 0)
    jetons.push({ type: "argent", texte: tr(d.carnet.jetonArgent, { n: recompense.argent }) });
  if (recompense.xp > 0)
    jetons.push({ type: "xp", texte: tr(d.carnet.jetonXp, { n: recompense.xp }) });
  if (recompense.energie > 0)
    jetons.push({ type: "energie", texte: tr(d.carnet.jetonEnergie, { n: recompense.energie }) });
  if (recompense.jetons > 0)
    jetons.push({
      type: "bazar",
      texte: tr(
        recompense.jetons > 1 ? d.carnet.jetonBazarN : d.carnet.jetonBazarUn,
        { n: recompense.jetons },
      ),
    });

  const aria = tr(d.carnet.recompenseAria, {
    argent: recompense.argent, xp: recompense.xp, energie: recompense.energie,
  });

  return (
    <span
      style={variante === "bandeau" ? bandeau(allume) : ligne}
      role="group"
      aria-label={aria}
    >
      {variante === "bandeau" && label ? (
        <span style={labelStyle(allume)}>{label}</span>
      ) : null}
      {jetons.map((j) => (
        <span key={j.type} data-testid={`jeton-${j.type}`} data-jeton={j.type}
          style={{ ...jetonBase, ...JETON_STYLES[j.type] }}>
          {j.texte}
        </span>
      ))}
    </span>
  );
}
