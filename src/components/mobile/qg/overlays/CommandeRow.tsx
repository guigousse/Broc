"use client";

import { type CSSProperties } from "react";
import { getTemplate } from "@/data/objetTemplates";
import { getExpediteur } from "@/data/expediteursCourrier";
import { progressionMission } from "@/lib/missions";
import { ItemImage } from "@/components/ui/ItemImage";
import type { Courrier, GameState } from "@/types/game";

interface Props {
  courrier: Courrier;
  state: GameState;
  ouvert: boolean;
  onToggle: () => void;
  onLivrer: () => void;
}

const row: CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "10px 12px", background: "transparent", border: "none",
  borderBottom: "1px solid rgba(110,31,31,0.18)", cursor: "pointer", textAlign: "left",
};
const avatar: CSSProperties = {
  width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto",
  border: "2px solid #c8a24a", objectFit: "cover", objectPosition: "top center", background: "#d9c79a",
  display: "grid", placeItems: "center", color: "#6e1f1f",
  fontFamily: "var(--font-display)", fontSize: 16, overflow: "hidden",
};

export function CommandeRow({ courrier, state, ouvert, onToggle, onLivrer }: Props) {
  if (courrier.payload.type !== "mission") return null;
  const p = courrier.payload;
  const exp = getExpediteur(p.expediteurId);
  const prog = progressionMission(p, state.inventaireJoueur);
  const jLimite = p.jourLimite;
  const jRestants = jLimite !== undefined ? Math.max(0, jLimite - state.jourActuel) : null;

  return (
    <div>
      <button type="button" style={row} onClick={onToggle} aria-expanded={ouvert}>
        {exp?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exp.avatar} alt="" style={avatar} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <span style={avatar}>{exp?.nom?.[0] ?? "?"}</span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 13, color: "#1a1308" }}>{p.titre}</span>
          <span style={{ display: "block", fontFamily: "var(--font-serif)", fontSize: 11, color: "#7a6a44" }}>
            {exp ? `${exp.nom} · ${exp.personnalite}` : ""}
          </span>
        </span>
        <span style={{ textAlign: "right", flex: "0 0 auto" }}>
          {prog.livrable ? (
            <span style={{ display: "inline-block", background: "#2c5e3f", color: "#f4e9cd", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10 }}>Prêt ✓</span>
          ) : (
            <>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8a6d2e", fontSize: 13 }}>{prog.remplies}/{prog.total}</span>
              <span style={{ display: "block", width: 46, height: 5, background: "#e3d7b6", borderRadius: 3, marginTop: 3, overflow: "hidden" }}>
                <span style={{ display: "block", width: `${(prog.remplies / prog.total) * 100}%`, height: "100%", background: "#c8a24a" }} />
              </span>
            </>
          )}
          {jRestants !== null && (
            <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, marginTop: 2, color: jRestants <= 3 ? "#a31f1f" : "#8a7a52" }}>J−{jRestants}</span>
          )}
        </span>
      </button>

      {ouvert && (
        <div style={{ padding: "4px 14px 14px", background: "rgba(255,250,235,0.45)", borderBottom: "1px solid rgba(110,31,31,0.18)" }}>
          {p.corps.map((para, i) => (
            <p key={i} style={{ fontStyle: "italic", color: "#4a3f28", fontSize: 12, margin: "6px 0" }}>{para}</p>
          ))}
          <div style={{ fontFamily: "var(--font-display)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6e1f1f", margin: "8px 0 4px" }}>
            Objets demandés ({prog.remplies}/{prog.total})
          </div>
          {p.cibles.map((cible, i) => {
            const tpl = getTemplate(cible.templateId);
            const ok = prog.ciblesRemplies[i];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgba(110,31,31,0.18)", opacity: ok ? 1 : 0.7 }}>
                <span style={{ width: 30, height: 30, flex: "0 0 auto" }}>
                  <ItemImage templateId={cible.templateId} categorie={tpl?.categorie ?? "Maison"} alt="" fallbackIconSize={20} />
                </span>
                <span style={{ flex: 1, fontSize: 12, color: "#2b2418" }}>
                  {tpl?.nom ?? cible.templateId}
                  {cible.etatMin ? <span style={{ display: "block", fontSize: 10, color: "#8a7a52" }}>état min : {cible.etatMin}</span> : null}
                </span>
                <span style={{ color: ok ? "#2c5e3f" : "#b3a06a", fontWeight: 700 }}>{ok ? "✓" : "○"}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#4a3f28" }}>Récompense <b style={{ color: "#8a6d2e" }}>+{p.recompense.argent} €</b></span>
            <button
              type="button"
              onClick={onLivrer}
              disabled={!prog.livrable}
              style={{
                background: prog.livrable ? "#6e1f1f" : "#b3a06a", color: "#f4e9cd", border: "none",
                borderRadius: 6, padding: "8px 16px", fontFamily: "var(--font-display)", fontSize: 11,
                letterSpacing: "0.14em", textTransform: "uppercase", cursor: prog.livrable ? "pointer" : "default",
                opacity: prog.livrable ? 1 : 0.6,
              }}
            >
              {prog.livrable ? "Livrer" : `Livrer (${prog.remplies}/${prog.total})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
