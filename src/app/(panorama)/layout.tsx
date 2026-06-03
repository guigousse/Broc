"use client";

import { usePathname } from "next/navigation";
import { AtelierPanoramaView } from "@/components/mobile/atelier-pano/AtelierPanoramaView";

/**
 * Layout partagé des routes `/atelier` et `/stockage`.
 *
 * Le panorama est rendu ICI plutôt que dans chaque page : grâce au route group
 * `(panorama)`, ce composant n'est PAS démonté lorsqu'on passe d'une sous-page
 * sœur à l'autre (router.replace entre `/atelier` et `/stockage`). Du coup le
 * scroll horizontal en cours n'est jamais coupé : pas de saccade, pas de
 * disparition d'image.
 */
export default function PanoramaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab: "stockage" | "atelier" = pathname.startsWith("/stockage")
    ? "stockage"
    : "atelier";
  return (
    <>
      <AtelierPanoramaView activeTab={activeTab} />
      {children}
    </>
  );
}
