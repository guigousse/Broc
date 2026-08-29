"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { StarRow } from "@/components/ui/StarRow";
import { plaqueLaiton } from "@/components/ui/plaqueLaiton";
import { ficheBackdrop } from "@/components/ui/FicheObjet";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { ETAT_ARTICLE_BAZAR } from "@/lib/bazar/achat";
import { celebrerAchat } from "@/lib/celebrationAchat";
import { getItemImageUrl } from "@/lib/itemImages";
import type { CategorieObjet, Rarete } from "@/types/game";

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
      /**
       * La teinte des étoiles d'état. `null` avec `categorie` et pour la même
       * raison : un `templateId` retiré du catalogue ne dit plus sa rareté.
       * L'ÉTAT, lui, ne se transporte pas — le Bazar n'en vend qu'un
       * (`ETAT_ARTICLE_BAZAR`), la fiche le lit à la source.
       */
      rarete: Rarete | null;
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

/** Le voile partagé des fiches — flouté depuis le 2026-08-28. */
const backdrop = ficheBackdrop;

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

/**
 * LA PLAQUE DU BAZAR — le nom de l'article, gravé dans le laiton. Le style vit
 * dans `plaqueLaiton` depuis que la fiche du stockage l'a repris (2026-08-28).
 */
const plaqueNom = plaqueLaiton;

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
  // Il ne repose plus sur une carte : sans ombre, il flotterait sans poids
  // au-dessus du voile.
  boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
});

/**
 * Le refus du jeu (stockage plein, article déjà parti). Écrit en laiton CLAIR :
 * il ne se lit plus sur le papier crème d'un cartouche mais sur le voile
 * sombre, où `brass-700` disparaissait.
 */
