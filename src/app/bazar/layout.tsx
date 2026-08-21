"use client";

/**
 * Layout de `/bazar` : il n'existe que pour monter le fournisseur du mode
 * calage à la souris au-dessus de la boutique.
 *
 * Pourquoi un layout à lui : `QgEditProvider` n'était monté que dans
 * `src/app/(qg)/layout.tsx`, et `/bazar` vit HORS du groupe de routes `(qg)`.
 * Le contexte y était donc `null` : `QgEditOverlay` rendait `null`
 * (`!ctx?.enabled`), toute la plomberie `editKeys` était inerte, et
 * `http://localhost:3100/bazar?qgedit=1` n'affichait rien — la passe de calage
 * du décor était impossible. Constat C1 de la revue du 2026-08-20.
 *
 * Le panneau ne liste que les clés du Bazar : `QG_LAYOUT` n'a rien à faire sur
 * cet écran, et ses clés y renverraient des cadres invisibles.
 */

import type { ReactNode } from "react";
import { QgEditProvider } from "@/components/mobile/qg/dev/QgEditContext";
import { QgEditPanel } from "@/components/mobile/qg/dev/QgEditPanel";
import { useQgEditEnabled } from "@/components/mobile/qg/dev/useQgEditEnabled";
import { CLES_BAZAR } from "@/components/bazar/bazarLayout";

export default function BazarLayout({ children }: { children: ReactNode }) {
  // Hook unique et inconditionnel, au-dessus de tout return : c'est la règle
  // que `(qg)/layout.tsx` a apprise à ses dépens (crash React #310).
  const editEnabled = useQgEditEnabled();

  return (
    <QgEditProvider enabled={editEnabled}>
      {children}
      {editEnabled && <QgEditPanel cles={CLES_BAZAR} titre="Bazar edit" />}
    </QgEditProvider>
  );
}
