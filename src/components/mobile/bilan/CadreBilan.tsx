import type { CSSProperties } from "react";
import { BrassCorners } from "@/components/ui/BrassCorners";
import { DecoDivider } from "@/components/ui/DecoDivider";

const cadre: CSSProperties = {
  position: "relative",
  // Papier translucide : la brocante floutée reste devinée derrière.
  background: "rgba(247,244,238,0.90)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 4px rgba(247,244,238,0.9), inset 0 0 0 5px var(--brass-500), 0 6px 18px rgba(15,30,22,0.35)",
  padding: "18px 22px 16px",
  textAlign: "center",
};

/** Éventail de chevrons art déco, en haut à gauche et en haut à droite. */
const eventail: CSSProperties = {
  position: "absolute",
  top: 10,
  display: "flex",
  gap: 2,
  alignItems: "flex-end",
  pointerEvents: "none",
};

const chevron = (h: number): CSSProperties => ({
  width: 3,
  height: h,
  background: "var(--brass-500)",
  opacity: 0.75,
});

const titreStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "clamp(15px, 4.4vw, 19px)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
};

const sousTitreStyle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 15,
  color: "var(--ink-700)",
};

const mentionStyle: CSSProperties = {
  margin: "6px 0 0",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  color: "var(--ink-500)",
};

/** Le chiffre qui compte (bénéfice d'une journée de vente) : plus haut que la
 *  mention courante, dans la teinte forêt des gains. */
const mentionForteStyle: CSSProperties = {
  margin: "8px 0 0",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 17,
  letterSpacing: "0.06em",
  color: "var(--forest-700)",
};

/**
 * Cadre art déco du bilan de session : éventails de chevrons dans les angles
 * hauts, double filet laiton, losange central. Il reste fixe pendant toute la
 * cérémonie — c'est l'ancrage visuel pendant que la liste se vide.
 */
export function CadreBilan({
  titre,
  sousTitre,
  mention,
  mentionSecondaire,
}: {
  titre: string;
  sousTitre: string;
  mention: string;
  /** Second chiffre mis en avant (le bénéfice d'une journée de vente). */
  mentionSecondaire?: string;
}) {
  return (
    <section style={cadre}>
      <BrassCorners inset={6} size={20} />
      <span style={{ ...eventail, left: 30 }} aria-hidden>
        <span style={chevron(6)} />
        <span style={chevron(10)} />
        <span style={chevron(14)} />
      </span>
      <span style={{ ...eventail, right: 30 }} aria-hidden>
        <span style={chevron(14)} />
        <span style={chevron(10)} />
        <span style={chevron(6)} />
      </span>

      <h2 style={titreStyle}>{titre}</h2>
      <div style={{ margin: "10px 0 0" }}>
        <DecoDivider />
      </div>
      <p style={sousTitreStyle}>{sousTitre}</p>
      <p style={mentionStyle}>{mention}</p>
      {mentionSecondaire && <p style={mentionForteStyle}>{mentionSecondaire}</p>}
    </section>
  );
}
