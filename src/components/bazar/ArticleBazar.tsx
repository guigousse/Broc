"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleEtat } from "@/lib/i18n/libelles";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { StarRow } from "@/components/ui/StarRow";
import { TamponEncreur } from "@/components/ui/TamponEncreur";
import { getRarityColors } from "@/lib/rarityColors";
import { etoileCount } from "@/lib/etat";
import { type EtatObjet, type Rarete } from "@/types/game";
import { type BazarObjetKey } from "./bazarLayout";

/**
 * De combien le pied remonte SUR la case, en px. La rangée d'étoiles se pose
 * ainsi À CHEVAL sur l'arête basse du carré — elle se lit comme posée sur la
 * planche, sous l'objet qui y repose, et non comme un cartouche qui flotte
 * entre deux rangées (recette du 2026-08-20, héritée de la plaque de prix).
 * 7 px pour une rangée haute de 14 : la moitié dessus, la moitié dessous.
 */
export const CHEVAUCHEMENT_PIED_PX = 7;

/** Taille d'une étoile au pied de la case, en px. */
const TAILLE_ETOILE_PX = 14;

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  /**
   * L'objet en vente : de quoi dire son état au pied de la case. ABSENT pour
   * un lot de pièces de restauration, qui n'a pas d'état — le pied reste alors
   * nu, sans que la scène ait à porter l'exception.
   */
  objet?: { etat: EtatObjet; rarete: Rarete };
  /**
   * L'article a été acheté. Il reste sur l'étagère — en noir et blanc, sous
   * son cachet — jusqu'au renouvellement du lundi, mais il ne promet plus
   * rien : ni fiche à ouvrir, ni état à lire.
   */
  vendu?: boolean;
  /** Ouvre la fiche de l'article. Le tap N'ACHÈTE PAS (cf. ci-dessous). */
  onOuvrir: () => void;
}

/**
 * Un article posé dans la scène : son visuel, et les étoiles de son état.
 *
 * LE PRIX N'EST PLUS SUR L'ÉTAGÈRE (demande de l'auteur, 2026-08-26). Une
 * boutique montre sa marchandise ; elle ne crie pas ses tarifs. Le pied de la
 * case dit désormais l'ÉTAT de l'objet — la même rangée d'étoiles qu'au
 * stockage et à l'atelier, dans la teinte de sa rareté — et le prix attend la
 * fiche, à un tap. Avec lui sont partis l'extinction de la plaque et le rouge
 * du montant : le « il vous manque N jetons » vit dans `ArticleDetailBazar`,
 * qui le disait déjà. Le composant ne connaît donc PLUS la bourse du joueur.
 *
 * Il OUVRE, il n'achète pas. Le tap déclenchait autrefois l'achat sur-le-champ
 * — un doigt mal posé coûtait une semaine de jetons sans rien demander.
 * Depuis la recette du 2026-08-20, il ouvre `ArticleDetailBazar` : l'article en
 * grand, son nom, son prix, et un bouton qui achète.
 *
 * La marchandise reste TOUJOURS en couleur. Elle a d'abord été désaturée
 * (`grayscale(1) opacity(0.65)`) quand la bourse ne suffisait pas ; l'auteur
 * l'a refusé sur son téléphone — une boutique dont la moitié des articles est
 * grise ne donne pas envie d'y entrer, et le décor peint perd ce pour quoi il
 * a été peint.
 *
 * Aucun `aria-disabled` ici, et c'est voulu : le bouton fonctionne pleinement
 * — il ouvre la fiche. L'annoncer désactivé serait faux. `aria-disabled` vit
 * dans la fiche, sur le bouton qui, lui, refuse vraiment quelque chose.
 */
