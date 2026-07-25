#include "bindings/bindings.h"

#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

// ⚠ Fichier généré par `tauri ios init` mais ÉDITÉ À LA MAIN (comme
// AdmobBridge.swift) : ne pas le régénérer sans reporter ce correctif.
//
// Correctif viewport appliqué DÈS LE LANCEMENT DU PROCESSUS.
//
// Racine du bug : wry crée le WKWebView sans toucher à
// `contentInsetAdjustmentBehavior`, qui reste donc à `.automatic` (vérifié
// dans wry 0.55.1, wkwebview/mod.rs — il n'y règle que `bounces`, et n'expose
// aucune option). Le layout viewport est alors amputé des safe areas
// (100dvh = 818 pt au lieu de 896 sur iPhone 12) : le contenu ne touche pas
// les bords et la zone laissée libre montre le fond clair du webview.
//
// La correction existait déjà (`BrocAdmobBridge.viewportPleinEcran`), mais
// elle n'était déclenchée que par `initialiser()`, appelée depuis le
// `useEffect` de <AdMobBootstrap/> — donc après le chargement de la page,
// l'hydratation React et le PREMIER PAINT. D'où le symptôme signalé sur
// device le 2026-07-25 : à l'ouverture, le menu principal s'affiche décalé
// vers le haut avec une bande claire en bas pendant une fraction de seconde,
// puis saute en plein écran quand la correction arrive enfin.
//
// On pose donc `.never` avant que la page n'ait pu peindre quoi que ce soit.
// Le webview n'existe pas encore ici (wry le crée pendant le setup Tauri, à
// l'intérieur de `start_app`) : on arme un tick sur la runloop principale qui
// l'attrape dès son apparition. Le tick s'arrête tout seul au bout de
// FENETRE_S. Idempotent — `BrocAdmobBridge` reste le filet de sécurité tardif.

/// Cadence du guet : assez fine pour poser `.never` dans la foulée de la
/// création du webview, très loin devant son premier rendu (chargement du
/// bundle + hydratation React).
static const NSTimeInterval BROC_PERIODE_S = 1.0 / 60.0;

/// Durée du guet, large de côté : au-delà, la webview est forcément née.
static const NSTimeInterval BROC_FENETRE_S = 5.0;

/// `--forest-800`, la couleur du header et de la barre d'onglets (= themeColor).
static UIColor *broc_fond_chrome(void) {
  return [UIColor colorWithRed:0x1a / 255.0
                         green:0x33 / 255.0
                          blue:0x26 / 255.0
                         alpha:1.0];
}

static void broc_collecter_webviews(UIView *vue,
                                    NSMutableArray<WKWebView *> *sortie) {
  if ([vue isKindOfClass:[WKWebView class]]) {
    [sortie addObject:(WKWebView *)vue];
  }
  for (UIView *sous in vue.subviews) {
    broc_collecter_webviews(sous, sortie);
  }
}

/// Vue racine de la fenêtre clé. Volontairement tolérante sur l'état de la
/// scène : au tout début du lancement, aucune n'est encore `foregroundActive`.
static UIView *broc_vue_racine(void) {
  UIView *repli = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) continue;
    for (UIWindow *fenetre in ((UIWindowScene *)scene).windows) {
      if (fenetre.isKeyWindow) return fenetre.rootViewController.view;
      if (repli == nil) repli = fenetre.rootViewController.view;
    }
  }
  return repli;
}

static void broc_appliquer_viewport_plein_ecran(void) {
  UIView *racine = broc_vue_racine();
  if (racine == nil) return;
  NSMutableArray<WKWebView *> *webviews = [NSMutableArray array];
  broc_collecter_webviews(racine, webviews);
  UIColor *fond = broc_fond_chrome();
  for (WKWebView *wv in webviews) {
    wv.scrollView.contentInsetAdjustmentBehavior =
        UIScrollViewContentInsetAdjustmentNever;
    // Défense en profondeur : toute zone que la page ne peint pas (safe area,
    // inset transitoire) prend le vert du chrome au lieu du blanc par défaut
    // du webview — le fond racine CSS est du papier clair (--bg).
    wv.backgroundColor = fond;
    wv.scrollView.backgroundColor = fond;
  }
}

/// Arme le guet. Appelé AVANT `start_app` : le bloc est simplement mis en file
/// sur la queue principale, il s'exécutera au démarrage de la runloop (à
/// l'intérieur de UIApplicationMain).
static void broc_installer_correctif_viewport(void) {
  dispatch_async(dispatch_get_main_queue(), ^{
    __block NSTimeInterval ecoule = 0;
    [NSTimer scheduledTimerWithTimeInterval:BROC_PERIODE_S
                                    repeats:YES
                                      block:^(NSTimer *minuteur) {
                                        broc_appliquer_viewport_plein_ecran();
                                        ecoule += BROC_PERIODE_S;
                                        if (ecoule >= BROC_FENETRE_S) {
                                          [minuteur invalidate];
                                        }
                                      }];
  });
}

int main(int argc, char * argv[]) {
	broc_installer_correctif_viewport();
	ffi::start_app();
	return 0;
}
