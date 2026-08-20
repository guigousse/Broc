"use client";

import { UnifiedPanorama, type PanoramaZone } from "@/components/mobile/panorama/UnifiedPanorama";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { ItemImage } from "@/components/ui/ItemImage";
import { getTemplate } from "@/data/objetTemplates";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import type { AchatBazar } from "@/lib/bazar/achat";
import type { EtalBazar } from "@/types/game";
import { ArticleBazar } from "./ArticleBazar";
import { PLAQUE_ETIQUETTE } from "./etiquette";
import { BAZAR_LAYOUT, CLES_BAZAR, CLES_LOTS, CLE_VITRINE } from "./bazarLayout";

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
 * l'étal de la semaine posé sur les six cases de l'étagère derrière le
 * comptoir. Vue pure — tout arrive par les props, la composition avec le
 * contexte de jeu se fait dans `src/app/bazar/page.tsx`.
 */
export function BazarScene({ etal, jetons, onAcheter, onSortir }: BazarSceneProps) {
  const { d, tr, locale } = useLangue();
  const vitrine = etal.vitrine;
  const template = vitrine ? getTemplate(vitrine.templateId) : undefined;
  // Coordonnées lues par le hook, PAS dans le dictionnaire en direct : c'est
  // ce qui fait suivre l'objet quand on tire son cadre en mode calage
  // (`?qgedit=1`). Quatre appels inconditionnels, en tête de composant.
  const coordVitrine = useQgObjet(CLE_VITRINE);
  const coordSortie = useQgObjet("sortie");
  // Le libellé « Vendu — de retour lundi » est une phrase entière dans les
  // 4 langues (la version grecque est la plus longue). Une case de 20vw ne
  // suffit pas — le texte replierait vers le HAUT (le conteneur est ancré en
  // `bottom`) et empièterait sur la rangée du dessus. On lui donne toute la
  // largeur de la planche qui porte l'objet de la semaine (case1..case3), en
  // nowrap : s'il déborde malgré tout, ça déborde sur les côtés, dans le mur
  // nu du comptoir.
  const coordCase1 = useQgObjet("case1");
  const coordCase3 = useQgObjet("case3");
  const venduLeft = coordCase1.left;
  const venduWidth = coordCase3.left + coordCase3.width - coordCase1.left;

  return (
    <UnifiedPanorama
      image="/bazar/fond-bazar.webp"
      aspect={BAZAR_LAYOUT.panoramaAspect}
      zones={ZONES_BAZAR}
      ariaLabel={d.bazar.titre}
      editKeys={CLES_BAZAR}
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

      {/* La place est vide UNIQUEMENT si la vitrine a été achetée. Un
          `templateId` retiré du catalogue (`template === undefined`) laissait
          jusqu'ici afficher « Vendu — de retour lundi » sur un objet pourtant
          en vente : on retombe sur l'identifiant brut pour le libellé et sur
          un emplacement nu pour le visuel, mais l'article reste achetable. */}
      {vitrine ? (
        <ArticleBazar
          cle={CLE_VITRINE}
          visuel={
            <span style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}>
              {template ? (
                <ItemImage
                  templateId={template.templateId}
                  categorie={template.categorie}
                  alt=""
                  sizes="30vw"
                />
              ) : null}
            </span>
          }
          libelle={
            template
              ? nomObjet({ templateId: template.templateId, nom: template.nom }, locale)
              : vitrine.templateId
          }
          prix={vitrine.prix}
          jetons={jetons}
          onAcheter={() => onAcheter({ type: "vitrine" })}
        />
      ) : (
        // Le cadre garde la largeur de la planche et centre l'étiquette ; la
        // plaque, elle, se serre autour du texte au lieu de barrer toute la
        // rangée d'une bande sombre. En `nowrap`, elle déborde sur les côtés
        // si le grec est trop long — c'était déjà l'intention.
        <span
          data-testid="etiquette-vendu"
          style={{
            position: "absolute",
            left: `${qgPct(venduLeft)}%`,
            bottom: `${coordVitrine.bottom}%`,
            width: `${qgPct(venduWidth)}%`,
            textAlign: "center",
          }}
        >
          <span style={PLAQUE_ETIQUETTE}>{d.bazar.vendu}</span>
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
