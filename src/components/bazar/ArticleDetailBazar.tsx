"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { useLangue } from "@/lib/i18n/LangueContext";
import type { CategorieObjet } from "@/types/game";

/**
 * L'article présenté en grand. Deux genres, parce que l'étal en vend deux :
 * les objets du catalogue de l'étagère du haut (une gamme de prix par case),
 * et les lots de pièces de restauration — qui ne sont PAS des objets (aucun
 * `templateId`, aucune illustration) et se représentent par leur engrenage.
 *
 * `categorie` peut être `null` du côté objet : un `templateId` retiré du
 * catalogue reste en vente, mais on ne sait alors plus rien de lui. Même
 * traitement que sur l'étagère — aucun visuel, l'article reste achetable.
 */
export type ArticleDetail =
  | {
      genre: "objet";
      templateId: string;
      categorie: CategorieObjet | null;
      libelle: string;
      prix: number;
    }
  | {
      genre: "pieces";
      categorie: CategorieObjet;
      quantite: number;
      libelle: string;
      prix: number;
    };

/**
 * Ce que rend une tentative d'achat, vue de l'écran : la forme exacte de
 * `GameContext.acheterAuBazar`. La `raison` est DÉJÀ localisée — aucune clé
 * brute ne remonte jamais jusqu'ici.
 */
export type ResultatAchatBazar = { ok: boolean; raison?: string };

interface ArticleDetailBazarProps {
  article: ArticleDetail | null;
  open: boolean;
  /** La bourse du joueur, en jetons. */
  jetons: number;
  /**
   * Tente l'achat. La fiche ne se referme que si le retour est `ok` : un refus
   * est précisément le moment où le joueur a besoin de RESTER pour lire
   * pourquoi.
   */
  onAcheter: () => ResultatAchatBazar;
  onClose: () => void;
}

/* ── La chrome de la fiche ─────────────────────────────────────────────────
   Reprise trait pour trait de `ObjetDetailOverlay` (le détail d'un objet du
   stockage) : même voile, même largeur de carte, même cartouche à filets, même
   fermeture au tap sur le voile. Le Bazar ne doit pas inventer une deuxième
   façon de présenter un objet en grand.

   Les constantes sont redéclarées ici plutôt qu'importées, comme le fait déjà
   `CollectionDetailOverlay` : c'est la convention du dépôt pour ces fiches.
   Toute divergence devra donc être un geste délibéré, jamais un effet de bord.

   Ce qui n'en vient PAS : le bouton d'achat, absent de la fiche de stockage —
   il reprend le CTA de `ConcessionSheet` (l'autre achat en fiche du jeu). */

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 105,
  background: "rgba(15,31,24,0.82)",
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const CARD_WIDTH = "min(290px, 86vw)";

const card: CSSProperties = {
  width: CARD_WIDTH,
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

/** Même boîte, mais l'engrenage d'un lot a une taille FIXE : on le centre. */
const pieceBox: CSSProperties = {
  ...stickerBox,
  display: "grid",
  placeItems: "center",
};

const titreCard: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 14,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--forest-800)",
  fontWeight: 700,
  textAlign: "center",
  paddingBottom: 10,
  borderBottom: "1px dotted var(--brass-500)",
};

const prixCard: CSSProperties = {
  position: "relative",
  background: "var(--paper-100)",
  border: "1px solid var(--brass-500)",
  boxShadow:
    "inset 0 0 0 2px var(--paper-100), inset 0 0 0 3px var(--brass-700), 0 10px 20px rgba(0,0,0,0.3)",
  padding: "20px 22px",
};

const prixRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  padding: "10px 0",
  borderBottom: "none",
};

const prixLabel: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--brass-700)",
};

const prixValue: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontFamily: "var(--font-display)",
  fontSize: 14,
  color: "var(--forest-800)",
  fontWeight: 600,
};

