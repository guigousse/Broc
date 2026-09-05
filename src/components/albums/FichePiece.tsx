"use client";

import type { CSSProperties, ReactNode } from "react";
import { FicheObjet, ficheBackdrop } from "@/components/ui/FicheObjet";
import { PieceVisuel } from "@/components/pieces/PieceVisuel";
import { RATIO_CARTE } from "@/data/duel/gabaritCarte";
import { CATEGORIE_ALBUM, getPiece, type ThemeTimbre } from "@/data/pieces";
import { nomObjet } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { DictionnaireUI } from "@/lib/i18n/ui";

/* ── LA FICHE D'UNE PIÈCE (carte/timbre) ─────────────────────────────────
   Réutilise `FicheObjet` (né au Bazar, repris par le stockage puis la
   collection) : une pièce n'a ni prix de marché ni prix d'achat (elle ne se
   vend/s'achète pas comme un objet), ni ÉTAT (pas d'étoiles), et son visuel
   n'est pas un `ItemSticker` — c'est un `PieceVisuel` (carte composée ou
   timbre dentelé), d'où la prop `visuel` de `FicheObjet`. Se pose PAR-DESSUS
   un `AlbumShell` (zIndex 106 > 105).

   Une CARTE porte déjà tout sur son propre fond — nom, catégorie, coût,
   attaque, PV, texte d'effet : la fiche ne répète rien (ni thème, ni série,
   ni ligne de duel) et lui laisse la place, en grand (retour Guillaume
   2026-09-05). Un timbre garde sa ligne « Série » : le thème ne se lit pas
   sur le timbre. */

interface FichePieceProps {
  id: string;
  quantite: number;
  onClose: () => void;
  children?: ReactNode;
}

const backdrop: CSSProperties = { ...ficheBackdrop, zIndex: 106 };

const ligneSerie: CSSProperties = {
  marginTop: 10,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textAlign: "center",
  color: "var(--brass-300)",
  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
};

/** La carte en grand : la hauteur de l'écran, au format 5:7, plafonnée. */
const boiteCarte: CSSProperties = {
  height: "52vh",
  maxHeight: 420,
  aspectRatio: RATIO_CARTE,
};

function libelleTheme(theme: ThemeTimbre, d: DictionnaireUI): string {
  switch (theme) {
    case "voyage":
      return d.albums.theme_voyage;
    case "faune":
      return d.albums.theme_faune;
    case "monuments":
      return d.albums.theme_monuments;
    case "celebrites":
      return d.albums.theme_celebrites;
    case "culture-pop":
      return d.albums["theme_culture-pop"];
  }
}

export function FichePiece({
  id,
  quantite,
  onClose,
  children,
}: FichePieceProps) {
  const { d, tr, locale } = useLangue();
  const piece = getPiece(id);
  if (!piece) return null;
  const carte = piece.album === "classeur";

  return (
    <div
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FicheObjet
        templateId={id}
        categorie={CATEGORIE_ALBUM[piece.album]}
        nom={nomObjet({ templateId: id, nom: piece.nom }, locale)}
        rarete={piece.rarete}
        prixMarche={null}
        prixAchat={null}
        visuel={<PieceVisuel id={id} />}
        boiteVisuel={carte ? boiteCarte : undefined}
        sansTheme={carte}
        onClose={onClose}
      >
        {carte ? (
          quantite > 1 && <div style={ligneSerie}>{tr(d.albums.doublon, { n: quantite })}</div>
        ) : (
          <div style={ligneSerie}>
            {tr(d.albums.serie, { serie: libelleTheme(piece.serie as ThemeTimbre, d) })}
            {quantite > 1 && <> · {tr(d.albums.doublon, { n: quantite })}</>}
          </div>
        )}
        {children}
      </FicheObjet>
    </div>
  );
}
