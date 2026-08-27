"use client";

import type { CSSProperties } from "react";

/**
 * Le chat qui traverse la page « Soutenir » et vient se poster à droite,
 * juste au-dessus du bouton d'avis. Il ne demande rien, il montre : l'œil
 * suit le mouvement, et le mouvement s'arrête sur le bouton.
 *
 * Le sprite est un chat DE PROFIL EN MARCHE, dessiné tourné vers la gauche.
 * Il est retourné ici (`scaleX(-1)`) pour marcher dans le sens de la
 * traversée — de la gauche vers sa place, à droite.
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
  // Le dessin regarde à gauche : on le retourne pour qu'il aille dans le sens
  // de sa marche.
  transform: "scaleX(-1)",
  // Une ombre portée le décolle du vert sombre de la page.
  filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))",
};

export function ChatQuiPasse() {
  return (
    <div style={piste} aria-hidden data-testid="soutien-chat">
      <div className="broc-chat-traversee">
        <div className="broc-chat-pas">
          <img
            src="/ui/chat-marche.webp"
            alt=""
            draggable={false}
            style={chat}
          />
        </div>
      </div>
    </div>
  );
}
