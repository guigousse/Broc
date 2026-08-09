"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Ferme une sheet du QG dès que la route quitte /bureau. La
 * GramophoneSheet laisse la TabBar visible et cliquable (scrim arrêté
 * au-dessus de la barre) : on peut naviguer vers /stockage, /atelier ou
 * /bibliotheque — même groupe de routes (qg), le layout ne se démonte
 * pas — et la sheet resterait sinon affichée par-dessus la fenêtre
 * flottante. Fermer (plutôt que masquer) libère aussi l'effet de volume
 * lié à `gramophoneOuvert`.
 */
export function useFermerSheetHorsBureau(fermer: () => void) {
  const pathname = usePathname();
  // Ref : le layout passe une closure recréée à chaque rendu ; seule la
  // route doit déclencher la fermeture, pas l'identité du callback.
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;
  useEffect(() => {
    if (pathname !== "/bureau") fermerRef.current();
  }, [pathname]);
}
