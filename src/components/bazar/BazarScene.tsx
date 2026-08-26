"use client";

import { useState } from "react";
import { UnifiedPanorama, type PanoramaZone } from "@/components/mobile/panorama/UnifiedPanorama";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { ItemSticker } from "@/components/ui/ItemSticker";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { ETAT_ARTICLE_BAZAR, type AchatBazar } from "@/lib/bazar/achat";
import type { JeuArcade } from "@/lib/bazar/arcade";
import type { EtalBazar } from "@/types/game";
import { ArticleBazar } from "./ArticleBazar";
import { BorneArcade } from "./BorneArcade";
import { BorneArcadeEcran } from "./BorneArcadeEcran";
import {
  ArticleDetailBazar,
  type ArticleDetail,
  type ResultatAchatBazar,
} from "./ArticleDetailBazar";
import { PLAQUE_ETIQUETTE } from "./etiquette";
import { BAZAR_LAYOUT, CLES_BAZAR, CLES_ARTICLES, CLES_LOTS } from "./bazarLayout";

/** Les trois zones du Bazar : le coin arcade, le comptoir, les antiquités. */
export const ZONES_BAZAR: PanoramaZone[] = [
  { key: "arcade", center: 1 / 6 },
  { key: "comptoir", center: 1 / 2 },
  { key: "antiquites", center: 5 / 6 },
];

interface BazarSceneProps {
  etal: EtalBazar;
  jetons: number;
  /**
   * L'état des onze jeux, déjà calculé. La scène reste une vue pure : elle ne
   * touche jamais à la collection, `src/app/bazar/page.tsx` la lui dérive.
   */
  jeuxArcade: JeuArcade[];
  /**
   * Tente l'achat et dit ce qu'il en est. Le retour n'est PAS décoratif : la
   * fiche de l'article ne se referme que s'il est `ok`, et affiche sinon la
   * raison — un refus est le moment où le joueur a besoin de rester pour lire.
   */
  onAcheter: (achat: AchatBazar) => ResultatAchatBazar;
  onSortir: () => void;
  /**
   * Index de la zone regardée (0 = arcade · 1 = comptoir · 2 = antiquités),
   * émis au montage puis à chaque snap. La scène ne s'en sert pas : elle le
   * relaie, parce qu'elle est la seule à tenir le panorama et que l'écran qui
   * pilote l'ambiance sonore, lui, n'a aucun autre moyen de savoir où le
   * joueur se tient.
   */
  onZoneIndex?: (idx: number) => void;
}

/**
 * La scène du Bazar : panorama 3 zones (arcade · comptoir · antiquités),
 * l'étal de la semaine posé sur les six cases de l'étagère derrière le
 * comptoir. Vue pure — tout arrive par les props, la composition avec le
 * contexte de jeu se fait dans `src/app/bazar/page.tsx`.
 */
