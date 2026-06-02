"use client";

import type { CSSProperties } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const btnStyle = (active: boolean): CSSProperties => ({
  position: "fixed",
  top: "calc(var(--mobile-header-h) + 6px + var(--safe-top, 0px))",
  right: 8,
  zIndex: 50,
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  background: active ? "var(--brass-500)" : "rgba(0,0,0,0.45)",
  color: active ? "var(--forest-800)" : "var(--brass-300)",
  border: "1px solid var(--brass-500)",
  borderRadius: 4,
  fontFamily: "monospace",
  fontSize: 12,
  cursor: "pointer",
  pointerEvents: "auto",
});

/** Petit bouton flottant pour activer/désactiver le mode édition (?edit=1). */
export function QgEditToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("edit") === "1";

  function toggle() {
    const next = new URLSearchParams(searchParams.toString());
    if (active) next.delete("edit");
    else next.set("edit", "1");
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={active ? "Quitter le mode édition" : "Activer le mode édition"}
      title={active ? "Quitter le mode édition" : "Activer le mode édition"}
      style={btnStyle(active)}
    >
      {active ? "✕" : "✎"}
    </button>
  );
}
