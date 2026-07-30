"use client";

import type { CSSProperties } from "react";
import { MonitorPlay } from "lucide-react";
import { CartelPub } from "@/components/ui/CartelPub";
import { namePlateStyle } from "@/components/ui/namePlate";
import { VENDEUR_MYSTERE_ILLUSTRATION } from "@/lib/boiteMystere";
import { useLangue } from "@/lib/i18n/LangueContext";

/**
 * Tiroir du vendeur mystère — même structure que ChineNegoDrawer (perso qui
 * flotte + bandeau nom pleine largeur), et désormais le même bandeau laiton :
 * c'est le costume vert du personnage qui le distingue, pas l'interface. Une
 * seule action, portée par le cartel de visionnage commun à tout le jeu.
 */
export function ChineMystereDrawer({
  plein,
  boiteReclamee,
  onOuvrirBoite,
}: {
  plein: boolean;
  boiteReclamee: boolean;
  onOuvrirBoite: () => void;
}) {
  const { d } = useLangue();
  return (
    <div style={drawerStyle}>
      <div style={imageZone}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VENDEUR_MYSTERE_ILLUSTRATION} alt={d.chine.vendeurMystere} style={vendeurImg} />
        <div style={rightZone}>
          {boiteReclamee ? (
            <span style={statutTexte("var(--brass-700)")}>{d.chine.boiteDejaOuverte}</span>
          ) : plein ? (
            <span style={statutTexte("var(--vermillion-600)")}>{d.qg.stockagePlein}</span>
          ) : (
            <CartelPub
              onClick={onOuvrirBoite}
              ariaLabel={d.sheets.pourOuvrirLaBoiteA11y}
              style={{ width: "100%", marginBottom: 10, padding: "10px 18px", gap: 8 }}
            >
              <MonitorPlay size={26} strokeWidth={2.2} aria-hidden />
              {d.sheets.pourOuvrirLaBoite}
            </CartelPub>
          )}
        </div>
      </div>

      <div style={namePlate}>{d.chine.vendeurMystere}</div>
    </div>
  );
}

const drawerStyle: CSSProperties = {
  flex: "none",
  background: "transparent",
  overflow: "hidden",
  overscrollBehavior: "contain",
  touchAction: "none",
};

const imageZone: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 12,
  padding: "8px 16px 0",
};

const vendeurImg: CSSProperties = {
  height: "clamp(143px, 21vh, 182px)",
  width: "auto",
  objectFit: "contain",
  flex: "0 0 auto",
};

const rightZone: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
};

/** Même statut que le tiroir de négo : laiton foncé pour un fait acquis,
 *  vermillon pour un blocage. */
const statutTexte = (color: string): CSSProperties => ({
  marginBottom: 10,
  color,
  fontSize: 14,
  fontFamily: "var(--font-display)",
});

/** Le bandeau des vendeurs, sans exception — même appel que ChineNegoDrawer. */
const namePlate = namePlateStyle("12px 12px 0 0");
