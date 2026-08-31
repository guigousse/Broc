"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { qgPct } from "@/components/mobile/qg/layout";
import { useQgObjet } from "@/components/mobile/qg/dev/QgEditContext";
import { DialogueOverlay } from "@/components/mobile/dialogue/DialogueOverlay";
import {
  REPLIQUES_TENANCIER_BAZAR,
  SEQUENCES_TENANCIER_BAZAR,
  TENANCIER_BAZAR_PORTRAITS,
} from "@/data/dialogues";
import { lignesDialogue, nomExpediteur } from "@/lib/i18n/contenu";
import { useLangue } from "@/lib/i18n/LangueContext";
import { decouperRestant } from "@/lib/dureeRestante";
import { prochainLundiLocalMs } from "@/lib/quetes/periode";

/**
 * L'expéditeur dont le tenancier porte le nom et le visage. Ce n'est pas un
 * personnage de plus : le joueur reçoit déjà ses commandes par courrier, il le
 * retrouve ici derrière un comptoir.
 */
const ID_TENANCIER = "jeux-video";

/** La ligne du calendrier, jouée en dernier quoi qu'il arrive. */
const SEQUENCE_DELAI = SEQUENCES_TENANCIER_BAZAR.bazar_tenancier_delai;

interface TenancierBazarProps {
  /** L'horloge du jeu (`tempsConfiance`), ou `Date.now` à défaut. */
  horloge?: () => number;
  /** Tirage de la réplique, injecté par les tests. */
  tirage?: () => number;
}

/**
 * LE TENANCIER DU BAZAR, qui répond quand on lui parle.
 *
 * Il a longtemps été décor — `aria-hidden`, sourd aux taps — et le commentaire
 * de la scène disait pourquoi : « il n'a encore ni nom ni réplique, et en faire
 * un bouton promettrait une interaction qui n'existe pas ». Il a les deux
 * maintenant. Il porte le nom et le visage du **Joueur du Vide-grenier**, l'un
 * des commanditaires du courrier : le joueur le connaît déjà, il le retrouve
 * derrière un comptoir.
 *
 * Deux répliques par conversation : une phrase de comptoir tirée au hasard,
 * puis TOUJOURS le calendrier du prochain arrivage — c'est l'information
 * utile, et elle ne doit pas dépendre d'un tirage.
 */
export function TenancierBazar({ horloge, tirage = Math.random }: TenancierBazarProps) {
  const { d, tr, locale } = useLangue();
  const coord = useQgObjet("vendeur");
  const [index, setIndex] = useState<number | null>(null);
  // La dernière réplique servie : six phrases ne servent à rien si le tirage
  // rend deux fois la même à la suite — c'est la répétition qui se remarque.
  const precedente = useRef<number | null>(null);

  const ouvrir = () => {
    const total = REPLIQUES_TENANCIER_BAZAR.length;
    let i = Math.min(total - 1, Math.floor(tirage() * total));
    if (i === precedente.current) i = (i + 1) % total;
    precedente.current = i;
    setIndex(i);
  };

  const maintenant = horloge?.() ?? Date.now();
  // En toutes lettres, avec son singulier : le tenancier ne lit pas « 4 j » à
  // voix haute. Le découpage est pur (`decouperRestant`) et c'est ici qu'on va
  // chercher le mot dans la langue du joueur.
  const { unite, n } = decouperRestant(prochainLundiLocalMs(maintenant) - maintenant);
  const MOTS = {
    jours: n > 1 ? d.bazar.delaiJours : d.bazar.delaiJourUn,
    heures: n > 1 ? d.bazar.delaiHeures : d.bazar.delaiHeureUne,
    minutes: n > 1 ? d.bazar.delaiMinutes : d.bazar.delaiMinuteUne,
  };
  const restant = tr(MOTS[unite], { n });

  const style: CSSProperties = {
    position: "absolute",
    left: `${qgPct(coord.left)}%`,
    bottom: `${coord.bottom}%`,
    width: `${qgPct(coord.width)}%`,
    // Le calque d'objets du panorama est en `pointer-events: none` : sans ce
    // rétablissement, le bouton ne recevrait aucun tap.
    pointerEvents: "auto",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  };

  const sequence = index === null ? null : REPLIQUES_TENANCIER_BAZAR[index];

  return (
    <>
      <button
        type="button"
        data-testid="tenancier-bazar"
        aria-label={d.bazar.parlerTenancier}
        onClick={ouvrir}
        style={style}
      >
        {/* Hauteur en `auto` : la largeur commande, le buste garde ses
            proportions. Son bas se confond avec l'arête arrière du plateau
            (cf. `BAZAR_LAYOUT.objets.vendeur`), ce qui le place DERRIÈRE le
            comptoir plutôt que posé dessus. Le dessin reste muet — c'est le
            bouton qui porte le nom. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bazar/vendeur-bazar.webp"
          alt=""
          draggable={false}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </button>

      {sequence && (
        <DialogueOverlay
          // La séquence porte les DEUX lignes : c'est elle qui donne son
          // humeur au portrait, ligne par ligne.
          sequence={{ ...sequence, lignes: [...sequence.lignes, ...SEQUENCE_DELAI.lignes] }}
          nom={nomExpediteur(ID_TENANCIER, locale)}
          portraits={TENANCIER_BAZAR_PORTRAITS}
          // DEUX bulles : la salutation, puis le calendrier. Elles ont été
          // réunies un moment le 2026-08-26, puis séparées de nouveau — le
          // temps de lecture entre les deux fait la respiration d'un
          // bonjour de comptoir.
          //
          // Les lignes sont fournies plutôt que lues dans la séquence, parce
          // que la seconde porte du BALISAGE (le délai en gras et souligné)
          // que le contenu scénarisé — de simples chaînes — ne transporte pas.
          lignes={[
            lignesDialogue(sequence, locale)[0],
            enRelief(lignesDialogue(SEQUENCE_DELAI, locale)[0], restant),
          ]}
          onFini={() => setIndex(null)}
        />
      )}
    </>
  );
}

/**
 * La phrase du calendrier, son `{t}` remplacé par le délai EN RELIEF — gras et
 * souligné. C'est la seule chose de la bulle que le joueur doit pouvoir
 * attraper d'un coup d'œil, le reste est de la conversation.
 *
 * Le gabarit est découpé AUTOUR de son jeton plutôt que concaténé : chaque
 * langue place le délai où sa grammaire l'exige, et une concaténation
 * « phrase + valeur » figerait l'ordre français.
 */
function enRelief(gabarit: string, valeur: string): ReactNode {
  const morceaux = gabarit.split("{t}");
  return (
    <>
      {morceaux.map((morceau, i) => (
        <span key={i}>
          {i > 0 ? (
            <strong
              // Insécable : « 4 jours » coupé en fin de ligne casse le
              // soulignement en deux morceaux et le nombre se retrouve orphelin
              // (vu à la capture du 2026-08-26).
              style={{ textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              {valeur}
            </strong>
          ) : null}
          {morceau}
        </span>
      ))}
    </>
  );
}