const messageRefus: CSSProperties = {
  display: "block",
  marginTop: 10,
  textAlign: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: "var(--brass-300)",
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
  /** La raison d'un refus VENU DU JEU (stockage plein, article parti…). */
  const [refus, setRefus] = useState<string | null>(null);

  const prix = article?.prix ?? 0;
  const horsDePortee = jetons < prix;

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
    setRefus(null);
  }, [open, cleArticle]);

  /**
   * LA CÉLÉBRATION DE L'ACHAT — deux temps, orchestrés hors d'ici.
   *
   * La fiche ne fait que fournir ce qu'elle seule connaît : le prix payé, la
   * position de la vignette AU MOMENT DU TAP, et l'image de l'objet. Elle se
   * referme dans la foulée, donc elle ne peut rien tenir de plus — les
   * minuteries et les clones vivent dans `celebrationAchat`, hors de React.
   *
   * Un lot de pièces vole sans image : il n'a pas de vignette au catalogue,
   * seulement son engrenage.
   */
  const celebrer = () => {
    if (!article) return;
    const visuel = document.querySelector(
      '[data-testid="fiche-visuel"]',
    ) as HTMLElement | null;
    celebrerAchat({
      prix: article.prix,
      rectObjet: visuel ? visuel.getBoundingClientRect() : null,
      imageUrl:
        article.genre === "objet" && article.categorie
          ? getItemImageUrl(article.templateId)
          : null,
    });
  };

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
        <div style={previewWrap} data-testid="fiche-visuel">
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
                  // L'éclat du pristin, comme dans la collection : le Bazar ne
                  // vend que des pièces impeccables, et un objet au sommet de
                  // l'échelle brille partout où il se montre.
                  etat={ETAT_ARTICLE_BAZAR}
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

        {/* L'ÉTAT, collé à l'objet — la même rangée qu'au pied de la case,
            en un peu plus grand. Le joueur qui vient de taper l'article doit
            retrouver ce qui l'a fait taper, et l'ordre le dit : l'objet, son
            état, son nom, son prix.

            Un lot de pièces n'a pas d'état, et un template disparu n'a plus de
            rareté pour teinter quoi que ce soit : dans les deux cas, rien —
            plutôt qu'une rangée grise qui dirait « mauvais état ».

            L'ombre de lisibilité (`dropShadow`) est venue avec le voile : les
            étoiles ne reposent plus sur du papier crème. */}
        {article.genre === "objet" && article.rarete ? (
            <span
              data-testid="etoiles-fiche"
              style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}
              aria-label={tr(d.chine.etatAriaLabel, {
                etat: libelleEtat(ETAT_ARTICLE_BAZAR, d),
              })}
            >
              <StarRow
                filled={etoileCount(ETAT_ARTICLE_BAZAR)}
                color={getRarityColors(article.rarete).outer}
                size={20}
                display="flex"
                gap={3}
                dropShadow
              />
            </span>
        ) : null}

        <div style={plaqueNom} data-testid="fiche-plaque">
          {article.libelle}
        </div>

          <button
            type="button"
            aria-disabled={horsDePortee}
            // Le nom accessible écrit le mot que le bouton ne montre pas :
            // « Acheter pour 12 Bazarcoins » là où l'œil lit « ACHETER POUR 12 »
            // suivi de la pièce. Le texte visible est contenu dans le nom, comme
            // l'exige WCAG 2.5.3 — une commande vocale « acheter pour 12 »
            // atteint donc bien ce bouton.
            aria-label={tr(d.bazar.acheterPour, {
              n: tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix }),
            })}
            style={{
              ...boutonAcheter(!horsDePortee),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            onClick={() => {
              // Hors de portée : le bouton ÉTEINT porte seul le refus depuis
              // le 2026-08-26 — le « il vous manque N Bazarcoins » a été
              // retiré à la demande de l'auteur, la fiche ne s'encombre plus
              // d'une phrase sous le bouton. Le tap ne fait donc rien, mais il
              // n'achète ni ne referme : c'est ce que garde le test.
              if (horsDePortee) {
                setRefus(null);
                return;
              }
              const res = onAcheter();
              if (res.ok) {
                celebrer();
                // La fiche se referme AUSSITÔT, sans attendre la fin des vols :
                // les clones animés vivent dans le `body`, hors d'elle. Attendre
                // les jouerait derrière le voile, c'est-à-dire nulle part.
                onClose();
                return;
              }
              // Refus du jeu (stockage plein, article déjà parti, bourse
              // rattrapée par un tick) : la fiche RESTE OUVERTE et affiche la
              // raison. La refermer cacherait la réponse et renverrait le
              // joueur taper l'étagère sans savoir. Le repli générique existe
              // pour qu'un refus ne puisse JAMAIS être muet.
              setRefus(res.raison ?? d.bazar.achatRefuse);
            }}
          >
            {/* Le prix vivait sur une ligne « Prix · 12 Bazarcoins », au-dessus
                d'un bouton muet sur le montant : deux endroits pour une seule
                idée. Le bouton porte les deux depuis le 2026-08-26 — ce qu'il
                fait, et ce qu'il coûte. La pièce remplace le mot, comme partout
                ailleurs au Bazar. */}
            {tr(d.bazar.acheterPour, { n: prix })}
            <BazarcoinIcon size={16} surClair={horsDePortee} />
          </button>

        {refus !== null && (
          // Le refus du JEU (stockage plein, article déjà parti, bourse
          // rattrapée par un tick) : la fiche reste ouverte et le montre. Le
          // repli générique existe pour qu'un refus renvoyé ne puisse jamais
          // être muet — c'est le seul message qui subsiste ici.
          //
          // Il reste affiché tant que la fiche est ouverte : sur l'étagère, un
          // message s'effaçait au bout de 2,5 s parce qu'il était écrit à même
          // l'illustration et encombrait la rangée voisine. Dans une fiche
          // modale que le joueur referme lui-même, l'effacer ne ferait que lui
          // reprendre la réponse qu'il est en train de lire.
          <span role="status" style={messageRefus}>
            {refus}
          </span>
        )}
      </div>
    </div>
  );
}
