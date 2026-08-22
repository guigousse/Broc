"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { BazarcoinIcon } from "@/components/ui/BazarcoinIcon";
import { PLAQUE_ETIQUETTE, PLAQUE_ETIQUETTE_ETEINTE } from "./etiquette";
import { type BazarObjetKey } from "./bazarLayout";

/**
 * De combien la plaque de prix remonte SUR la case, en px. ~10 px : assez pour
 * qu'elle chevauche visiblement l'arête basse du carré, trop peu pour cacher
 * le pied de l'objet qui y repose.
 */
export const CHEVAUCHEMENT_ETIQUETTE_PX = 10;

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  prix: number;
  jetons: number;
  /** Ouvre la fiche de l'article. Le tap N'ACHÈTE PLUS (cf. ci-dessous). */
  onOuvrir: () => void;
}

/**
 * Un article posé dans la scène : son visuel, son étiquette de prix, et
 * l'état « hors de portée ».
 *
 * Il OUVRE, il n'achète pas. Le tap déclenchait autrefois l'achat sur-le-champ
 * — un doigt mal posé coûtait une semaine de jetons sans rien demander.
 * Depuis la recette du 2026-08-20, il ouvre `ArticleDetailBazar` : l'article en
 * grand, son nom, son prix, et un bouton qui achète. Le message « il vous
 * manque N jetons » et son minuteur de 2,5 s ont suivi l'achat dans la fiche ;
 * ils n'avaient plus rien à dire sur une étagère qu'on ne fait qu'ouvrir.
 *
 * La marchandise reste TOUJOURS en couleur. Elle a d'abord été désaturée
 * (`grayscale(1) opacity(0.65)`) quand la bourse ne suffisait pas ; l'auteur
 * l'a refusé sur son téléphone à la même recette — une boutique dont la moitié
 * des articles est grise ne donne pas envie d'y entrer, et le décor peint perd
 * ce pour quoi il a été peint. L'inaccessibilité est portée par la seule
 * étiquette de prix, qui s'ÉTEINT d'un bloc (fond, filet et texte ensemble),
 * puis par la fiche. Elle a été barrée entre-temps : la rature raye un chiffre
 * qu'on cherche justement à lire, l'auteur l'a remplacée par la couleur.
 *
 * Aucun `aria-disabled` ici non plus, et c'est voulu : le bouton fonctionne
 * pleinement, quel que soit l'état de la bourse — il ouvre la fiche. L'annoncer
 * désactivé serait faux. `aria-disabled` a suivi l'achat dans la fiche, sur le
 * bouton qui, lui, refuse vraiment quelque chose.
 */
export function ArticleBazar({
  cle,
  visuel,
  libelle,
  prix,
  jetons,
  onOuvrir,
}: ArticleBazarProps) {
  const { d, tr } = useLangue();
  const horsDePortee = jetons < prix;
  // Par le hook, pas par le dictionnaire : sans lui, tirer le cadre en mode
  // calage (`?qgedit=1`) déplaçait le pointillé sans déplacer l'article.
  const coord = useQgObjet(cle);

  // Le conteneur est une case CARRÉE (`aspectRatio: 1/1` sur une largeur en
  // `%`) : sans hauteur propre, la case précédente n'existait qu'en largeur,
  // et le visuel — ancré au pied via `align-items: flex-end` — dépassait
  // largement vers le haut. L'auteur cale le cadre pointillé de calage
  // (`?qgedit=1`) sur cette même case. Le visuel est centré HORIZONTALEMENT
  // (`justifyItems: center`) mais justifié en BAS (`alignItems: end`) :
  // physiquement, un objet posé sur une étagère touche la planche par sa
  // base, donc quand l'auteur tire le cadre pour que son arête basse coïncide
  // avec la planche peinte dans le fond, l'objet doit sembler y reposer
  // (raffinement demandé à la revue du 2026-08-20, round 2 — le round 1
  // n'avait centré que sur les deux axes). Le prix vit dans une colonne HORS
  // FLUX accrochée à la case (position relative au conteneur, pas au visuel) :
  // l'étiquette ne peut donc pas pousser l'article d'une rangée vers le haut.
  // jsdom n'a pas de layout, seul le style en ligne peut en témoigner.
  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    aspectRatio: "1 / 1",
    pointerEvents: "auto",
    display: "grid",
    justifyItems: "center",
    alignItems: "end",
  };

  const colonneEtiquettes: CSSProperties = {
    position: "absolute",
    // À CHEVAL sur l'arête basse de la case, pas suspendue dessous : la
    // plaque remonte de CHEVAUCHEMENT_ETIQUETTE_PX pour mordre sur le carré.
    // Elle se lit alors comme une étiquette épinglée sur la planche, sous
    // l'objet qui y repose, et non comme un cartouche qui flotte dans le vide
    // entre deux rangées (recette du 2026-08-20 sur téléphone).
    top: `calc(100% - ${CHEVAUCHEMENT_ETIQUETTE_PX}px)`,
    left: "50%",
    transform: "translateX(-50%)",
    display: "grid",
    justifyItems: "center",
    gap: 2,
  };

  return (
    <div style={style} data-testid={`article-${cle}`}>
      <button
        type="button"
        aria-label={libelle}
        onClick={onOuvrir}
        // Le bouton occupe toute la case (carrée) et place son visuel comme
        // le conteneur : centré horizontalement, justifié en bas. Il était
        // auparavant en largeur « shrink-to-fit » et aligné au pied : le
        // visuel de la vitrine, un `<span style="width:100%">`, y résolvait
        // son pourcentage contre une largeur elle-même déduite du contenu,
        // donc contre rien, et débordait vers le haut.
        //
        // PAS d'`overflow: hidden`. Il y en a eu un, comme filet contre un
        // visuel plus grand que sa case — mais rogner était le mauvais
        // marché : l'auteur a vu ses articles coupés sur son téléphone
        // (l'objet de la vitrine par ses coins, le badge de quantité d'un lot
        // par le bas) et veut l'objet ENTIER, toujours. Le filet est devenu
        // inutile parce que plus rien ne peut déborder : la vignette est en
        // `fill` + `object-fit: contain`, donc bornée à la case par
        // construction, et sans inclinaison depuis la même recette ; et
        // l'engrenage d'un lot est plafonné à `max-width/height: 100%` de sa
        // boîte. Un visuel qui ne dépasse pas n'a rien à faire rogner —
        // rétablir la coupe, ce serait recouper.
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          width: "100%",
          height: "100%",
          display: "grid",
          justifyItems: "center",
          alignItems: "end",
        }}
      >
        {visuel}
      </button>
      <span style={colonneEtiquettes} data-testid={`etiquettes-${cle}`}>
        {/* La PIÈCE remplace le mot : la case fait 89 px de large et
            « 3 Bazarcoins » n'y tient dans aucune des quatre langues — le grec
            était déjà la contrainte qui commandait la largeur des plaques.
            `role="img"` avec le libellé complet rend le mot à qui écoute :
            sans lui, un lecteur d'écran annoncerait un « 3 » nu, qui se
            confondrait avec une quantité d'objets. La pièce, elle, est
            `aria-hidden` — elle ne doit pas s'annoncer deux fois.
            La pièce est en `currentColor` : elle s'éteint donc avec sa plaque
            quand l'article passe hors de portée de la bourse. */}
        <span
          role="img"
          aria-label={tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
          style={{
            ...(horsDePortee ? PLAQUE_ETIQUETTE_ETEINTE : PLAQUE_ETIQUETTE),
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {prix}
          <BazarcoinIcon terni={horsDePortee} />
        </span>
      </span>
    </div>
  );
}
