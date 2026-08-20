"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { qgPct } from "@/components/mobile/qg/layout";
import { BAZAR_LAYOUT, type BazarObjetKey } from "./bazarLayout";

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  prix: number;
  jetons: number;
  onAcheter: () => void;
}

/**
 * Un article posé dans la scène : son visuel, son étiquette de prix, et
 * l'état « hors de portée ».
 *
 * Pas de `disabled` natif : un bouton désactivé ne dispatche AUCUN clic et ne
 * le laisse donc jamais remonter à un parent — poser la bulle « il vous
 * manque N jetons » sur le conteneur ne servait à rien tant que le joueur
 * tapait l'image elle-même (la cible la plus naturelle). Le bouton reste
 * toujours actif et focusable, porte `aria-disabled` pour l'état visuel/a11y,
 * et c'est SON PROPRE gestionnaire qui tranche : hors de portée → montre la
 * bulle sans appeler `onAcheter` ; sinon → achète. Un seul gestionnaire vivant,
 * atteint par le tap comme par le clavier — défaut relevé à la revue du
 * 2026-08-20 (round 1).
 */
export function ArticleBazar({ cle, visuel, libelle, prix, jetons, onAcheter }: ArticleBazarProps) {
  const { d, tr } = useLangue();
  const [bulle, setBulle] = useState(false);
  const horsDePortee = jetons < prix;
  const manque = prix - jetons;
  const coord = BAZAR_LAYOUT.objets[cle];

  // La bulle est un aveu ponctuel du tap précédent, pas un état durable : dès
  // que la bourse suffit de nouveau, elle ne doit pas pouvoir réapparaître
  // toute seule si la bourse redescend plus tard dans le même montage.
  useEffect(() => {
    if (!horsDePortee) {
      setBulle(false);
    }
  }, [horsDePortee]);

  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    pointerEvents: "auto",
    display: "grid",
    justifyItems: "center",
    gap: 2,
    filter: horsDePortee ? "grayscale(1) opacity(0.65)" : undefined,
  };

  return (
    <div style={style} data-testid={`article-${cle}`}>
      <button
        type="button"
        aria-label={libelle}
        aria-disabled={horsDePortee}
        onClick={() => {
          if (horsDePortee) {
            setBulle(true);
          } else {
            onAcheter();
          }
        }}
        style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
      >
        {visuel}
      </button>
      <span
        style={{
          fontSize: "0.7rem",
          color: "var(--brass-700)",
          textDecoration: horsDePortee ? "line-through" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
      </span>
      {bulle && horsDePortee && (
        <span role="status" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
          {tr(manque > 1 ? d.bazar.manqueJetons : d.bazar.manqueJetonUn, { n: manque })}
        </span>
      )}
    </div>
  );
}
