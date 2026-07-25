import Foundation
import UIKit
import WebKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

// Pont AdMob côté app : SEUL endroit autorisé à importer le SDK Google
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. AdmobPlugin.swift). Joint au runtime par
// le plugin via NSClassFromString("BrocAdmobBridge").
// API SDK v12 (noms Swift : MobileAds/RewardedAd/Request,
// ConsentInformation/ConsentForm — PAS les anciens GAD*/UMP*).
// Bloc rewarded de PRODUCTION (validation device faite le 2026-07-24 avec le
// bloc de test officiel Google "ca-app-pub-3940256099942544/1712485313" —
// à remettre pour tout débogage : cliquer ses propres vraies pubs = ban AdMob).
private let AD_UNIT_ID = "ca-app-pub-6928338731034491/5859004325"

@objc(BrocAdmobBridge) public class BrocAdmobBridge: NSObject {
  @objc public static let shared = BrocAdmobBridge()

  // Invariant : les callbacks du SDK GMA (load/present/delegate) arrivent
  // tous sur le main thread — l'état ci-dessous (finEnAttente, rewardedAd)
  // n'est donc touché que depuis ce thread, sans synchronisation additionnelle.
  private var rewardedAd: RewardedAd?
  private var finEnAttente: ((Bool, String?) -> Void)?
  private var recompenseGagnee = false
  private var sdkPret = false

  // MARK: - Entrées du pont (sélecteurs appelés par le plugin vendoré)

  @objc public func initialiser(_ fin: @escaping () -> Void) {
    DispatchQueue.main.async {
      self.viewportPleinEcran()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
        self.viewportPleinEcran()
      }
      self.parcoursConsentement {
        MobileAds.shared.start()
        self.sdkPret = true
        self.prechargerPub()
        fin()
      }
    }
  }

  // Rend le viewport web plein écran (896 pt) au lieu de 818 : par défaut le
  // WKWebView Tauri (contentInsetAdjustmentBehavior=.automatic) retranche les
  // safe areas du layout viewport → 100dvh=818, le contenu n'atteint pas les
  // bords → bande claire. On passe en .never ; la page déjà chargée ne
  // recalcule pas seule, on force le reflow (toggle de frame) PUIS on émet un
  // événement `resize` pour que TOUT le layout (y compris les éléments fixes
  // comme le panorama et les ResizeObserver) se recale. Le CSS gère les safe
  // areas via env() ; on réinjecte aussi --safe-* depuis le système au cas où
  // .never remettrait env() à 0. Idempotent.
  private func viewportPleinEcran() {
    guard let root = rootViewController()?.view else { return }
    let insets = root.safeAreaInsets
    for wv in webviews(dans: root) {
      wv.scrollView.contentInsetAdjustmentBehavior = .never
      let f = wv.frame
      wv.frame = f.insetBy(dx: 0, dy: 1)
      wv.frame = f
      let js = String(
        format:
          "(function(){var s=document.documentElement.style;"
          + "s.setProperty('--safe-top','%.0fpx');s.setProperty('--safe-bottom','%.0fpx');"
          + "window.dispatchEvent(new Event('resize'));})();",
        insets.top, insets.bottom)
      wv.evaluateJavaScript(js, completionHandler: nil)
    }
  }

  private func webviews(dans vue: UIView) -> [WKWebView] {
    var out: [WKWebView] = []
    if let wv = vue as? WKWebView { out.append(wv) }
    for sub in vue.subviews { out.append(contentsOf: webviews(dans: sub)) }
    return out
  }

  @objc public func montrerRewarded(_ fin: @escaping (Bool, String?) -> Void) {
    DispatchQueue.main.async {
      guard self.sdkPret else {
        fin(false, "SDK non initialisé")
        return
      }
      guard self.finEnAttente == nil else {
        // Une pub est déjà en cours (affichée OU en chargement) : refus
        // immédiat plutôt qu'écraser la completion en attente (elle ne
        // serait jamais rappelée).
        fin(false, "Pub déjà en cours")
        return
      }
      // Réservation SYNCHRONE : ferme la fenêtre de course pendant le
      // chargement réseau du chemin sans pub préchargée. Toute sortie
      // d'échec doit libérer la réservation.
      self.finEnAttente = fin
      if let pub = self.rewardedAd {
        self.presenter(pub: pub)
      } else {
        // Pas de pub préchargée (hors-ligne au boot, no-fill…) : tentative à
        // la demande — le SDK gère son propre timeout réseau.
        RewardedAd.load(with: AD_UNIT_ID, request: Request()) { pub, erreur in
          guard let pub else {
            self.finEnAttente = nil
            fin(false, erreur?.localizedDescription ?? "Aucune pub disponible")
            return
          }
          self.presenter(pub: pub)
        }
      }
    }
  }

  // MARK: - Consentement (UMP puis ATT)

  private func parcoursConsentement(fin: @escaping () -> Void) {
    let params = RequestParameters()
    params.isTaggedForUnderAgeOfConsent = false
    ConsentInformation.shared.requestConsentInfoUpdate(with: params) { erreur in
      guard erreur == nil else {
        // Hors-ligne : on continue sans bloquer, les pubs échoueront proprement.
        fin()
        return
      }
      ConsentForm.loadAndPresentIfRequired(from: self.rootViewController()) { _ in
        // ATT après le formulaire UMP : l'ordre évite deux popups d'affilée
        // sans contexte. Idempotent (iOS ne re-prompt jamais une fois décidé).
        if #available(iOS 14, *) {
          ATTrackingManager.requestTrackingAuthorization { _ in
            DispatchQueue.main.async { fin() }
          }
        } else {
          fin()
        }
      }
    }
  }

  // MARK: - Cycle de vie des pubs

  private func prechargerPub() {
    RewardedAd.load(with: AD_UNIT_ID, request: Request()) { [weak self] pub, _ in
      self?.rewardedAd = pub
      pub?.fullScreenContentDelegate = self
    }
  }

  // Précondition : `finEnAttente` a été réservée par `montrerRewarded`.
  private func presenter(pub: RewardedAd) {
    guard let racine = rootViewController() else {
      finEnAttente?(false, "Pas de view controller racine")
      finEnAttente = nil
      return
    }
    recompenseGagnee = false
    pub.fullScreenContentDelegate = self
    rewardedAd = nil
    pub.present(from: racine) { [weak self] in
      // Callback Google déclenché UNIQUEMENT au visionnage complet.
      self?.recompenseGagnee = true
    }
  }

  private func rootViewController() -> UIViewController? {
    let scene = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    return scene?.windows.first(where: \.isKeyWindow)?.rootViewController
  }
}

// MARK: - FullScreenContentDelegate

extension BrocAdmobBridge: FullScreenContentDelegate {
  // La réponse part à la FERMETURE (pas au gain) : le jeu ne doit reprendre
  // la main qu'une fois la pub disparue de l'écran.
  public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
    finEnAttente?(recompenseGagnee, nil)
    finEnAttente = nil
    prechargerPub()
  }

  public func ad(
    _ ad: FullScreenPresentingAd,
    didFailToPresentFullScreenContentWithError error: Error
  ) {
    finEnAttente?(false, error.localizedDescription)
    finEnAttente = nil
    prechargerPub()
  }
}
