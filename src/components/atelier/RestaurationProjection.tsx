"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { etoileCount } from "@/lib/etat";
import { getRarityColors } from "@/lib/rarityColors";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import type { EtatObjet, Objet } from "@/types/game";

/**
 * Le voyage d'un objet à l'établi : son état d'aujourd'hui, une flèche, son
 * état projeté. Le temps restant se pose au-dessus de la flèche, l'action
 * (accélérer) en dessous — c'est la colonne du milieu qui porte le tempo,
 * les deux côtés ne montrent que l'objet.
 *
 * Même vocabulaire d'étoiles que la ligne d'atelier (`AtelierItemRow`) : la
 * teinte dit la rareté, le compte dit l'état, et le pristin brille de
 * lui-même (`ItemSticker` reçoit l'état).
 */

interface RestaurationProjectionProps {
  objet: Objet;
  etatCible: EtatObjet;
  /** Au-dessus de la flèche — le temps restant. */
  entete: ReactNode;
  /** Sous la flèche — le bouton d'accélération. */
  action: ReactNode;
}

const grille: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 10,
};

const cote: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
};

const milieu: CSSProperties = {
  ...cote,
  gap: 8,
};

const etatMot: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  textAlign: "center",
};

const VIGNETTE = 76;

export function RestaurationProjection({
  objet,
  etatCible,
  entete,
  action,
}: RestaurationProjectionProps) {
  const { d } = useLangue();
  const rarity = getRarityColors(
    objet.rarete,
    !!getTemplate(objet.templateId)?.unique,
  );

  const cotePresente = (etat: EtatObjet, testId: string) => (
    <div style={cote} data-testid={testId}>
      <ItemSticker
        templateId={objet.templateId}
        categorie={objet.categorie}
        size={VIGNETTE}
        tilt={false}
        variant="normal"
        etat={etat}
        thumb
        eager
      />
      {/* Wrapper porteur du data-attribut : StarRow n'accepte pas d'attribut
          arbitraire, et l'icône de catégorie du sticker est elle aussi un
          <svg> — sans cette boîte, compter les étoiles compterait aussi elle. */}
      <span
        data-testid={`${testId}-etoiles`}
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        <StarRow filled={etoileCount(etat)} color={rarity.outer} size={14} />
      </span>
      <span style={etatMot}>{libelleEtat(etat, d)}</span>
    </div>
  );

  return (
    <div style={grille}>
      {cotePresente(objet.etat, "projection-avant")}
      <div style={milieu}>
        {entete}
        <ArrowRight size={26} strokeWidth={1.8} color="var(--brass-700)" />
        {action}
      </div>
      {cotePresente(etatCible, "projection-apres")}
    </div>
  );
}