/** Le CTA d'achat — celui de `ConcessionSheet`, l'autre achat en fiche du jeu. */
const boutonAcheter = (peut: boolean): CSSProperties => ({
  width: "100%",
  minHeight: 46,
  marginTop: 6,
  border: "1px solid var(--brass-500)",
  borderRadius: "var(--radius-btn)",
  background: peut ? "var(--forest-800)" : "var(--paper-200)",
  color: peut ? "var(--brass-300)" : "var(--ink-300)",
  fontFamily: "var(--font-display)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  // `cursor: pointer` même hors de portée : le bouton RÉPOND (il dit le
  // manque), il n'est pas mort. `not-allowed` mentirait.
  cursor: "pointer",
  opacity: peut ? 1 : 0.75,
});

const messageManque: CSSProperties = {
  display: "block",
  marginTop: 8,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--brass-700)",
};

/** Côté de l'engrenage d'un lot de pièces vu en grand, en px. */
const TAILLE_PIECE_GRANDE = 150;

/**
 * La fiche d'un article du Bazar : l'article en grand, son nom, son prix en
 * jetons, et le bouton qui l'achète.
 *
 * Taper un article sur l'étagère l'achetait autrefois SUR-LE-CHAMP — un tap
 * mal placé coûtait une semaine de jetons sans rien demander. L'auteur a
 * réclamé cette étape à la recette du 2026-08-20 : le tap ouvre, c'est ici
 * qu'on achète.
 *
 * Le bouton d'achat n'est JAMAIS `disabled` nativement. La raison est la même
 * que sur l'étagère et vaut d'être redite : un bouton désactivé ne dispatche
 * aucun clic, donc il ne peut rien expliquer — pas même « il vous manque N
 * jetons », qui est précisément ce que le joueur a besoin de lire. Il porte
 * `aria-disabled` pour l'état, reste focusable, et c'est son propre
 * gestionnaire qui tranche.
 */