export function BazarScene({
  etal,
  jetons,
  jeuxArcade,
  onAcheter,
  onSortir,
  onZoneIndex,
}: BazarSceneProps) {
  const { d, tr, locale } = useLangue();
  // Coordonnées lues par le hook, PAS dans le dictionnaire en direct : c'est
  // ce qui fait suivre l'objet quand on tire son cadre en mode calage
  // (`?qgedit=1`). Appels INCONDITIONNELS, en tête de composant : un par case
  // de l'étagère du haut, plus la sortie.
  //
  // L'étiquette « Vendu » se serre désormais sur SA case. Elle occupait toute
  // la planche tant qu'il n'y avait qu'un objet au milieu, parce qu'elle
  // portait une phrase entière (« Vendu — de retour lundi ») qu'une case de 22
  // unités ne tenait pas dans les 4 langues. Avec trois articles, cette
  // étiquette pleine rangée recouvrirait les deux cases encore en vente : le
  // libellé a été raccourci à « Vendu » pour tenir chez lui.
  const coordCase1 = useQgObjet(CLES_ARTICLES[0]);
  const coordCase2 = useQgObjet(CLES_ARTICLES[1]);
  const coordCase3 = useQgObjet(CLES_ARTICLES[2]);
  const coordsArticles = [coordCase1, coordCase2, coordCase3];
  const coordSortie = useQgObjet("sortie");
  const coordVendeur = useQgObjet("vendeur");

  // L'article dont la fiche est ouverte, avec l'achat qu'il déclenchera. Le
  // couple est tenu en ÉTAT plutôt que redérivé au rendu : la fiche garde
  // ainsi une identité stable d'un rendu à l'autre (son message de manque n'a
  // pas à se réarmer), et l'achat envoyé reste celui de l'article que le joueur
  // a tapé, pas celui qu'un étal rafraîchi entre-temps mettrait à sa place.
  const [selection, setSelection] = useState<{
    detail: ArticleDetail;
    achat: AchatBazar;
  } | null>(null);

  // Le plein écran de la borne d'arcade, à côté de la fiche d'article : même
  // mécanique, même raison de vivre hors du panorama (cf. plus bas).
  const [borneOuverte, setBorneOuverte] = useState(false);

  return (
    <>
      <UnifiedPanorama
        image="/bazar/fond-bazar.webp"
        aspect={BAZAR_LAYOUT.panoramaAspect}
        zones={ZONES_BAZAR}
        // On entre PAR LA PORTE, qui est peinte à droite du fond (l'objet
        // `sortie` est à 270 sur 300). Sans ça, `UnifiedPanorama` centre la
        // zone du milieu et le joueur se retrouve au comptoir sans être passé
        // devant l'entrée.
        initialZone="antiquites"
        ariaLabel={d.bazar.titre}
        editKeys={CLES_BAZAR}
        onZoneIndex={onZoneIndex}
      >
        {/* Décor. En tête des enfants, donc au-dessous d'eux dans l'ordre de
            peinture : une pièce de mobilier ne passe jamais devant la
            marchandise. */}
        <BorneArcade onOuvrir={() => setBorneOuverte(true)} />

        {etal.lotsPieces.map((lot, index) => {
          const libelle = tr(d.bazar.lotPieces, {
            n: lot.quantite,
            categorie: libelleCategorie(lot.categorie, d),
          });
          return (
            <ArticleBazar
              key={lot.categorie}
              cle={CLES_LOTS[index]}
              // SANS `count` : l'engrenage nu. Le badge de quantité vivait sous
            // l'engrenage (`bottom: -3`), c'est-à-dire exactement là où la
            // plaque de prix est venue mordre sur l'arête basse de la case —
            // elle le recouvrait. L'auteur a tranché à la recette du
            // 2026-08-20 : sur l'étagère, un lot montre son engrenage et son
            // prix, rien d'autre. La quantité se lit dans la fiche, à un tap.
            // Elle reste dans le NOM ACCESSIBLE de l'article ci-dessous : un
            // joueur non-voyant n'a pas de badge à perdre, et c'est ce texte
            // qu'il entend à la place.
            visuel={<PieceIcon categorie={lot.categorie} size={48} />}
              libelle={libelle}
              onOuvrir={() =>
                setSelection({
                  detail: {
                    genre: "pieces",
                    categorie: lot.categorie,
                    quantite: lot.quantite,
                    libelle,
                    prix: lot.prix,
                  },
                  achat: { type: "pieces", index },
                })
              }
            />
          );
        })}

        {/* L'étagère du haut : un objet par gamme de prix. Une case vide
            n'est PAS un trou — c'est un article acheté cette semaine, et
            l'étiquette le dit. Un `templateId` retiré du catalogue
            (`template === undefined`) ne vide pas la case : l'article reste
            achetable, sous son identifiant brut, faute de quoi la scène
            annoncerait « Vendu » sur un objet pourtant en vente. */}
        {etal.articles.map((article, index) => {
          const cle = CLES_ARTICLES[index];
          if (!article) {
            const coord = coordsArticles[index];
            return (
              <span
                key={cle}
                data-testid={`etiquette-vendu-${index}`}
                style={{
                  position: "absolute",
                  left: `${qgPct(coord.left)}%`,
                  bottom: `${coord.bottom}%`,
                  width: `${qgPct(coord.width)}%`,
                  textAlign: "center",
                }}
              >
                <span style={PLAQUE_ETIQUETTE}>{d.bazar.vendu}</span>
              </span>
            );
          }
          const template = getTemplate(article.templateId);
          const libelle = template
            ? nomObjet({ templateId: template.templateId, nom: template.nom }, locale)
            : article.templateId;
          return (
            <ArticleBazar
              key={cle}
              cle={cle}
              visuel={
                // Le carré est porté par ce `span`, pas par le sticker : c'est lui
                // qui donne au `fill` une hauteur définie à laquelle se mesurer,
                // quel que soit le moteur.
                <span style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}>
                  {template ? (
                    // Vignette découpée — la MÊME que partout ailleurs dans le jeu
                    // (collection, détail d'objet, carnet de quêtes) : contour
                    // blanc die-cut et légère inclinaison déterministe. Posé sur
                    // une illustration peinte, un PNG nu se confondait avec le mur
                    // de sauge ; le liseré le détache de l'étagère. `thumb` parce
                    // que la case fait ~22 unités de large : décoder un plein
                    // format pour un timbre-poste coûte de la mémoire à
                    // l'ouverture de l'écran (cf. `getItemThumbUrl`).
                    <ItemSticker
                      templateId={template.templateId}
                      categorie={template.categorie}
                      fill
                      thumb
                      // DROIT. `ItemSticker` incline chaque objet de quelques
                      // degrés (défaut) ; l'auteur n'en veut pas au Bazar : les
                      // articles d'une boutique sont posés d'aplomb. Accessoire
                      // utile : une vignette droite n'a plus besoin de déborder
                      // de son carré aux coins, elle y tient exactement.
                      tilt={false}
                      outlinePx={2}
                      // L'éclat du pristin (cf. `ItemSticker`) : ce que le
                      // Bazar vend est impeccable, et ça se voit de loin sur
                      // l'étagère comme dans la collection.
                      etat={ETAT_ARTICLE_BAZAR}
                      // Le BAS de l'objet sur l'arête basse du carré. `contain`
                      // letterboxe les objets larges et bas (une ménagère, une
                      // pile de vinyles) : sans cet ancrage, le vide laissé par
                      // le letterboxing les fait flotter au lieu de reposer sur
                      // la planche visée par le cadre pointillé. Exigence de
                      // l'auteur, acquise le matin même sur `ItemImage` et
                      // reperdue au passage à la vignette.
                      verticalAlign="bottom"
                    />
                  ) : null}
                </span>
              }
              libelle={libelle}
              // Le pied de la case dit l'ÉTAT, plus le prix (2026-08-26). Pas
              // de template, pas d'étoiles : sans lui il n'y a ni rareté pour
              // les teinter ni objet dont promettre l'état — la case montre ce
              // qu'elle sait, et rien de plus.
              objet={
                template
                  ? { etat: ETAT_ARTICLE_BAZAR, rarete: template.rarete }
                  : undefined
              }
              onOuvrir={() =>
                setSelection({
                  detail: {
                    genre: "objet",
                    templateId: article.templateId,
                    // `null` quand le template a quitté le catalogue : la fiche
                    // n'a alors ni visuel à montrer ni teinte d'étoiles, comme
                    // l'étagère.
                    categorie: template?.categorie ?? null,
                    rarete: template?.rarete ?? null,
                    libelle,
                    prix: article.prix,
                  },
                  achat: { type: "objet", index },
                })
              }
            />
          );
        })}

        {/* Le tenancier. DÉCOR, pas commande : il n'a encore ni nom ni
            réplique, et en faire un bouton promettrait une interaction qui
            n'existe pas — un lecteur d'écran annoncerait une commande morte.
            D'où `aria-hidden` et `pointerEvents: none`, qui rendent aussi les
            taps à ce qu'il y a dessous.

            Hauteur en `auto` : la largeur commande, le buste garde ses
            proportions. Son bas se confond avec l'arête arrière du plateau
            (cf. `BAZAR_LAYOUT.objets.vendeur`), ce qui le place DERRIÈRE le
            comptoir plutôt que posé dessus. */}
        <span
          data-testid="tenancier-bazar"
          aria-hidden
          style={{
            position: "absolute",
            left: `${qgPct(coordVendeur.left)}%`,
            bottom: `${coordVendeur.bottom}%`,
            width: `${qgPct(coordVendeur.width)}%`,
            pointerEvents: "none",
          }}
        >
          <img
            src="/bazar/vendeur-bazar.webp"
            alt=""
            draggable={false}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </span>

        <button
          type="button"
          aria-label={d.bazar.sortir}
          onClick={onSortir}
          style={{
            position: "absolute",
            left: `${qgPct(coordSortie.left)}%`,
            bottom: `${coordSortie.bottom}%`,
            width: `${qgPct(coordSortie.width)}%`,
            aspectRatio: "1 / 2",
            pointerEvents: "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        />
      </UnifiedPanorama>

      {/* Hors du panorama, pas dedans : le conteneur du panorama scrolle
          horizontalement, et une fiche posée à l'intérieur voyagerait avec la
          scène. Elle est de toute façon en `position: fixed`. */}
      <ArticleDetailBazar
        article={selection?.detail ?? null}
        open={selection !== null}
        jetons={jetons}
        onAcheter={() =>
          selection
            ? onAcheter(selection.achat)
            : // Inatteignable : sans sélection, la fiche ne rend rien, donc
              // aucun bouton n'existe pour appeler ceci. On refuse quand même
              // plutôt que de prétendre avoir acheté.
              { ok: false }
        }
        onClose={() => setSelection(null)}
      />

      <BorneArcadeEcran
        open={borneOuverte}
        jeux={jeuxArcade}
        onClose={() => setBorneOuverte(false)}
      />
    </>
  );
}
