"use client";

import { type CSSProperties } from "react";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
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

/** Teintes par type de gain : cire (argent), laiton (xp), vert (énergie), et le
 *  BLEU de la devise pour le Bazar — c'est lui qui distingue un gain en
 *  Bazarcoins d'un gain en euros sur une ligne qui peut porter les deux. */
const JETON_STYLES: Record<"argent" | "xp" | "energie" | "bazar", CSSProperties> = {
  argent: { background: "#6e1f1f", color: "#f4e9cd", border: "1px solid #b03030" },
  xp: { background: "#e3d7b6", color: "#5a4210", border: "1px solid #c8a24a" },
  energie: { background: "#2c5e3f", color: "#f4e9cd", border: "1px solid #4a8a63" },
  bazar: { background: "var(--midnight-800)", color: "var(--azur-400)", border: "1px solid var(--azur-400)" },
};

const jetonBase: CSSProperties = {
  display: "inline-block", padding: "3px 9px", borderRadius: 11,
  fontFamily: "var(--font-serif)", fontSize: 13, fontWeight: 700,
  whiteSpace: "nowrap",
};

export function RecompenseJetons({ recompense, variante, label, allume = false }: Props) {
  const { d, tr } = useLangue();
  const jetons: Array<{
    type: "argent" | "xp" | "energie" | "bazar";
    texte: string;
    signe?: boolean;
  }> = [];
  if (recompense.argent > 0)
    jetons.push({ type: "argent", texte: tr(d.carnet.jetonArgent, { n: recompense.argent }) });
  if (recompense.xp > 0)
    jetons.push({ type: "xp", texte: tr(d.carnet.jetonXp, { n: recompense.xp }) });
  if (recompense.energie > 0)
    jetons.push({ type: "energie", texte: tr(d.carnet.jetonEnergie, { n: recompense.energie }) });
  // Le SIGNE, pas le mot — comme l'énergie montre un éclair. « +3 Bazarcoins »
  // en toutes lettres dans une pastille de 9 px allongeait la ligne du carnet
  // au point de la faire passer à deux lignes. Le mot reste dans l'annonce
  // vocale du groupe (`recompenseAria`, juste en dessous).
  if (recompense.jetons > 0)
    jetons.push({
      type: "bazar",
      texte: tr(d.carnet.jetonBazar, { n: recompense.jetons }),
      signe: true,
    });

  const aria = tr(d.carnet.recompenseAria, {
    argent: recompense.argent, xp: recompense.xp, energie: recompense.energie,
    jetons: recompense.jetons,
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
          style={{
            ...jetonBase,
            ...JETON_STYLES[j.type],
            ...(j.signe
              ? { display: "inline-flex", alignItems: "center", gap: 3 }
              : null),
          }}>
          {j.texte}
          {j.signe ? <BazarcoinIcon size={12} /> : null}
        </span>
      ))}
    </span>
  );
}
