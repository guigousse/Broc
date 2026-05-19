import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/context/GameContext";
import { NavigationDock } from "@/components/NavigationDock";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broc — Une simulation de brocante",
  description:
    "Chinez, restaurez, négociez. Faites parler les objets de leur siècle.",
};

export const viewport: Viewport = {
  themeColor: "#1A3326",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ minHeight: "100dvh", paddingBottom: 80 }}>
        <GameProvider>
          {children}
          <NavigationDock />
        </GameProvider>
      </body>
    </html>
  );
}
