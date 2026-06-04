"use client";

import type { CSSProperties } from "react";
import { selectChatBaladeur } from "@/lib/chatBaladeur";
import { CHAT_BALADEUR_LAYOUT } from "./chatBaladeurLayout";
import { useChatBaladeurCoord } from "./dev/QgEditContext";

interface QgChatBaladeurProps {
  jourActuel: number;
  chatSurFauteuil: boolean;
}

const SRC: Record<keyof typeof CHAT_BALADEUR_LAYOUT, string> = {
  "qg-fenetre":      "/qg/chat-baladeur/qg-fenetre.webp",
  "atelier-fenetre": "/qg/chat-baladeur/atelier-fenetre.webp",
  "atelier-marche":  "/qg/chat-baladeur/atelier-marche.webp",
};

export function QgChatBaladeur({ jourActuel, chatSurFauteuil }: QgChatBaladeurProps) {
  const id = selectChatBaladeur(jourActuel, chatSurFauteuil);
  // Hooks doivent toujours être appelés dans le même ordre — on hooke
  // avec un id stable (le premier de la table) puis on guard à la fin.
  const fallbackId = "qg-fenetre" as const;
  const { left, bottom, width } = useChatBaladeurCoord(id ?? fallbackId);

  if (id === null) return null;

  const style: CSSProperties = {
    position: "absolute",
    left: `${left}vw`,
    bottom: `${bottom}%`,
    width: `${width}vw`,
    height: "auto",
    pointerEvents: "none",
    userSelect: "none",
    display: "block",
    zIndex: 2,
  };

  return (
    <img
      src={SRC[id]}
      alt=""
      draggable={false}
      style={style}
      aria-hidden
    />
  );
}
