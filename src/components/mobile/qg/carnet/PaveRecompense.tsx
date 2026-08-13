"use client";

import type { CSSProperties } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { RecompenseEffective } from "@/lib/recompenses";

interface Props {
  recompense: RecompenseEffective;
  livrable: boolean;
  /** Cérémonie d'une AUTRE quête en cours : bouton grisé, tap refusé. */
  verrouille?: boolean;
  onLivrer: () => void;
}

type TypeJeton = "argent" | "xp" | "energie";

/** Teintes par type de gain, dans la palette à jetons (aucune valeur codée en dur). */
const JETON_STYLES: Record<TypeJeton, CSSProperties> = {
  argent: { background: "var(--brass-700)", color: "var(--paper-100)", border: "1px solid var(--brass-500)" },
  xp: { background: "var(--paper-300)", color: "var(--ink-700)", border: "1px solid var(--brass-500)" },
  energie: { background: "var(--patina-500)", color: "var(--paper-100)", border: "1px solid var(--patina-500)" },
};

const jetonBase: CSSProperties = {
  display: "inline-block",
  padding: "3px 9px",
  borderRadius: 11,
  fontFamily: "var(--font-serif)",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const paveSourd: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px dashed var(--ink-300)",
  background: "var(--paper-300)",
};

const labelSourd: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
};

const paveDore = (verrouille: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--brass-500)",
  background: verrouille ? "var(--paper-300)" : "var(--brass-100)",
  cursor: verrouille ? "default" : "pointer",
  opacity: verrouille ? 0.6 : 1,
  font: "inherit",
  textAlign: "left",
});

const labelDore: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const jetonsWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

/**
 * Pavé de droite d'une quête. Tant qu'elle n'est pas remplie il montre la
 * récompense ; dès qu'elle l'est, LE MÊME pavé s'allume et devient le bouton
 * Livrer. La cérémonie d'envol part donc de l'endroit exact où les jetons
 * étaient dessinés.
 *
 * ⚠ Chaque jeton porte `data-jeton` : c'est par cet attribut que la cérémonie
 * les retrouve pour les masquer et lancer leur clone. Un gain nul ne produit
 * PAS de jeton — la cérémonie n'émet d'étape que pour les gains non nuls, et un
 * jeton masqué sans étape de retour resterait invisible pour toute la partie.
 */
export function PaveRecompense({ recompense, livrable, verrouille = false, onLivrer }: Props) {
  const { d, tr } = useLangue();

  const gains: { cle: TypeJeton; valeur: number; texte: string }[] = (
    [
      { cle: "argent", valeur: recompense.argent, texte: tr(d.carnet.jetonArgent, { n: recompense.argent }) },
      { cle: "xp", valeur: recompense.xp, texte: tr(d.carnet.jetonXp, { n: recompense.xp }) },
      { cle: "energie", valeur: recompense.energie, texte: tr(d.carnet.jetonEnergie, { n: recompense.energie }) },
    ] as { cle: TypeJeton; valeur: number; texte: string }[]
  ).filter((g) => g.valeur > 0);

  const jetons = (
    <span style={jetonsWrap}>
      {gains.map((g) => (
        <span key={g.cle} data-jeton={g.cle} style={{ ...jetonBase, ...JETON_STYLES[g.cle] }}>
          {g.texte}
        </span>
      ))}
    </span>
  );

  if (!livrable) {
    return (
      <div style={paveSourd}>
        <span style={labelSourd}>{d.carnet.recompenseLabel}</span>
        {jetons}
      </div>
    );
  }

  return (
    <button type="button" onClick={onLivrer} disabled={verrouille} style={paveDore(verrouille)}>
      <span style={labelDore}>{d.carnet.livrer}</span>
      {jetons}
    </button>
  );
}
