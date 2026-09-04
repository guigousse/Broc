"use client";

import type { CSSProperties } from "react";
import { BookOpen, Dice5, Disc3, Lamp, Palette, Shirt, Wrench, type LucideIcon } from "lucide-react";
import { getPiece } from "@/data/pieces";
import { statsDuel } from "@/data/duel/cartesDuel";
import { GABARITS, RATIO_CARTE, fondCarteSrc, type Rect } from "@/data/duel/gabaritCarte";
import { getItemImageUrl, getItemThumbUrl } from "@/lib/itemImages";
import { pieceImageSrc } from "@/lib/pieceImages";
import { libelleTexteDuel } from "@/lib/duel/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { CategorieObjet } from "@/types/game";

/* ── LA CARTE DE DUEL, COMPOSÉE À L'ÉCRAN ──────────────────────────────────
   Le fond peint (`fond-<rarete>.webp`, cadre Art Déco de plus en plus épique
   avec la rareté) ne porte AUCUN texte : nom, coût, série, attaque, PV,
   texte d'effet et numéro sont écrits ICI, par-dessus, dans les zones que
   le fond a laissées vides (`GABARITS`). Décision du 2026-09-04 : les
   textes existent en 4 langues et les stats bougent encore à
   l'équilibrage ; cuire tout ça dans 50 webp voulait dire 200 images à
   refaire à chaque retouche.

   Tout est en `position: absolute` en % du gabarit, et les tailles de
   police en `cqw` (% de la largeur du conteneur) : la même carte tient à
   90 px dans une pochette du classeur et à 300 px dans la fiche. */

const ICONE_SERIE: Record<CategorieObjet, LucideIcon> = {
  Musique: Disc3,
  "Jeux & Loisirs": Dice5,
  "Livres & Papeterie": BookOpen,
  Mode: Shirt,
  Maison: Lamp,
  "Objets d'art": Palette,
  Bricolage: Wrench,
};

/** Encre sur le crème des zones : la même pour les trois raretés. */
const ENCRE = "#2b2016";

/**
 * La taille du nom selon sa longueur : le bandeau fait ~42 % de large pour
 * deux lignes au plus, et « Stylo plume haut de gamme à l'étoile blanche
 * (doré) » n'y tient pas à la taille de « Chapeau de feutre années 50 ».
 * Paliers plutôt qu'une mesure : jsdom ne mesure rien, et trois tailles
 * suffisent à l'œil.
 */
export function tailleNom(nom: string): string {
  if (nom.length <= 22) return "3.6cqw";
  if (nom.length <= 36) return "3cqw";
  return "2.5cqw";
}

function rect(r: Rect): CSSProperties {
  return { position: "absolute", left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` };
}

const medaillon: CSSProperties = {
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "6.4cqw",
  lineHeight: 1,
  color: ENCRE,
};

interface Props {
  id: string;
  /**
   * Vignette : charge la miniature de l'objet source quand la carte n'a pas
   * encore son art, et tait le texte d'effet, illisible sous 120 px et qui
   * ne ferait que salir la pochette.
   */
  thumb?: boolean;
}

export function CarteDuel({ id, thumb = false }: Props) {
  const { d, locale } = useLangue();
  const piece = getPiece(id);
  if (!piece || piece.album !== "classeur") return null;
  const s = statsDuel(id);
  const g = GABARITS[piece.rarete];
  const nom = nomObjet({ templateId: id, nom: piece.nom }, locale);
  const texte = libelleTexteDuel(s.texte, d);
  const Icone = ICONE_SERIE[piece.serie as CategorieObjet];

  // L'art définitif remplit la fenêtre (`cover` : la cellule de planche est
  // au ratio de la fenêtre, à un poil près). Sans art, l'objet source
  // « toonifié » par un filtre, entier dans la fenêtre (`contain`).
  const art = pieceImageSrc(id);
  const placeholder = piece.source
    ? (thumb ? (getItemThumbUrl(piece.source) ?? getItemImageUrl(piece.source)) : getItemImageUrl(piece.source))
    : null;

  return (
    <div
      data-testid="carte-duel"
      data-rarete={piece.rarete}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: RATIO_CARTE,
        containerType: "inline-size",
        backgroundImage: `url(${fondCarteSrc(piece.rarete)})`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div style={{ ...rect(g.fenetre), overflow: "hidden", display: "grid", placeItems: "center" }}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : placeholder ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={placeholder}
            alt=""
            draggable={false}
            style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain", filter: "saturate(1.4) contrast(1.1)" }}
          />
        ) : null}
      </div>

      <div
        data-testid="carte-nom"
        style={{
          ...rect(g.nom),
          display: "grid",
          placeItems: "center",
          padding: "0 2%",
          boxSizing: "border-box",
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: tailleNom(nom),
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          color: ENCRE,
          overflow: "hidden",
        }}
      >
        <span>{nom}</span>
      </div>

      <div style={{ ...rect(g.cout), ...medaillon, color: "#7a5a1e" }} aria-label={d.duel.cout}>
        {s.cout}
      </div>
      <div style={{ ...rect(g.serie), display: "grid", placeItems: "center", color: ENCRE }} aria-hidden>
        <Icone style={{ width: "58%", height: "58%" }} strokeWidth={1.75} />
      </div>
      <div style={{ ...rect(g.attaque), ...medaillon }} aria-label={d.duel.attaque}>
        {s.attaque}
      </div>
      <div style={{ ...rect(g.pv), ...medaillon, color: "#9c2f2f" }} aria-label={d.duel.pv}>
        {s.pv}
      </div>

      <div
        style={{
          ...rect(g.texte),
          boxSizing: "border-box",
          padding: "3% 4% 5%",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "4.2cqw",
          lineHeight: 1.2,
          color: ENCRE,
          overflow: "hidden",
        }}
      >
        {texte && !thumb && <span data-testid="carte-texte">{texte}</span>}
        <span
          data-testid="carte-numero"
          style={{
            position: "absolute",
            right: "4%",
            bottom: "3%",
            fontFamily: "var(--font-mono)",
            fontStyle: "normal",
            fontSize: "2.6cqw",
            letterSpacing: "0.06em",
            opacity: 0.7,
          }}
        >
          {piece.ordre + 1} / 50
        </span>
      </div>
    </div>
  );
}
