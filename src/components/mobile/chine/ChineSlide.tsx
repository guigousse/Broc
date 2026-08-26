"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Album, Check } from "lucide-react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { etoileCount } from "@/lib/etat";
import { getRarityColors, type RarityColors } from "@/lib/rarityColors";
import { BOITE_MYSTERE_IMAGE } from "@/lib/boiteMystere";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import type { ObjetEnVente } from "@/types/game";
import { TamponEncreur } from "@/components/ui/TamponEncreur";

// Agrandissement max du sticker au-delà de sa taille naturelle. Les images
// objets sont en 470 px : la taille de base (≈224 px) × 2 reste sous la
// résolution native (≈448 px) → net. Permet de remplir l'espace sur les
// grands écrans (iPad) au lieu de laisser l'objet minuscule et centré.
const SCALE_MAX = 2;

/**
 * Met à l'échelle son contenu (taille naturelle fixe) pour qu'il occupe au
 * mieux la zone disponible — qui rétrécit quand le tiroir de négo s'ouvre.
 * Réduit pour tenir (petit écran / tiroir ouvert) ET agrandit jusqu'à
 * SCALE_MAX pour remplir (grand écran), toujours borné par l'espace réel.
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
      setScale(Math.min(SCALE_MAX, availH / natH, availW / natW));
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
      /** Le Flair v2 (cote déjà connue) : prix plancher du vendeur révélé —
       *  valeur EFFECTIVE, bonus Marchandage déjà appliqué. Absent sinon. */
      plancherRevele?: number;
      /** Le template a déjà été possédé au moins une fois : badge collection ✓. */
      dejaPossede: boolean;
      /**
       * Le template n'avait jamais été croisé avant cette carte : rayons de
       * découverte + pill « Nouveau ». Calculé par la page de chinage AVANT
       * que la session ne soit marquée vue en bloc.
       */
      estNouveau: boolean;
    }
  | { kind: "mystere" };

/**
 * Rendu de la partie « objet » d'une carte de chinage (sticker). Le vendeur +
 * les actions vivent dans le tiroir rendu sous la carte (ChineNegoDrawer pour
 * un objet, ChineMystereDrawer pour la boîte mystère).
 */
/**
 * `plein` : le stockage du joueur est saturé. Contrairement à `acquis` et
 * `vendeurFache`, qui se déduisent de l'objet, c'est un état GLOBAL — il
 * tamponne donc toutes les cartes à la fois, ce qui est le message voulu :
 * plus rien n'est prenable tant qu'on n'a pas fait de la place.
 */
export function ChineSlideVue({ slide, plein = false }: { slide: ChineSlide; plein?: boolean }) {
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
  const vendeurFache = !acquis && item.negociation?.statut === "fache";
  const rarity = getRarityColors(objet.rarete);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ScaleToFit>
        <div style={stickerBox}>
          {/* Le bloc titre est en `position: relative` pour ancrer la pill :
              son centre se pose exactement sur le coin inférieur droit du
              texte (translate 50%/50% depuis right/bottom 0). Le bloc épouse
              le texte — sauf nom sur deux lignes, où la dernière ligne étant
              centrée, la pill se cale sur le coin du bloc. */}
          <div style={titre}>
            {nomObjet(objet, locale)}
            {slide.estNouveau && (
              <span style={pillAncrage}>
                <span
                  className="broc-pill-nouveau"
                  style={pillNouveau(rarity)}
                >
                  {d.chine.nouveauPill}
                </span>
              </span>
            )}
          </div>

          <div style={infoRow}>
            <div style={infoCol}>
              <div style={etatLigne}>
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
                {slide.dejaPossede && (
                  <span role="img" aria-label={d.chine.dejaPossedeAria} style={badgeCollection}>
                    <Album size={13} strokeWidth={2.2} />
                    <span style={badgeCheck}>
                      <Check size={8} strokeWidth={4} />
                    </span>
                  </span>
                )}
              </div>
              <div style={categorieLigne}>
                <CategorieIcon categorie={objet.categorie} size={15} color="var(--paper-100)" />
                <span>{libelleCategorie(objet.categorie, d)}</span>
              </div>
            </div>
            <div style={prixCol}>
              <div style={prixLigne}>{prixVendeur} €</div>
              {slide.coteConnue && (
                <div
                  style={loupeBox}
                  role="img"
                  aria-label={tr(d.chine.coteLabel, {
                    valeur: objet.prixReferenceReel,
                  })}
                >
                  <span style={loupeLentille}>
                    {objet.prixReferenceReel}€
                  </span>
                  <span style={loupeManche} aria-hidden />
                </div>
              )}
              {slide.plancherRevele !== undefined && (
                <div style={plancherLigne}>
                  {tr(d.chine.plancherLabel, { valeur: slide.plancherRevele })}
                </div>
              )}
            </div>
          </div>

          {/* Sticker die-cut, comme la collection. */}
          <div style={stickerImg}>
            <ItemSticker
              templateId={objet.templateId}
              categorie={objet.categorie}
              etat={objet.etat}
              fill
              tilt={false}
              variant={acquis || vendeurFache || plein ? "grise" : "normal"}
              thumb
              eager
              outlinePx={3}
            />
            {/* Tampon encreur en diagonale : VENDU (vert), VENDEUR FÂCHÉ ou
                STOCK PLEIN (rouge). Décoratif — le tiroir de négo porte
                l'annonce pour les lecteurs d'écran.

                ⚠ Ordre de priorité, pas un simple `||` : acheter REMPLIT le
                stockage, donc la carte que l'on vient d'acquérir serait
                aussitôt « Stock plein » — elle annoncerait l'empêchement au
                lieu de la réussite. `acquis` passe donc en premier. */}
            {(acquis || vendeurFache || plein) && (
              <TamponEncreur
                encre={acquis ? "var(--forest-600)" : "var(--vermillion-500)"}
              >
                {acquis
                  ? d.chine.tamponVendu
                  : vendeurFache
                  ? d.chine.vendeurFache
                  : d.chine.tamponStockPlein}
              </TamponEncreur>
            )}
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
  position: "relative",
  width: "min(224px, 60vw)",
  aspectRatio: "1 / 1",
};

