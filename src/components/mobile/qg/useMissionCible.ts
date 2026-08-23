"use client";

import { useState } from "react";

/**
 * Cible du carnet à déplier d'office, dérivée de deux sources : `missionUrl`
 * (le `?mission=` de la route — posé par une navigation explicite, tap sur
 * une pastille de livrable, ou `router.replace` en place quand le carnet
 * est déjà ouvert) et une attente locale (`armerAttente`), posée quand rien
 * dans l'URL ne peut porter la cible sans ouvrir le carnet malgré le
 * joueur (chapitre du grand-père accepté carnet FERMÉ, pastille hors
 * `/quetes`).
 *
 * La cible est GELÉE à chaque transition qui compte — ouverture du carnet,
 * ou changement de `missionUrl` pendant qu'il reste ouvert — calculée
 * PENDANT le rendu (comparaison aux props précédentes, pas un `useEffect`) :
 * un effet purgerait l'attente un commit trop tard, après que la valeur
 * fraîche qu'il vient de dévoiler ait déjà cédé la place, au rendu suivant,
 * à une URL périmée (le bouton retour restaurant une mission déjà livrée).
 * Geler pendant le rendu résout tout en un seul commit : pas de second
 * rendu, pas de retour en arrière visible dans le carnet.
 *
 * Priorité de l'attente sur l'URL : une navigation explicite (tap sur une
 * pastille, ou le `router.replace` du chapitre recalé en place) DOIT purger
 * l'attente avant de poser sa propre cible (`armerAttente(null)`) — sinon
 * une attente périmée masquerait la cible fraîchement voulue. C'est
 * l'inverse (l'URL toujours prioritaire) qui casse le scénario du bouton
 * retour : livrer un chapitre depuis le carnet ferme la route (`/bureau`),
 * le chapitre suivant s'arme en attente carnet fermé, puis un retour
 * arrière restaure `/quetes?mission=<déjà livré>` — sans la priorité à
 * l'attente, cette valeur périmée regagnerait la main sur la cible fraîche.
 */
export function useMissionCible(carnetOuvert: boolean, missionUrl: string | null) {
  const [attente, setAttente] = useState<string | null>(null);
  const [cibleGelee, setCibleGelee] = useState<string | null>(
    carnetOuvert ? missionUrl : null,
  );
  const [precedent, setPrecedent] = useState({ carnetOuvert, missionUrl });

  const aChange =
    carnetOuvert !== precedent.carnetOuvert || missionUrl !== precedent.missionUrl;
  if (aChange) {
    if (carnetOuvert) {
      setCibleGelee(attente ?? missionUrl);
      setAttente(null);
    }
    setPrecedent({ carnetOuvert, missionUrl });
  }

  return {
    missionCibleId: carnetOuvert ? cibleGelee : null,
    armerAttente: setAttente,
  };
}
