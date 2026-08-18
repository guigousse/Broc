"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ItemImage } from "@/components/ui/ItemImage";
import type { CategorieObjet } from "@/types/game";

interface Props {
  /** Objet demandé. Prioritaire sur `icone` si les deux sont fournis. */
  templateId?: string;
  categorie?: CategorieObjet;
  /** Icône Lucide pour une quête sans objet nommé. */
  icone?: LucideIcon;
  /** Côté du cadre, en px. */
  taille: number;
  /** Rotation en degrés — c'est elle qui donne l'air « posé à la main ». */
  inclinaison?: number;
  /** Pastille ✓ en coin. */
  accompli?: boolean;
  alt?: string;
}

/** Ombre portée douce — un papier posé sur la page, pas un cadre encadré. */
const OMBRE_CADRE =
  "0 3px 7px rgba(27, 24, 18, 0.28), 0 1px 2px rgba(27, 24, 18, 0.18)";

/**
 * Un objet de quête « scotché » sur la page du carnet, comme une photo
 * polaroid : cadre papier légèrement pivoté, bande de ruban adhésif en haut,
 * pastille ✓ en coin quand la quête est accomplie.
 *
 * Deux modes exclusifs (voir la brief) : `templateId` prime sur `icone` si
 * les deux sont fournis par erreur d'appel ; sans l'un ni l'autre, un cadre
 * vide — jamais d'exception, le carnet ne doit pas se briser sur une donnée
 * bancale.
 */
export function PhotoScotchee({
  templateId,
  categorie,
  icone: Icone,
  taille,
  inclinaison = -2,
  accompli = false,
  alt = "",
}: Props) {
  const mode = templateId ? "objet" : Icone ? "icone" : "vide";
  const marge = Math.max(4, Math.round(taille * 0.09));

  const cadreStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: taille,
    height: taille,
    padding: marge,
    boxSizing: "border-box",
    background: "var(--paper-100)",
    borderRadius: 3,
    boxShadow: OMBRE_CADRE,
    transform: `rotate(${inclinaison}deg)`,
  };

  const rubanStyle: CSSProperties = {
    position: "absolute",
    top: -Math.round(taille * 0.1),
    left: "50%",
    width: Math.round(taille * 0.5),
    height: Math.round(taille * 0.24),
    transform: "translateX(-50%) rotate(-3deg)",
    background: "var(--brass-500)",
    opacity: 0.5,
    boxShadow: "0 1px 2px rgba(27, 24, 18, 0.2)",
    pointerEvents: "none",
  };

  const pastilleStyle: CSSProperties = {
    position: "absolute",
    bottom: -Math.round(taille * 0.09),
    right: -Math.round(taille * 0.09),
    width: Math.round(taille * 0.36),
    height: Math.round(taille * 0.36),
    borderRadius: "50%",
    background: "var(--patina-500)",
    color: "var(--paper-100)",
    display: "grid",
    placeItems: "center",
    fontSize: Math.round(taille * 0.2),
    fontWeight: 700,
    boxShadow: "0 1px 3px rgba(27, 24, 18, 0.3)",
  };

  return (
    <span data-photo-scotchee={mode} style={cadreStyle}>
      <span aria-hidden style={rubanStyle} />
      {mode === "objet" && (
        /* Noir et blanc tant que l'objet n'est pas dans l'inventaire : la
           pastille ✓ était trop discrète pour porter seule la différence
           entre « trouvé » et « à chiner » (retour device).
           Le filtre est posé sur ce calque, PAS sur le cadre : il ne doit
           déteindre ni sur le papier ni sur le ruban de scotch en laiton. */
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            filter: accompli ? undefined : "grayscale(1) contrast(0.95)",
          }}
        >
          <ItemImage
            templateId={templateId!}
            categorie={categorie ?? "Maison"}
            alt={alt}
            fallbackIconSize={Math.round(taille * 0.5)}
          />
        </span>
      )}
      {/* `&& Icone` est redondant avec `mode === "icone"` (le mode s'en déduit,
          cf. le calcul plus haut) mais TypeScript ne propage pas ce lien : sans
          lui, `Icone` reste `LucideIcon | undefined` sous le JSX. */}
      {mode === "icone" && Icone && (
        <Icone
          size={Math.round(taille * 0.5)}
          color="var(--ink-500)"
          aria-hidden
        />
      )}
      {accompli && (
        <span aria-hidden style={pastilleStyle}>
          ✓
        </span>
      )}
    </span>
  );
}
