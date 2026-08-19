"use client";

import type { EtalBazar } from "@/types/game";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import { nomObjet } from "@/lib/i18n/contenu";
import { getTemplate } from "@/data/objetTemplates";
import type { AchatBazar } from "@/lib/bazar/achat";

interface Props {
  etal: EtalBazar;
  jetons: number;
  onAcheter: (achat: AchatBazar) => void;
}

/**
 * Vue pure de l'étal du Bazar : aucun accès au contexte de jeu ni au routeur,
 * tout arrive par les props. Testable sans monter de partie, déplaçable dans
 * un vrai décor plus tard sans y toucher (le décor reste à faire avec
 * Guillaume — cet écran est fonctionnel et sobre).
 */
export function EtalBazarVue({ etal, jetons, onAcheter }: Props) {
  const { d, tr, locale } = useLangue();
  const prix = (n: number) => tr(n > 1 ? d.bazar.prixJetons : d.bazar.prixJetonUn, { n });

  const template = etal.vitrine ? getTemplate(etal.vitrine.templateId) : undefined;
  const nomVitrine =
    etal.vitrine && template ? nomObjet({ templateId: template.templateId, nom: template.nom }, locale) : "";

  return (
    <div>
      <h1>{d.bazar.titre}</h1>
      <h2>{d.bazar.fondDeCommerce}</h2>
      <ul>
        {etal.lotsPieces.map((lot, index) => (
          <li key={lot.categorie}>
            <button
              type="button"
              disabled={jetons < lot.prix}
              onClick={() => onAcheter({ type: "pieces", index })}
            >
              {tr(d.bazar.lotPieces, {
                n: lot.quantite,
                categorie: libelleCategorie(lot.categorie, d),
              })}{" "}
              — {prix(lot.prix)}
            </button>
          </li>
        ))}
      </ul>

      <h2>{d.bazar.vitrine}</h2>
      {etal.vitrine ? (
        <button
          type="button"
          disabled={jetons < etal.vitrine.prix}
          onClick={() => onAcheter({ type: "vitrine" })}
        >
          {nomVitrine} — {prix(etal.vitrine.prix)}
        </button>
      ) : (
        <p>{d.bazar.vendu}</p>
      )}

      <p>{tr(d.bazar.soldeJetons, { n: jetons })}</p>
    </div>
  );
}
