import Foundation
import UIKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

// Pont AdMob côté app : SEUL endroit autorisé à importer le SDK Google
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. AdmobPlugin.swift). Joint au runtime par
// le plugin via NSClassFromString("BrocAdmobBridge").
// API SDK v12 (noms Swift : MobileAds/RewardedAd/Request,
// ConsentInformation/ConsentForm — PAS les anciens GAD*/UMP*).
// Bloc de TEST officiel Google jusqu'à la bascule de lancement (Task 11) ;
// le GADApplicationIdentifier du plist est, lui, déjà le vrai (exigence Google).
private let AD_UNIT_ID = "ca-app-pub-3940256099942544/1712485313"

@objc(BrocAdmobBridge) public class BrocAdmobBridge: NSObject {
  @objc public static let shared = BrocAdmobBridge()

  private var rewardedAd: RewardedAd?
  private var finEnAttente: ((Bool, String?) -> Void)?
  private var recompenseGagnee = false
  private var sdkPret = false

  // MARK: - Entrées du pont (sélecteurs appelés par le plugin vendoré)

  @objc public func initialiser(_ fin: @escaping () -> Void) {
    DispatchQueue.main.async {
      self.parcoursConsentement {
        MobileAds.shared.start()
        self.sdkPret = true
        self.prechargerPub()
        fin()
      }
    }
  }

  @objc public func montrerRewarded(_ fin: @escaping (Bool, String?) -> Void) {
    DispatchQueue.main.async {
      guard self.sdkPret else {
        fin(false, "SDK non initialisé")
        return
      }
      if let pub = self.rewardedAd {
        self.presenter(pub: pub, fin: fin)
      } else {
        // Pas de pub préchargée (hors-ligne au boot, no-fill…) : tentative à
        // la demande — le SDK gère son propre timeout réseau.
        RewardedAd.load(with: AD_UNIT_ID, request: Request()) { pub, erreur in
          guard let pub else {
            fin(false, erreur?.localizedDescription ?? "Aucune pub disponible")
            return
          }
          self.presenter(pub: pub, fin: fin)
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

  private func presenter(pub: RewardedAd, fin: @escaping (Bool, String?) -> Void) {
    guard let racine = rootViewController() else {
      fin(false, "Pas de view controller racine")
      return
    }
    finEnAttente = fin
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
