"use client";

import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { CategorieIcon } from "@/components/ui/CategorieIcon";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { StarRow } from "@/components/ui/StarRow";
import { plaqueLaiton } from "@/components/ui/plaqueLaiton";
import { etoileCount } from "@/lib/etat";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie, libelleEtat } from "@/lib/i18n/libelles";
import { getRarityColors } from "@/lib/rarityColors";
import type { CategorieObjet, EtatObjet, Rarete } from "@/types/game";

/* ── LA FICHE D'UN OBJET EN GRAND ────────────────────────────────────────
   Une seule façon de présenter un objet en grand dans le jeu, née au Bazar
   (`ArticleDetailBazar`) et reprise par le stockage puis la collection le
   2026-08-28 : l'objet en sticker, sa rangée d'étoiles, son nom gravé sur la
   plaque de laiton, et sous la plaque une ligne — la valeur à gauche, le
   thème à droite. Ce que chaque fiche ajoute (bouton d'achat, de retrait,
   bannières) vient en `children`, sous la ligne.

   Le voile FLOUTE la pièce derrière lui : la fiche est un moment à part, la
   réserve ou la vitrine n'ont plus à se lire par transparence. */

export const ficheBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  background: "rgba(15,31,24,0.82)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

export const ficheCard: CSSProperties = {
  width: "min(290px, 86vw)",
  maxWidth: "100%",
  position: "relative",
  background: "transparent",
};

const previewWrap: CSSProperties = {
  display: "grid",
  placeItems: "center",
  marginBottom: 28,
  position: "relative",
};

const stickerBox: CSSProperties = {
  width: "min(263px, 75vw)",
  height: "min(263px, 75vw)",
};

/**
 * LA LISTE SOUS LA PLAQUE — prix du marché, prix d'achat, thème. Posée à même
 * le voile sombre, d'où le laiton clair (cf. `messageRefus` au Bazar). Les
 * puces sont de vraies puces (`list-style`), teintées comme le texte.
 */
const liste: CSSProperties = {
  margin: "16px 0 0",
  padding: "0 0 0 22px",
  listStyle: "disc",
  display: "grid",
  gap: 6,
  fontFamily: "var(--font-display)",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.06em",
  color: "var(--brass-300)",
  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
};

/**
 * Le `<li>` reste un `list-item` : un `display: flex` sur lui EFFACE le
 * marqueur (`::marker` n'existe que pour les list-items). Le flex vit dans
 * le `span` intérieur.
 */
const puce: CSSProperties = {
  display: "list-item",
};

const ligne: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

const libelle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  opacity: 0.85,
};

/**
 * LA CROIX — en haut à droite du VOILE, pas de la carte : la carte est
 * transparente et centrée, une croix à son coin flotterait au milieu de
 * l'écran. Sous l'encoche (`safe-area-inset-top`), cible tactile minimale
 * (`--tap-min`), même trait que celle de `PartiesModal`.
 */
const croix: CSSProperties = {
  position: "absolute",
  top: "max(14px, env(safe-area-inset-top))",
  right: 14,
  background: "transparent",
  border: "1px solid var(--brass-500)",
  color: "var(--brass-300)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  minWidth: "var(--tap-min)",
  minHeight: "var(--tap-min)",
};

interface FicheObjetProps {
  templateId: string;
  categorie: CategorieObjet;
  nom: string;
  rarete: Rarete;
  unique?: boolean;
  /** Absent = pas d'étoiles (slot de collection vide, sticker grisé). */
  etat?: EtatObjet;
  /** Sticker grisé (pièce non possédée). */
  grise?: boolean;
  /** Le prix du marché (ou la valeur de la donation). `null` = ligne absente. */
  prixMarche: string | null;
  /**
   * Le prix payé par le joueur. `undefined` = jamais payé (don, quête, boîte
   * mystère) : la ligne écrit alors « 0 € (cadeau) » — elle ne disparaît
   * JAMAIS, l'auteur y tient (2026-08-28). `null` = pas de ligne du tout
   * (slot de collection vide).
   */
  prixAchat: number | null | undefined;
  /** La croix en haut à droite du voile. */
  onClose: () => void;
  /**
   * Remplace le sticker par un visuel personnalisé (ex. `PieceVisuel` pour
   * une pièce du classeur/album — pas un `Objet` du catalogue, `ItemSticker`
   * ne saurait pas la dessiner). Absent = `ItemSticker` habituel.
   */
  visuel?: ReactNode;
  /** Ce que la fiche ajoute sous la ligne valeur/thème. */
  children?: ReactNode;
}

export function FicheObjet({
  templateId,
  categorie,
  nom,
  rarete,
  unique = false,
  etat,
  grise = false,
  prixMarche,
  prixAchat,
  onClose,
  visuel,
  children,
}: FicheObjetProps) {
  const { d } = useLangue();
  const rarityColors = getRarityColors(rarete, unique);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label={d.commun.fermer}
        style={croix}
      >
        <X size={16} strokeWidth={1.5} />
      </button>
      <div style={ficheCard}>
        <div style={previewWrap}>
          <div style={stickerBox} data-testid="fiche-visuel">
            {visuel ?? (
              <ItemSticker
                templateId={templateId}
                categorie={categorie}
                etat={etat}
                fill
                tilt={false}
                variant={grise ? "grise" : "normal"}
                eager
              />
            )}
          </div>
        </div>

        {/* L'ÉTAT, collé à l'objet — l'objet, son état, son nom. La teinte est
          celle de la rareté (doré pour une pièce unique), l'ombre rend les
          étoiles lisibles sur le voile. */}
        {etat && (
          <span
            data-testid="etoiles-fiche"
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
            }}
            aria-label={`${d.inventaire.etatMot} : ${libelleEtat(etat, d)}`}
          >
            <StarRow
              filled={etoileCount(etat)}
              color={rarityColors.outer}
              size={20}
              display="flex"
              gap={3}
              dropShadow
            />
          </span>
        )}

        <div style={plaqueLaiton} data-testid="fiche-plaque">
          {nom}
        </div>

        <ul style={liste} data-testid="fiche-liste">
          {prixMarche !== null && (
            <li style={puce}>
              <span style={ligne}>
                <span style={libelle}>{d.inventaire.prixMarche} :</span>
                <span
                  data-testid="fiche-valeur"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {prixMarche}
                </span>
              </span>
            </li>
          )}
          {prixAchat !== null && (
            <li style={puce}>
              <span style={ligne}>
                <span style={libelle}>{d.inventaire.prixAchat} :</span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {prixAchat === undefined
                    ? d.inventaire.prixAchatCadeau
                    : `${prixAchat} €`}
                </span>
              </span>
            </li>
          )}
          <li style={puce}>
            <span style={ligne}>
              <span style={libelle}>{d.inventaire.themeMot} :</span>
              <span data-testid="fiche-theme" style={ligne}>
                <CategorieIcon
                  categorie={categorie}
                  size={15}
                  strokeWidth={1.5}
                  color="var(--brass-300)"
                />
                <span>{libelleCategorie(categorie, d)}</span>
              </span>
            </span>
          </li>
        </ul>

        {children}
      </div>
    </>
  );
}