export function ArticleDetailBazar({
  article,
  open,
  jetons,
  onAcheter,
  onClose,
}: ArticleDetailBazarProps) {
  const { d, tr } = useLangue();
  const [manqueVu, setManqueVu] = useState(false);
  /** La raison d'un refus VENU DU JEU (stockage plein, article parti…). */
  const [refus, setRefus] = useState<string | null>(null);

  const prix = article?.prix ?? 0;
  const horsDePortee = jetons < prix;
  const manque = prix - jetons;

  // Fermeture au clavier : le voile se tape à la souris et au doigt, mais rien
  // ne l'atteint au clavier. Même idiome que les sheets du QG.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Le message du manque est l'aveu d'un tap précis sur CET article : il ne
  // doit pas survivre à la fermeture de la fiche, ni se traîner d'un article
  // au suivant, ni rester affiché si la bourse redevient suffisante.
  //
  // La dépendance est la VALEUR de l'article, pas sa référence : un appelant
  // qui reconstruirait l'objet à chaque rendu remettrait sinon le message à
  // zéro à la frame suivante, et le joueur ne verrait jamais son chiffre.
  // `JSON.stringify` plutôt qu'une concaténation à séparateur : deux articles
  // distincts ne peuvent pas produire la même clé, et le résultat reste de
  // l'ASCII lisible. Un séparateur exotique avait servi ici — il déposait de
  // vrais octets NUL dans le fichier source, que `grep` traitait alors comme
  // un binaire.
  const cleArticle = article
    ? JSON.stringify([article.genre, article.libelle, article.prix])
    : "";
  useEffect(() => {
    setManqueVu(false);
    setRefus(null);
  }, [open, cleArticle]);
  useEffect(() => {
    if (!horsDePortee) setManqueVu(false);
  }, [horsDePortee]);

  if (!open || !article) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={d.bazar.detailArticle}
      style={backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={card}>
        <div style={previewWrap}>
          {article.genre === "objet" ? (
            <div style={stickerBox}>
              {article.categorie ? (
                // Plein format ici, PAS `thumb` : la vignette 384 px suffit à
                // un timbre-poste sur l'étagère, pas à un objet qui occupe
                // 75 vw. Même réglage que la fiche du stockage.
                //
                // Et CENTRÉ (le défaut), là où l'étagère ancre le bas : sur la
                // planche, l'objet REPOSE sur quelque chose, et le vide du
                // letterboxing le ferait flotter au-dessus. Ici il ne repose
                // sur rien — il est présenté seul dans une carte au large.
                // L'ancrer en bas le collerait à son titre et creuserait un
                // trou au-dessus. La fiche du stockage, dont cette carte
                // reprend la chrome, centre elle aussi.
                <ItemSticker
                  templateId={article.templateId}
                  categorie={article.categorie}
                  fill
                  tilt={false}
                  variant="normal"
                  eager
                />
              ) : null}
            </div>
          ) : (
            <div style={pieceBox}>
              <PieceIcon
                categorie={article.categorie}
                size={TAILLE_PIECE_GRANDE}
                count={article.quantite}
              />
            </div>
          )}
        </div>

        <div style={prixCard}>
          <div style={titreCard}>{article.libelle}</div>

          <div style={prixRow}>
            <span style={prixLabel}>{d.bazar.prixMot}</span>
            <span
              style={{
                ...prixValue,
                // La règle de l'étiquette de l'étagère, reprise ici : hors de
                // portée, le prix s'ÉTEINT — il n'est pas barré. `ink-300` est
                // la teinte des commandes désactivées du jeu (cf.
                // `ConcessionSheet`) et tient 4,5:1 sur le papier de la carte,
                // au seuil AA. Pas de plaque à éteindre ici : dans la fiche le
                // prix est une valeur de ligne, pas un cartouche posé sur une
                // illustration.
                color: horsDePortee ? "var(--ink-300)" : prixValue.color,
              }}
            >
              {/* La fiche a la place, contrairement aux plaques de l'étagère :
                  elle écrit le mot ET montre la pièce. C'est ici que le joueur
                  apprend que l'une désigne l'autre — sur l'étal, la pièce
                  seule doit ensuite lui suffire. */}
              <BazarcoinIcon size={16} surClair />
              {tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
            </span>
          </div>

          <button
            type="button"
            aria-disabled={horsDePortee}
            style={boutonAcheter(!horsDePortee)}
            onClick={() => {
              // Pré-check local : le jeu refuserait aussi, mais avec une phrase
              // générique. Ici on connaît le CHIFFRE qui manque.
              if (horsDePortee) {
                setRefus(null);
                setManqueVu(true);
                return;
              }
              const res = onAcheter();
              if (res.ok) {
                onClose();
                return;
              }
              // Refus du jeu (stockage plein, article déjà parti, bourse
              // rattrapée par un tick) : la fiche RESTE OUVERTE et affiche la
              // raison. La refermer cacherait la réponse et renverrait le
              // joueur taper l'étagère sans savoir. Le repli générique existe
              // pour qu'un refus ne puisse JAMAIS être muet.
              setManqueVu(false);
              setRefus(res.raison ?? d.bazar.achatRefuse);
            }}
          >
            {d.bazar.acheter}
          </button>

          {(refus !== null || (manqueVu && horsDePortee)) && (
            // Un seul endroit pour les deux refus — celui qu'on a vu venir
            // (la bourse) et celui que le jeu renvoie. Il reste affiché tant
            // que la fiche est ouverte : sur l'étagère, le message s'effaçait
            // au bout de 2,5 s parce qu'il était écrit à même l'illustration
            // et y encombrait la rangée voisine. Dans une fiche modale que le
            // joueur referme lui-même, l'effacer ne ferait que lui reprendre
            // la réponse qu'il est en train de lire.
            <span role="status" style={messageManque}>
              {refus ??
                tr(manque > 1 ? d.bazar.manqueJetons : d.bazar.manqueJetonUn, {
                  n: manque,
                })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
