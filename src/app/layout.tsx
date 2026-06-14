import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/context/GameContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { TabBar } from "@/components/mobile/TabBar";
import { SwipePager } from "@/components/mobile/SwipePager";
import { GlobalVinylAmbiance } from "@/components/mobile/GlobalVinylAmbiance";
import { ToastProvider } from "@/components/ui/Toast";
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
  openGraph: {
    title: "Broc — Une simulation de brocante",
    description:
      "Chinez, restaurez, négociez. Faites parler les objets de leur siècle.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Broc — Une simulation de brocante",
    description:
      "Chinez, restaurez, négociez. Faites parler les objets de leur siècle.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A3326",
  width: "device-width",
  initialScale: 1,
  // Zoom utilisateur autorisé (accessibilité WCAG 1.4.4).
  maximumScale: 5,
  userScalable: true,
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
            <ToastProvider>
              <SwipePager>{children}</SwipePager>
              <TabBar />
              <GlobalVinylAmbiance />
            </ToastProvider>
          </GameProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
