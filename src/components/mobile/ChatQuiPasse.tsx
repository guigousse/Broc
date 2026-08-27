"use client";

import type { CSSProperties } from "react";

/**
 * Le chat du bureau, qui traverse la page « Soutenir » et vient s'asseoir
 * juste au-dessus du bouton d'avis. Il ne demande rien, il montre : l'œil
 * suit le mouvement, et le mouvement s'arrête sur le bouton.
 *
 * ⚠ Le sprite est un chat ASSIS vu de dos (`/qg/chat-baladeur/qg-fenetre.webp`,
 * le seul qui existe). Il n'y a donc pas de cycle de marche : le pas est joué
 * par un balancement (`broc-chat-pas`) pendant la traversée, puis s'arrête net
 * quand le chat s'assoit. Le jour où un vrai sprite de profil sera dessiné,
 * c'est ici, et seulement ici, qu'il se branchera.
 */

const piste: CSSProperties = {
  // La piste ne mesure QUE la hauteur du chat : elle ne doit pas pousser le
  // bouton vers le bas au-delà de ce qu'on a réglé dans `BoutonsSoutien`.
  height: 46,
  marginBottom: -4,
  paddingLeft: "18%",
  overflow: "hidden",
  pointerEvents: "none",
};

const chat: CSSProperties = {
  width: "auto",
  height: 46,
  display: "block",
  // Le sprite du bureau est éclairé pour un panorama de jour ; sur le vert
  // sombre de cette page, une ombre portée le décolle du fond.
  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
};

export function ChatQuiPasse() {
  return (
    <div style={piste} aria-hidden data-testid="soutien-chat">
      <div className="broc-chat-traversee">
        <div className="broc-chat-pas">
          <img
            src="/qg/chat-baladeur/qg-fenetre.webp"
            alt=""
            draggable={false}
            style={chat}
          />
        </div>
      </div>
    </div>
  );
}
