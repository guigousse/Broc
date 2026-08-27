import type { Metadata, Viewport } from "next";
import { GameProvider } from "@/context/GameContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { LangueProvider } from "@/lib/i18n/LangueContext";
import { TabBar } from "@/components/mobile/TabBar";
import { LevelUpOverlay } from "@/components/mobile/LevelUpOverlay";
import { TutorielBanniere } from "@/components/mobile/tutoriel/TutorielBanniere";
import { BandeauSauvegarde } from "@/components/mobile/BandeauSauvegarde";
import { AvertissementEspace } from "@/components/mobile/AvertissementEspace";
import { SwipePager } from "@/components/mobile/SwipePager";
import { GlobalVinylAmbiance } from "@/components/mobile/GlobalVinylAmbiance";
import { AdMobBootstrap } from "@/components/mobile/AdMobBootstrap";
import { IapBootstrap } from "@/components/mobile/IapBootstrap";
import { FirebaseBootstrap } from "@/components/mobile/FirebaseBootstrap";
import { NotifSonBootstrap } from "@/components/mobile/NotifSonBootstrap";
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
        {/* Voile noir pré-hydratation de la transition iris : si on arrive d'un
            « Continuer »/« Lancer » (flag sessionStorage posé juste avant le
            window.location.href), couvre l'écran dès le parsing HTML — bien avant
            React — pour que le rechargement dur se déroule entièrement sous le
            noir. Accroché à html et surtout PAS à body : React hydrate les
            enfants de body, et un nœud inattendu y fait échouer toute
            l'hydratation (webview Tauri iOS : sessionStorage persiste entre
            lancements → flag résiduel → voile présent au boot → UI morte).
            Retiré par IrisArrivee sitôt son overlay monté ; auto-retrait à
            6 s en filet de sécurité (page d'erreur, layout (qg) jamais monté),
            qui purge AUSSI le flag : une hydratation anormalement lente (> 6 s)
            se termine sans iris (dégradation propre), et le voile ne sera plus
            jamais rejoué au chargement suivant.
            Clé du flag dupliquée en dur depuis src/lib/transitionIris.ts ;
            couleur = --forest-900 en dur (CSS pas forcément chargées ici). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(sessionStorage.getItem("broc.transition-iris")!=="1")return;var d=document.createElement("div");d.id="broc-iris-preboot";d.style.cssText="position:fixed;inset:0;z-index:9999;background:#0f1f18";document.documentElement.appendChild(d);setTimeout(function(){try{sessionStorage.removeItem("broc.transition-iris");}catch(err){}var v=document.getElementById("broc-iris-preboot");if(v)v.remove();},6000);}catch(e){}})();',
          }}
        />
        <LangueProvider>
          <SettingsProvider>
            <ToastProvider>
              <GameProvider>
                <SwipePager>{children}</SwipePager>
                <TabBar />
                <LevelUpOverlay />
                <TutorielBanniere />
                <BandeauSauvegarde />
                <AvertissementEspace />
                <GlobalVinylAmbiance />
                <AdMobBootstrap />
                <IapBootstrap />
                <FirebaseBootstrap />
                <NotifSonBootstrap />
              </GameProvider>
            </ToastProvider>
          </SettingsProvider>
        </LangueProvider>
      </body>
    </html>
  );
}
