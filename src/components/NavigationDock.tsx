"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Album,
  Anvil,
  BookOpen,
  History,
  Home,
  Trophy,
  Warehouse,
} from "lucide-react";
import { useGame } from "@/context/GameContext";
import { brocantesParTier } from "@/data/brocantes";
import { estDebloquee } from "@/lib/deblocage";

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

interface DockItem {
  icon: LucideIcon;
  label: string;
  path: string;
  disabled?: boolean;
  title?: string;
}

export function NavigationDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isHydrated } = useGame();

  // Pas de dock tant que le jeu n'est pas chargé ou sur la home / 404.
  if (!isHydrated || !state) return null;
  if (pathname === "/" || pathname === "/_not-found") return null;

  // Vrai si une brocante tier ≥ 3 est débloquée → ouvre la salle des trophées.
  const debloqueesParTier = new Map<1 | 2 | 3 | 4, Set<string>>([
    [1, new Set<string>()],
    [2, new Set<string>()],
    [3, new Set<string>()],
    [4, new Set<string>()],
  ]);
  for (const tier of [1, 2, 3, 4] as const) {
    for (const b of brocantesParTier(tier)) {
      if (estDebloquee(b, state, debloqueesParTier)) {
        debloqueesParTier.get(tier)!.add(b.id);
      }
    }
  }
  const aUneTrois = debloqueesParTier.get(3)!.size > 0;

  const items: DockItem[] = [
    { icon: Home, label: "QG", path: "/qg" },
    { icon: Warehouse, label: "Stockage", path: "/stockage" },
    { icon: BookOpen, label: "Compétences", path: "/competences" },
    { icon: Anvil, label: "Atelier", path: "/atelier" },
    { icon: Album, label: "Collection", path: "/collection" },
    {
      icon: Trophy,
      label: "Trophées",
      path: "/trophees",
      disabled: !aUneTrois,
      title: aUneTrois
        ? "Trophées"
        : "Débloquez une brocante 3⭐ pour ouvrir la salle",
    },
    { icon: History, label: "Historique", path: "/historique" },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="nav-dock"
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        padding: 8,
        background: "var(--paper-100)",
        backgroundImage: "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        boxShadow:
          "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 8px 24px rgba(40,25,5,0.25)",
        zIndex: 50,
      }}
    >
      {items.map((it) => (
        <DockButton
          key={it.path}
          item={it}
          active={pathname === it.path || pathname.startsWith(`${it.path}/`)}
          onClick={() => !it.disabled && router.push(it.path)}
        />
      ))}
    </nav>
  );
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: DockItem;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const Icon = item.icon;

  const shadowLightRest =
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-500), 0 1px 0 var(--paper-400), 0 3px 8px rgba(40,25,5,0.08)";
  const shadowLightHover =
    "inset 0 0 0 3px var(--paper-100), inset 0 0 0 4px var(--brass-700), 0 2px 0 var(--brass-700), 0 8px 16px rgba(40,25,5,0.2)";
  const shadowDarkRest =
    "0 4px 14px rgba(15,30,22,0.35), inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-700)";
  const shadowDarkHover =
    "0 8px 22px rgba(15,30,22,0.5), 0 0 0 1px var(--brass-500), inset 0 0 0 3px var(--forest-800), inset 0 0 0 4px var(--brass-500)";

  const boxShadow = active
    ? hover ? shadowDarkHover : shadowDarkRest
    : hover ? shadowLightHover : shadowLightRest;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={item.disabled}
      aria-label={item.label}
      title={item.title ?? item.label}
      style={{
        width: 44,
        height: 44,
        display: "grid",
        placeItems: "center",
        background: active ? "var(--forest-800)" : "var(--paper-100)",
        backgroundImage: active
          ? "url(/assets/grain-overlay.svg)"
          : "url(/assets/paper-grain.svg)",
        backgroundSize: "320px 320px",
        border: "1px solid var(--brass-500)",
        boxShadow,
        cursor: item.disabled ? "not-allowed" : "pointer",
        opacity: item.disabled ? 0.4 : 1,
        transform: hover && !item.disabled ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 160ms ease, box-shadow 160ms ease",
        padding: 0,
      }}
    >
      <Icon
        size={20}
        strokeWidth={1.5}
        color={active ? "var(--brass-300)" : "var(--forest-800)"}
      />
    </button>
  );
}
