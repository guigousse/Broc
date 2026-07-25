import type { CSSProperties, ReactNode } from "react";

const barre: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--forest-800)",
  borderTop: "3px solid var(--brass-500)",
  padding: "8px 16px calc(8px + var(--safe-bottom))",
};

/**
 * Châssis de la barre du bas des écrans de session (chinage, vente, bilan) :
 * fond forêt, liseré laiton, zone sûre du bas. Un seul objet visuel partagé —
 * le deck d'objets y met « Sortir » + les atouts, le bilan y met « Retour au
 * QG » + la jauge de stockage.
 */
export function BarreBasSession({
  gauche,
  droite,
}: {
  gauche: ReactNode;
  droite: ReactNode;
}) {
  return (
    <div style={barre}>
      {gauche}
      {droite}
    </div>
  );
}
