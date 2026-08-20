"use client";

import { UnifiedPanorama, type PanoramaZone } from "@/components/mobile/panorama/UnifiedPanorama";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { qgPct } from "@/components/mobile/qg/layout";
import type { AchatBazar } from "@/lib/bazar/achat";
import type { EtalBazar } from "@/types/game";
import { ArticleBazar } from "./ArticleBazar";
import { BAZAR_LAYOUT, CLES_LOTS, CLE_VITRINE } from "./bazarLayout";

/** Les trois zones du Bazar : le coin arcade, le comptoir, les antiquités. */
export const ZONES_BAZAR: PanoramaZone[] = [
  { key: "arcade", center: 1 / 6 },
  { key: "comptoir", center: 1 / 2 },
  { key: "antiquites", center: 5 / 6 },
];

interface BazarSceneProps {
  etal: EtalBazar;
  jetons: number;
  onAcheter: (achat: AchatBazar) => void;
  onSortir: () => void;
}

/**
 * La scène du Bazar : panorama 3 zones (arcade · comptoir · antiquités),
 * l'étal de la semaine posé sur les neuf cases de l'étagère derrière le
 * comptoir. Vue pure comme `EtalBazarVue` — tout arrive par les props, la
 * composition avec le contexte de jeu reste à faire ailleurs.
 */
export function BazarScene({ etal, jetons, onAcheter, onSortir }: BazarSceneProps) {
  const { d, tr, locale } = useLangue();
  const template = etal.vitrine ? getTemplate(etal.vitrine.templateId) : undefined;
  const coordVitrine = BAZAR_LAYOUT.objets[CLE_VITRINE];
  const coordSortie = BAZAR_LAYOUT.objets.sortie;
  // Le libellé « Vendu — de retour lundi » est une phrase entière dans les
  // 4 langues (la version grecque est la plus longue). Une case de 24vw ne
  // suffit pas — le texte replierait vers le HAUT (le conteneur est ancré en
  // `bottom`) et empièterait sur la rangée du dessus. On lui donne toute la
  // largeur de la rangée du milieu (case4..case6), en nowrap : s'il déborde
  // malgré tout, ça déborde sur les côtés, dans le mur nu du comptoir.
  const coordCase4 = BAZAR_LAYOUT.objets.case4;
  const coordCase6 = BAZAR_LAYOUT.objets.case6;
  const venduLeft = coordCase4.left;
  const venduWidth = coordCase6.left + coordCase6.width - coordCase4.left;

  return (
    <UnifiedPanorama
      image="/bazar/fond-bazar.webp"
      aspect={BAZAR_LAYOUT.panoramaAspect}
      zones={ZONES_BAZAR}
      ariaLabel={d.bazar.titre}
      editKeys={Object.keys(BAZAR_LAYOUT.objets) as (keyof typeof BAZAR_LAYOUT.objets)[]}
    >
      {etal.lotsPieces.map((lot, index) => (
        <ArticleBazar
          key={lot.categorie}
          cle={CLES_LOTS[index]}
          visuel={<PieceIcon categorie={lot.categorie} size={48} count={lot.quantite} />}
          libelle={tr(d.bazar.lotPieces, {
            n: lot.quantite,
            categorie: libelleCategorie(lot.categorie, d),
          })}
          prix={lot.prix}
          jetons={jetons}
          onAcheter={() => onAcheter({ type: "pieces", index })}
        />
      ))}

      {etal.vitrine && template ? (
        <ArticleBazar
          cle={CLE_VITRINE}
          visuel={
            <span style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}>
              <ItemImage
                templateId={template.templateId}
                categorie={template.categorie}
                alt=""
                sizes="30vw"
              />
            </span>
          }
          libelle={nomObjet({ templateId: template.templateId, nom: template.nom }, locale)}
          prix={etal.vitrine.prix}
          jetons={jetons}
          onAcheter={() => onAcheter({ type: "vitrine" })}
        />
      ) : (
        <span
          style={{
            position: "absolute",
            left: `${qgPct(venduLeft)}%`,
            bottom: `${coordVitrine.bottom}%`,
            width: `${qgPct(venduWidth)}%`,
            textAlign: "center",
            whiteSpace: "nowrap",
            fontSize: "0.7rem",
            color: "var(--brass-700)",
          }}
        >
          {d.bazar.vendu}
        </span>
      )}

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
  );
}