export function ArticleBazar({
  cle,
  visuel,
  libelle,
  objet,
  vendu = false,
  onOuvrir,
}: ArticleBazarProps) {
  const { d, tr } = useLangue();
  // Par le hook, pas par le dictionnaire : sans lui, tirer le cadre en mode
  // calage (`?qgedit=1`) déplaçait le pointillé sans déplacer l'article.
  const coord = useQgObjet(cle);

  // Ce que voit l'œil, dit à l'oreille. Les étoiles ne rendent rien à qui ne
  // les voit pas ; l'état passe donc dans le nom du BOUTON, le seul élément
  // dont le nom s'annonce à coup sûr à la prise de focus. Le prix, lui, a
  // quitté l'étagère pour tout le monde de la même façon : il est dans la
  // fiche, que ce bouton ouvre.
  // Vendu, c'est CELA qu'il faut annoncer, et rien d'autre : l'état d'un objet
  // qui n'est plus à vendre n'apprend rien à personne.
  const nomAccessible = vendu
    ? `${libelle} — ${d.bazar.vendu}`
    : objet
      ? `${libelle} — ${tr(d.chine.etatAriaLabel, { etat: libelleEtat(objet.etat, d) })}`
      : libelle;

  // Le conteneur est une case CARRÉE (`aspectRatio: 1/1` sur une largeur en
  // `%`) : sans hauteur propre, la case précédente n'existait qu'en largeur,
  // et le visuel — ancré au pied via `align-items: flex-end` — dépassait
  // largement vers le haut. L'auteur cale le cadre pointillé de calage
  // (`?qgedit=1`) sur cette même case. Le visuel est centré HORIZONTALEMENT
  // (`justifyItems: center`) mais justifié en BAS (`alignItems: end`) :
  // physiquement, un objet posé sur une étagère touche la planche par sa
  // base, donc quand l'auteur tire le cadre pour que son arête basse coïncide
  // avec la planche peinte dans le fond, l'objet doit sembler y reposer
  // (raffinement demandé à la revue du 2026-08-20, round 2). Le pied vit HORS
  // FLUX, accroché à la case (position relative au conteneur, pas au visuel) :
  // les étoiles ne peuvent donc pas pousser l'article d'une rangée vers le
  // haut. jsdom n'a pas de layout, seul le style en ligne peut en témoigner.
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

  const colonnePied: CSSProperties = {
    position: "absolute",
    top: `calc(100% - ${CHEVAUCHEMENT_PIED_PX}px)`,
    left: "50%",
    transform: "translateX(-50%)",
    display: "grid",
    justifyItems: "center",
    gap: 2,
  };

  if (vendu) {
    return (
      // Ni bouton, ni cible de tap : il n'y a plus rien à ouvrir, et une
      // commande qui ne promet rien ment. `role="img"` avec le nom complet
      // rend au lecteur d'écran ce que le cachet dit à l'œil.
      <div
        style={style}
        data-testid={`article-${cle}`}
        role="img"
        aria-label={nomAccessible}
      >
        <span style={{ position: "relative", width: "100%", height: "100%", display: "grid", justifyItems: "center", alignItems: "end" }}>
          {visuel}
          <TamponEncreur encre="var(--forest-600)" taille={13}>
            {d.bazar.vendu}
          </TamponEncreur>
        </span>
      </div>
    );
  }

  return (
    <div style={style} data-testid={`article-${cle}`}>
      <button
        type="button"
        aria-label={nomAccessible}
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
      {objet && (
        // Les étoiles portent l'ombre de lisibilité (`dropShadow`) : posées
        // sur une illustration peinte — mur de sauge, planche de bois clair —
        // et non sur le fond uni des autres écrans, un liseré de rareté clair
        // s'y dissoudrait. La teinte est celle de la RARETÉ, comme au stockage
        // et à l'atelier : c'est elle qui dit la valeur de la pièce, et un
        // objet au sommet de l'échelle y gagne l'éclat que `StarRow` accorde
        // partout ailleurs.
        <span style={colonnePied} data-testid={`etoiles-${cle}`}>
          <StarRow
            filled={etoileCount(objet.etat)}
            color={getRarityColors(objet.rarete).outer}
            size={TAILLE_ETOILE_PX}
            display="flex"
            dropShadow
          />
        </span>
      )}
    </div>
  );
}
