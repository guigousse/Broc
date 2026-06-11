"use client";

import type { CSSProperties } from "react";
import {
  CHAT_BALADEUR_ORDER,
  selectChatBaladeur,
  type ChatBaladeurId,
} from "@/lib/chatBaladeur";
import { useChatBaladeurCoord, useQgEditContext } from "./dev/QgEditContext";

interface QgChatBaladeurProps {
  jourActuel: number;
  chatSurFauteuil: boolean;
}

const SRC: Record<ChatBaladeurId, string> = {
  "qg-fenetre": "/qg/chat-baladeur/qg-fenetre.webp",
  "atelier-fenetre": "/qg/chat-baladeur/atelier-fenetre.webp",
  "atelier-marche": "/qg/chat-baladeur/atelier-marche.webp",
};

function ChatSprite({ id }: { id: ChatBaladeurId }) {
  const { left, bottom, width } = useChatBaladeurCoord(id);
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
  return <img src={SRC[id]} alt="" draggable={false} style={style} aria-hidden />;
}

export function QgChatBaladeur({
  jourActuel,
  chatSurFauteuil,
}: QgChatBaladeurProps) {
  const ctx = useQgEditContext();
  // En édition active, on rend les 3 sprites pour placement pixel-perfect.
  if (ctx?.enabled && ctx.active) {
    return (
      <>
        {CHAT_BALADEUR_ORDER.map((id) => (
          <ChatSprite key={id} id={id} />
        ))}
      </>
    );
  }

  const id = selectChatBaladeur(jourActuel, chatSurFauteuil);
  if (id === null) return null;
  return <ChatSprite id={id} />;
}