const titre: CSSProperties = {
  position: "relative",
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

/**
 * Ancrage de la pill : son CENTRE tombe sur le coin inférieur droit du texte.
 * Le positionnement est isolé ici pour que la pulsation, portée par la pill
 * elle-même, s'exerce autour de son propre centre sans la faire dériver.
 */
const pillAncrage: CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  transform: "translate(50%, 50%)",
  display: "inline-flex",
};

/**
 * Pill « Nouveau » aux couleurs de la rareté, en médaillon sur le nom. Elle
 * bat en continu (cf. .broc-pill-nouveau) : c'est elle, désormais, qui porte
 * seule la fête de la découverte.
 */
const pillNouveau = (rarity: RarityColors): CSSProperties => ({
  // Couleur du halo lâché à chaque battement, lue par la keyframe.
  ["--pill-halo" as string]: rarity.accent,
  padding: "2px 7px",
  borderRadius: 999,
  background: rarity.outer,
  border: `1px solid ${rarity.accent}`,
  color: rarity.thumbIcon,
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 9,
  letterSpacing: "0.12em",
  lineHeight: 1.3,
  whiteSpace: "nowrap",
  textShadow: "none",
  boxShadow: "0 1px 5px rgba(0,0,0,0.45)",
});

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

/** Prix à gauche, loupe de cote (si connue) à sa droite. */
const prixCol: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
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

/* Cote (valeur de référence) — atout Flair 🔍 ou Connaisseur 3.
   Affichée dans une loupe : lentille cerclée + manche incliné. */
const loupeBox: CSSProperties = {
  position: "relative",
  // Réserve la place du manche pour ne pas décentrer la lentille.
  marginRight: 8,
  marginBottom: 6,
};

const loupeLentille: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "3px solid var(--brass-300)",
  background: "rgba(15,30,22,0.5)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  color: "var(--brass-300)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
};

/* Plancher du vendeur (Le Flair v2) — petit tampon sous la loupe. */
const plancherLigne: CSSProperties = {
  marginBottom: 4,
  padding: "2px 8px",
  borderRadius: 8,
  border: "1.5px dashed var(--brass-300)",
  background: "rgba(15,30,22,0.5)",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 12,
  color: "var(--brass-300)",
  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
  whiteSpace: "nowrap",
};

/* Manche de la loupe. Son sommet est ancré SUR le bord de la lentille au
   point à 45° bas-droite (≈ (35, 35) pour un cercle de 42 px), puis la
   barre pivote de -45° autour de ce sommet pour partir vers le bas-droite. */
const loupeManche: CSSProperties = {
  position: "absolute",
  right: 5,
  bottom: -7,
  width: 4,
  height: 15,
  borderRadius: 2,
  background: "var(--brass-300)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
  transform: "rotate(-45deg)",
  transformOrigin: "top center",
};

/** Étoiles d'état + badge collection sur la même ligne. */
const etatLigne: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

/** Badge collection : logo Album + ✓ en médaillon, l'objet est déjà possédé. */
const badgeCollection: CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "1.5px solid var(--brass-300)",
  background: "rgba(15,30,22,0.55)",
  color: "var(--paper-100)",
};

/** Coche verte en médaillon bas-droite du badge. */
const badgeCheck: CSSProperties = {
  position: "absolute",
  right: -4,
  bottom: -4,
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: "var(--brass-300)",
  color: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
