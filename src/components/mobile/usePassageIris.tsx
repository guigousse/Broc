"use client";

import { useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import {
  dureesIris,
  poserFlagIris,
  prefersReducedMotion,
} from "@/lib/transitionIris";
import { audioManager } from "@/lib/audio/audioManager";
import { IrisFermeture } from "./IrisTransition";

interface PassageIris {
  /** L'overlay de fermeture, à rendre par l'appelant. `null` au repos. */
  overlay: JSX.Element | null;
  /** Ferme l'iris, puis navigue vers `href` une fois l'écran noir. */
  partirVers: (href: string) => void;
}

/**
 * Le passage bureau ↔ Bazar : le même iris que l'écran-titre vers le bureau,
 * 30 % plus court (cf. `dureesIris`). On change de LIEU, pas d'onglet — le
 * rideau le dit mieux qu'une bascule sèche de route.
 *
 * Les deux sens partagent ce hook exprès : ils font la même chose, et la seule
 * façon sûre de garder l'ordre (noir → flag → navigation) est de ne l'écrire
 * qu'une fois. Le flag est ce que l'écran d'arrivée consomme pour rouvrir
 * l'iris — `IrisArrivee`, monté des deux côtés.
 *
 * Contrairement au départ de l'écran-titre, le trou est centré sur l'écran et
 * non sur une porte peinte : au moment du tap, la feuille de la porte couvre
 * déjà le panorama, il n'y a plus de porte à viser.
 */
export function usePassageIris(): PassageIris {
  const router = useRouter();
  const [cible, setCible] = useState<string | null>(null);

  const partirVers = (href: string) => {
    // Un iris est déjà en cours : le second tap est ignoré. L'overlay laisse
    // passer les taps sur le bouton resté sous lui pendant plus d'une seconde,
    // et deux départs, ce sont deux entrées d'historique pour un seul geste.
    if (cible !== null) return;
    // Le gramophone s'éteint AVEC le cercle, et pas au moment du noir : le
    // fondu prend exactement la durée de la fermeture (la même arithmétique
    // que le départ de l'écran-titre, cf. `lancerIrisVers`). On descend le
    // BUS, donc la musique et le crépitement de l'aiguille ensemble, sans
    // arrêter la lecture — le disque tourne en silence pendant la visite et le
    // layout (qg) le rallume tout seul au retour, là où il en est rendu.
    const durees = dureesIris("court");
    audioManager.setVinylAmbianceVolume(
      0,
      prefersReducedMotion() ? durees.fadeReduit : durees.fermeture,
    );
    setCible(href);
  };

  // `window` n'est lu qu'une fois le départ demandé : au premier rendu (et au
  // prérendu statique) `cible` est nul et cette branche n'est pas évaluée.
  const overlay =
    cible === null ? null : (
      <IrisFermeture
        variante="court"
        cx={window.innerWidth / 2}
        cy={window.innerHeight / 2}
        onNoir={() => {
          poserFlagIris("court");
          router.push(cible);
        }}
      />
    );

  return { overlay, partirVers };
}
