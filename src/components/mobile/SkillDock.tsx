"use client";

import { useState, type CSSProperties } from "react";
import { Lock } from "lucide-react";

/** Un atout du dock du header bas (partagé chinage/vente). */
export type DockSkill = {
  id: string;
  nom: string;
  /** Illustration webp ; fallback emoji si le fichier manque (onError). */
  imageSrc: string;
  emojiFallback: string;
  verrouille: boolean;
  niveauRequis: number;
  /** Usages restants aujourd'hui (ignoré si verrouillé). */
  restants: number;
  /** Déjà activé pour la session (Le Flair) : surbrillance, plus cliquable. */
  actif?: boolean;
  /** Le contexte n'autorise pas l'usage (ex : Tchatche hors négo fâchée). */
  desactive?: boolean;
  ariaLabel: string;
  /** Appelé au tap — y compris verrouillé (le parent affiche le toast de niveau). */
  onActivate: () => void;
};

/**
 * Dock de compétences « jeu vidéo » du header bas (partagé chinage/vente) : un cercle par atout,
 * grisé + cadenas si pas encore débloqué, pastille d'usages restants sinon.
 * Un cercle verrouillé reste cliquable : le parent affiche le niveau requis.
 * Positionné en absolu : les cercles flottent au-devant du header, leur centre
 * aligné sur la ligne laiton supérieure — le parent doit être `position: relative`.
 */
export function SkillDock({ skills }: { skills: DockSkill[] }) {
  return (
    <div style={dockRow}>
      {skills.map((s) => (
        <SkillCircle key={s.id} skill={s} />
      ))}
    </div>
  );
}

function SkillCircle({ skill }: { skill: DockSkill }) {
  const [imgKo, setImgKo] = useState(false);
  const epuise = !skill.verrouille && skill.restants <= 0;
  const inerte = epuise || !!skill.desactive || !!skill.actif;
  return (
    <button
      type="button"
      aria-label={skill.ariaLabel}
      onClick={skill.onActivate}
      disabled={!skill.verrouille && inerte}
      style={circleBtn(skill.verrouille, !skill.verrouille && inerte, !!skill.actif)}
    >
      {imgKo ? (
        <span style={{ fontSize: 28, filter: skill.verrouille ? "grayscale(1)" : "none" }}>
          {skill.emojiFallback}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={skill.imageSrc}
          alt=""
          onError={() => setImgKo(true)}
          style={circleImg(skill.verrouille)}
        />
      )}
      {skill.verrouille && (
        <span style={lockOverlay}>
          <Lock size={20} strokeWidth={2.5} />
        </span>
      )}
      <span style={pastille}>
        {skill.verrouille ? `N${skill.niveauRequis}` : skill.restants}
      </span>
    </button>
  );
}

const dockRow: CSSProperties = {
  // Flotte au-devant du header : centre des cercles sur la ligne laiton
  // supérieure (bordure 3px → son centre est 1.5px au-dessus du padding-box).
  position: "absolute",
  top: -1.5,
  right: 16,
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const circleBtn = (
  verrouille: boolean,
  inerte: boolean,
  actif: boolean,
): CSSProperties => ({
  position: "relative",
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: `2px solid ${actif ? "var(--brass-300)" : "var(--brass-500)"}`,
  background: "var(--forest-800)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: verrouille || !inerte ? "pointer" : "default",
  opacity: inerte && !actif ? 0.4 : 1,
  boxShadow: actif
    ? "0 0 10px 2px rgba(214,178,94,0.55)"
    : "0 1px 3px rgba(0,0,0,0.35)",
  overflow: "visible",
});

const circleImg = (verrouille: boolean): CSSProperties => ({
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
  filter: verrouille ? "grayscale(1) brightness(0.55)" : "none",
});

/** Cadenas centré par-dessus l'illustration grisée. */
const lockOverlay: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--paper-100)",
  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
};

/** Pastille bas-droite : usages restants, ou « N{niveau} » si verrouillé. */
const pastille: CSSProperties = {
  position: "absolute",
  right: -4,
  bottom: -4,
  minWidth: 20,
  height: 20,
  padding: "0 4px",
  borderRadius: 999,
  background: "var(--brass-500)",
  border: "1.5px solid var(--forest-800)",
  color: "var(--forest-800)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
