"use client";

import type { CSSProperties } from "react";
import { PieceIcon } from "@/components/atelier/PieceIcon";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import type { CategorieObjet } from "@/types/game";

interface AtelierActionsProps {
  categorie: CategorieObjet;
  /**
   * Prix en pièces de la prochaine amélioration, ou `null` pour un objet au
   * sommet de l'échelle : il n'y a alors rien à améliorer, et un bouton
   * éternellement gris ne raconterait qu'une déception.
   */
  cout: number | null;
  /** Pièces rendues par le démantèlement. */
  rendement: number;
  /** Faux si l'atelier est plein, la compétence manque ou les pièces aussi. */
  ameliorationDisponible: boolean;
  /** Pourquoi c'est refusé — affiché par l'appelant, jamais avalé. */
  raisonRefus?: string;
  onAmeliorer: () => void;
  onDemanteler: () => void;
  onRefus: (raison: string) => void;
}

const zone: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

/**
 * Les deux boutons partagent tout sauf leur couleur et leur signe : même
 * gabarit, même chiffre en tête, même engrenage de catégorie. C'est ce qui
 * fait lire la paire comme un choix (donner des pièces / en recevoir) plutôt
 * que comme deux commandes sans rapport.
 */
function bouton(fond: string, teinte: string, actif: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    // Serré : DEUX boutons vivent maintenant là où un seul tenait, et c'est
    // le nom de l'objet qui paie la différence en rognage. 4 px de gouttière
    // et 5 px de flanc rendent ~16 px au titre sans que la cible tactile
    // descende sous le pouce (elle reste haute de 30 px, large de 42).
    gap: 4,
    padding: "4px 5px",
    border: `1px solid ${actif ? "var(--brass-500)" : "var(--paper-500)"}`,
    // Gris ET translucide : sur le papier crème de l'atelier, un simple gris
    // plein restait aussi présent que le bouton actif d'à côté.
    background: actif ? fond : "var(--paper-300)",
    color: actif ? teinte : "var(--ink-300)",
    opacity: actif ? 1 : 0.75,
    cursor: actif ? "pointer" : "not-allowed",
  };
}

const chiffre: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
};

export function AtelierActions({
  categorie,
  cout,
  rendement,
  ameliorationDisponible,
  raisonRefus,
  onAmeliorer,
  onDemanteler,
  onRefus,
}: AtelierActionsProps) {
  const { d, tr } = useLangue();
  const nomCategorie = libelleCategorie(categorie, d);

  return (
    <div style={zone}>
      {cout !== null && (
        <button
          type="button"
          // `aria-disabled` et non `disabled` : un bouton désactivé n'écoute
          // plus rien, et le joueur reste devant un gris muet. Celui-ci se
          // laisse taper pour dire ce qui manque.
          aria-disabled={ameliorationDisponible ? undefined : true}
          aria-label={tr(d.inventaire.ameliorerAria, { cout, categorie: nomCategorie })}
          onClick={(e) => {
            e.stopPropagation();
            if (!ameliorationDisponible) {
              if (raisonRefus) onRefus(raisonRefus);
              return;
            }
            onAmeliorer();
          }}
          style={bouton("var(--forest-700)", "var(--brass-300)", ameliorationDisponible)}
        >
          <span style={chiffre}>−{cout}</span>
          <PieceIcon categorie={categorie} size={18} />
        </button>
      )}
      <button
        type="button"
        aria-label={tr(d.inventaire.demantelerAria, {
          pieces: rendement,
          categorie: nomCategorie,
        })}
        onClick={(e) => {
          e.stopPropagation();
          onDemanteler();
        }}
        style={bouton("var(--danger)", "var(--paper-100)", true)}
      >
        <span style={chiffre}>+{rendement}</span>
        <PieceIcon categorie={categorie} size={18} />
      </button>
    </div>
  );
}
