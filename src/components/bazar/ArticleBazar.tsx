"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLangue } from "@/lib/i18n/LangueContext";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { PLAQUE_ETIQUETTE } from "./etiquette";
import { type BazarObjetKey } from "./bazarLayout";

/** Durée d'affichage de la bulle « il vous manque N jetons ». */
export const DUREE_BULLE_MS = 2500;

interface ArticleBazarProps {
  cle: BazarObjetKey;
  visuel: ReactNode;
  libelle: string;
  prix: number;
  jetons: number;
  onAcheter: () => void;
}

/**
 * Un article posé dans la scène : son visuel, son étiquette de prix, et
 * l'état « hors de portée ».
 *
 * Pas de `disabled` natif : un bouton désactivé ne dispatche AUCUN clic et ne
 * le laisse donc jamais remonter à un parent — poser la bulle « il vous
 * manque N jetons » sur le conteneur ne servait à rien tant que le joueur
 * tapait l'image elle-même (la cible la plus naturelle). Le bouton reste
 * toujours actif et focusable, porte `aria-disabled` pour l'état visuel/a11y,
 * et c'est SON PROPRE gestionnaire qui tranche : hors de portée → montre la
 * bulle sans appeler `onAcheter` ; sinon → achète. Un seul gestionnaire vivant,
 * atteint par le tap comme par le clavier — défaut relevé à la revue du
 * 2026-08-20 (round 1).
 */
export function ArticleBazar({ cle, visuel, libelle, prix, jetons, onAcheter }: ArticleBazarProps) {
  const { d, tr } = useLangue();
  const [bulle, setBulle] = useState(false);
  const horsDePortee = jetons < prix;
  const manque = prix - jetons;
  // Par le hook, pas par le dictionnaire : sans lui, tirer le cadre en mode
  // calage (`?qgedit=1`) déplaçait le pointillé sans déplacer l'article.
  const coord = useQgObjet(cle);

  // La bulle est « brève » (spec) : un minuteur la referme au bout de 2,5 s.
  // Le minuteur est réarmé à chaque tap et nettoyé au démontage — sans ça,
  // trois lots trop chers laissaient trois lignes affichées indéfiniment.
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annulerMinuteur = useCallback(() => {
    if (minuteurRef.current !== null) {
      clearTimeout(minuteurRef.current);
      minuteurRef.current = null;
    }
  }, []);
  useEffect(() => annulerMinuteur, [annulerMinuteur]);

  // La bulle est un aveu ponctuel du tap précédent, pas un état durable : dès
  // que la bourse suffit de nouveau, elle ne doit pas pouvoir réapparaître
  // toute seule si la bourse redescend plus tard dans le même montage.
  useEffect(() => {
    if (!horsDePortee) {
      setBulle(false);
      annulerMinuteur();
    }
  }, [horsDePortee, annulerMinuteur]);

  // Le conteneur est une case CARRÉE (`aspectRatio: 1/1` sur une largeur en
  // `%`) : sans hauteur propre, la case précédente n'existait qu'en largeur,
  // et le visuel — ancré au pied via `align-items: flex-end` — dépassait
  // largement vers le haut. L'auteur cale le cadre pointillé de calage
  // (`?qgedit=1`) sur cette même case : il doit pouvoir viser son centre, pas
  // deviner où « repose » un visuel de hauteur libre. Le prix et la bulle
  // vivent dans une colonne HORS FLUX suspendue sous la case (position
  // relative au conteneur, pas au visuel) : ajouter la bulle ne peut donc pas
  // pousser l'article d'une rangée vers le haut (défaut relevé à la revue du
  // 2026-08-20 ; jsdom n'a pas de layout, seul le style en ligne peut en
  // témoigner).
  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    aspectRatio: "1 / 1",
    pointerEvents: "auto",
    display: "grid",
    placeItems: "center",
    filter: horsDePortee ? "grayscale(1) opacity(0.65)" : undefined,
  };

  const colonneEtiquettes: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 2px)",
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
        aria-disabled={horsDePortee}
        onClick={() => {
          if (horsDePortee) {
            annulerMinuteur();
            setBulle(true);
            minuteurRef.current = setTimeout(() => {
              minuteurRef.current = null;
              setBulle(false);
            }, DUREE_BULLE_MS);
          } else {
            onAcheter();
          }
        }}
        // Le bouton occupe toute la case (carrée) et centre son visuel sur
        // les deux axes. Il était auparavant en largeur « shrink-to-fit » et
        // aligné au pied : le visuel de la vitrine, un
        // `<span style="width:100%">`, y résolvait son pourcentage contre une
        // largeur elle-même déduite du contenu, donc contre rien, et
        // débordait vers le haut. `overflow: hidden` est le filet : le visuel
        // de la vitrine (`ItemImage`, width/height 100 % + aspect-ratio 1/1)
        // remplit la case exactement, mais une pièce fixe (`PieceIcon`,
        // taille en px) ne doit jamais déborder de la case si celle-ci est un
        // jour recalée plus petite que l'icône.
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {visuel}
      </button>
      <span style={colonneEtiquettes} data-testid={`etiquettes-${cle}`}>
        <span
          style={{
            ...PLAQUE_ETIQUETTE,
            textDecoration: horsDePortee ? "line-through" : "none",
          }}
        >
          {tr(prix > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n: prix })}
        </span>
        {bulle && horsDePortee && (
          // Même plaque que le prix, et le même laiton clair : le conteneur
          // porte `grayscale(1)` quand l'article est hors de portée, si bien
          // qu'une couleur d'alerte ne serait JAMAIS vue rouge. Autant dire
          // vrai dans le code — c'est le texte qui porte le message.
          <span role="status" style={PLAQUE_ETIQUETTE}>
            {tr(manque > 1 ? d.bazar.manqueJetons : d.bazar.manqueJetonUn, { n: manque })}
          </span>
        )}
      </span>
    </div>
  );
}
