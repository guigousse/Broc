"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { etoileCount } from "@/lib/etat";
import { getRarityColors } from "@/lib/rarityColors";
import { BOITE_MYSTERE_IMAGE } from "@/lib/boiteMystere";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { ObjetEnVente } from "@/types/game";

/**
 * Met à l'échelle son contenu (taille naturelle fixe) pour qu'il tienne
 * toujours dans la zone disponible — qui rétrécit quand le tiroir de négo
 * s'ouvre. L'objet reste donc visible entre le header et la bulle du vendeur.
 */
function ScaleToFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const compute = () => {
      const s = getComputedStyle(outer);
      const availH =
        outer.clientHeight -
        parseFloat(s.paddingTop) -
        parseFloat(s.paddingBottom);
      const availW =
        outer.clientWidth -
        parseFloat(s.paddingLeft) -
        parseFloat(s.paddingRight);
      const natH = inner.offsetHeight;
      const natW = inner.offsetWidth;
      if (!natH || !natW) return;
      setScale(Math.min(1, availH / natH, availW / natW));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} style={scaleOuter}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}

const scaleOuter: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  padding: 16,
};

/** Une carte du carrousel de chinage : un objet à négocier, ou le vendeur mystère. */
export type ChineSlide =
  | {
      kind: "item";
      item: ObjetEnVente;
      estRareOuPlus: boolean;
      /** Connaisseur 3 débloqué pour cette catégorie : la cote (valeur de référence) est révélée. */
      coteConnue: boolean;
    }
  | { kind: "mystere" };

/**
 * Rendu de la partie « objet » d'une carte de chinage (sticker). Le vendeur +
 * les actions vivent dans le tiroir rendu sous la carte (ChineNegoDrawer pour
 * un objet, ChineMystereDrawer pour la boîte mystère).
 */
export function ChineSlideVue({ slide }: { slide: ChineSlide }) {
  const { d, tr, locale } = useLangue();

  if (slide.kind === "mystere") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <ScaleToFit>
          <div style={stickerBox}>
            <div style={stickerImg}>
              <ItemSticker
                templateId="boite-mystere"
                categorie="Objets d'art"
                srcOverride={BOITE_MYSTERE_IMAGE}
                fill
                tilt={false}
                eager
                outlinePx={3}
              />
            </div>
            <div style={titre}>{d.sheets.boiteMystereTitre}</div>
          </div>
        </ScaleToFit>
      </div>
    );
  }

  const { item } = slide;
  const { objet, prixVendeur, statut } = item;
  const acquis = statut === "achete";
  const rarity = getRarityColors(objet.rarete);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ScaleToFit>
        <div style={stickerBox}>
          {/* Sticker die-cut, comme la collection. */}
          <div style={stickerImg}>
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              fill
              tilt={false}
              variant={acquis ? "grise" : "normal"}
              thumb
              eager
              outlinePx={3}
            />
          </div>

          <div style={titre}>{nomObjet(objet, locale)}</div>

          <div style={infoRow}>
            <div style={infoCol}>
              <StarRow
                filled={etoileCount(objet.etat)}
                color={rarity.outer}
                size={20}
                gap={3}
                dropShadow
                emptyFill="rgba(255,243,213,0.35)"
                display="flex"
                aria-label={tr(d.chine.etatAriaLabel, {
                  etat: libelleEtat(objet.etat, d),
                })}
              />
              <div style={categorieLigne}>
                <CategorieIcon categorie={objet.categorie} size={15} color="var(--paper-100)" />
                <span>{objet.categorie}</span>
              </div>
            </div>
            <div style={prixCol}>
              <div style={prixLigne}>{prixVendeur} €</div>
              {slide.coteConnue && (
                <div style={coteLigne}>
                  {tr(d.chine.coteLabel, { valeur: objet.prixReferenceReel })}
                </div>
              )}
            </div>
          </div>
        </div>
      </ScaleToFit>
    </div>
  );
}

const stickerBox: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const stickerImg: CSSProperties = {
  width: "min(224px, 60vw)",
  aspectRatio: "1 / 1",
};

const titre: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 17,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
  textAlign: "center",
  textShadow: "0 1px 4px rgba(0,0,0,0.65)",
  lineHeight: 1.15,
};

const infoRow: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
};

const infoCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
};

const categorieLigne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--paper-100)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
};

/** Colonne prix à droite, occupant la double hauteur (état + catégorie). */
const prixCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
};

/** Prix vendeur affiché. */
const prixLigne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 26,
  color: "var(--brass-300)",
  textShadow: "0 1px 4px rgba(0,0,0,0.65)",
};

/** Cote (valeur de référence) — Connaisseur 3. Mono, plus discret que le prix. */
const coteLigne: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.04em",
  color: "var(--brass-700)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
};
