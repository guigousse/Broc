import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/context/GameContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { TabBar } from "@/components/mobile/TabBar";
import { SwipePager } from "@/components/mobile/SwipePager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broc — Une simulation de brocante",
  description:
    "Chinez, restaurez, négociez. Faites parler les objets de leur siècle.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Broc",
  },
  applicationName: "Broc",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A3326",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ minHeight: "100dvh", overflowX: "hidden" }}>
        <SettingsProvider>
          <GameProvider>
            <SwipePager>{children}</SwipePager>
            <TabBar />
          </GameProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
