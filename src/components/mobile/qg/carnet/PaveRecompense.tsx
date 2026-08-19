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

type TypeJeton = "argent" | "xp" | "energie" | "bazar";

/** Teintes par type de gain, dans la palette à jetons (aucune valeur codée en dur). */
const JETON_STYLES: Record<TypeJeton, CSSProperties> = {
  argent: { background: "var(--brass-700)", color: "var(--paper-100)", border: "1px solid var(--brass-500)" },
  xp: { background: "var(--paper-300)", color: "var(--ink-700)", border: "1px solid var(--brass-500)" },
  energie: { background: "var(--patina-500)", color: "var(--paper-100)", border: "1px solid var(--patina-500)" },
  bazar: { background: "var(--brass-900)", color: "var(--paper-100)", border: "1px solid var(--brass-500)" },
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

/**
 * Quête pas encore remplie : la récompense est une plaque CREUSÉE dans le
 * papier. L'ombre interne (plus un filet clair en bas, la lumière qui frappe
 * le fond du creux) dit « information à lire », par opposition au bouton
 * livrable qui, lui, sort de la page. Le pointillé d'origine disait « découpe »
 * et se confondait avec les liserés en pointillé du détail déplié.
 */
const paveSourd: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: "6px 8px",
  borderRadius: 8,
  border: "none",
  background: "var(--paper-300)",
  boxShadow: "inset 0 2px 4px rgba(27,24,18,0.20), inset 0 -1px 0 rgba(251,247,238,0.55)",
};

const labelSourd: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-500)",
};

/**
 * Quête prête : LE MÊME pavé se soulève et devient le bouton Livrer. Vert
 * `--forest-600` — la couleur « toi » du jeu (cf. `--nego-joueur` dans la
 * barre de négociation) — plutôt qu'un laiton de plus, qui se serait fondu
 * dans le reste de la fiche.
 *
 * ⚠ Aucune `boxShadow` en ligne ici : le relief ET sa pulsation vivent dans
 * `.broc-pave-livrer` (globals.css). Poser l'ombre statique en ligne la
 * ferait se disputer la cascade avec l'ombre animée.
 *
 * Verrouillé (cérémonie d'une AUTRE quête) : ni vert ni relief — un bouton
 * qui appelle le tap alors qu'il le refusera serait un mensonge.
 */
const paveDore = (verrouille: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  // Centré, et resserré : le pavé mangeait la largeur de la fiche au point de
  // chevaucher le titre des quêtes à trois objets (retour device).
  alignItems: "center",
  gap: 4,
  padding: "6px 8px",
  borderRadius: 8,
  border: "none",
  background: verrouille ? "var(--paper-300)" : "var(--forest-600)",
  ...(verrouille ? { boxShadow: "inset 0 2px 4px rgba(27,24,18,0.20)" } : {}),
  cursor: verrouille ? "default" : "pointer",
  opacity: verrouille ? 0.6 : 1,
  font: "inherit",
  textAlign: "left",
});

const labelDore = (verrouille: boolean): CSSProperties => ({
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: verrouille ? "var(--brass-700)" : "var(--paper-300)",
});

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
      {
        cle: "bazar",
        valeur: recompense.jetons,
        texte: tr(
          recompense.jetons > 1 ? d.carnet.jetonBazarN : d.carnet.jetonBazarUn,
          { n: recompense.jetons },
        ),
      },
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
    <button
      type="button"
      onClick={onLivrer}
      disabled={verrouille}
      className={verrouille ? undefined : "broc-pave-livrer"}
      style={paveDore(verrouille)}
    >
      <span style={labelDore(verrouille)}>{d.carnet.livrer}</span>
      {jetons}
    </button>
  );
}
