"use client";

import type { CSSProperties } from "react";

/**
 * Le chat posé à droite de la page « Soutenir », sur le bord haut du bouton
 * d'avis, comme s'il y marchait. Il ne demande rien, il désigne.
 *
 * Le sprite est un chat DE PROFIL EN MARCHE, dessiné tourné vers la gauche,
 * et il est laissé dans ce sens. Il est POSÉ, pas animé : rien ne bouge à
 * l'ouverture de la page, le chat est simplement là, sur le bord du bouton.
 */

const piste: CSSProperties = {
  // La piste ne mesure QUE la hauteur du chat : elle ne doit pas pousser le
  // bouton vers le bas au-delà de ce qu'on a réglé dans `BoutonsSoutien`.
  height: 50,
  marginBottom: -8,
  display: "flex",
  justifyContent: "flex-end",
  paddingRight: "6%",
  overflow: "hidden",
  pointerEvents: "none",
};

const chat: CSSProperties = {
  width: "auto",
  height: 50,
  display: "block",
  // Une ombre portée le décolle du vert sombre de la page.
  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
};

export function ChatPose() {
  return (
    <div style={piste} aria-hidden data-testid="soutien-chat">
      <img src="/ui/chat-marche.webp" alt="" draggable={false} style={chat} />
    </div>
  );
}
