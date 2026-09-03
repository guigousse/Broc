"use client";

import type { CSSProperties } from "react";
import { Heart, Sword, Zap } from "lucide-react";
import { statsDuel } from "@/data/duel/cartesDuel";
import { proieDe } from "@/data/duel/roue";
import { getPiece } from "@/data/pieces";
import { libelleTexteDuel } from "@/lib/duel/libelles";
import { useLangue } from "@/lib/i18n/LangueContext";
import { libelleCategorie } from "@/lib/i18n/libelles";
import type { CategorieObjet } from "@/types/game";

const ligne: CSSProperties = { marginTop: 10, display: "flex", justifyContent: "center", gap: 18, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--paper-100)" };
const stat: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4 };
const cout: CSSProperties = { ...stat, color: "var(--brass-300)", fontWeight: 700 };
const texte: CSSProperties = { marginTop: 8, textAlign: "center", fontSize: 13, lineHeight: 1.35, color: "var(--paper-100)", fontStyle: "italic" };
const proie: CSSProperties = { marginTop: 6, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--brass-300)" };

export function LigneDuel({ id }: { id: string }) {
  const { d, tr } = useLangue();
  const piece = getPiece(id);
  if (!piece || piece.album !== "classeur") return null;
  const s = statsDuel(id);
  const t = libelleTexteDuel(s.texte, d);
  return (
    <div data-testid="ligne-duel">
      <div style={ligne}>
        <span style={cout} aria-label={d.duel.cout}><Zap size={14} strokeWidth={2} />{s.cout}</span>
        <span style={stat} aria-label={d.duel.attaque}><Sword size={14} strokeWidth={1.5} />{s.attaque}</span>
        <span style={stat} aria-label={d.duel.pv}><Heart size={14} strokeWidth={1.5} />{s.pv}</span>
      </div>
      {t && <div style={texte} data-testid="duel-texte">{t}</div>}
      <div style={proie}>{tr(d.duel.casse, { categorie: libelleCategorie(proieDe(piece.serie as CategorieObjet), d) })}</div>
    </div>
  );
}
