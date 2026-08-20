import FirebaseAnalytics
import FirebaseCore
import Foundation

// Pont Firebase côté app : SEUL endroit autorisé à importer le SDK Firebase
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. FirebasePlugin.swift). Joint au runtime
// par le plugin via NSClassFromString("BrocFirebaseBridge").
//
// La collecte démarre ÉTEINTE (FIREBASE_ANALYTICS_COLLECTION_ENABLED = false
// dans l'Info.plist) et n'est allumée qu'au verdict UMP.
@objc(BrocFirebaseBridge) public class BrocFirebaseBridge: NSObject {
  @objc public static let shared = BrocFirebaseBridge()

  private var demarre = false

  /// Idempotent. `FirebaseApp.configure()` n'ouvre aucune connexion réseau
  /// tant que la collecte est désactivée : il est sûr de l'appeler avant que
  /// le consentement soit connu.
  @objc public func demarrer() {
    DispatchQueue.main.async {
      guard !self.demarre else { return }
      self.demarre = true
      if FirebaseApp.app() == nil {
        FirebaseApp.configure()
      }
      // Le verdict est réappliqué à CHAQUE lancement, pas seulement au
      // premier : `setAnalyticsCollectionEnabled` persiste entre les sessions
      // et surcharge l'Info.plist. Sans ce rejeu, une révocation ultérieure du
      // consentement ne couperait jamais la collecte.
      ConsentementBroc.shared.auVerdict { consenti in
        self.appliquerConsentement(consenti)
      }
    }
  }

  @objc public func appliquerConsentement(_ consenti: Bool) {
    // L'ordre compte : la personnalisation publicitaire doit être posée AVANT
    // l'activation de la collecte.
    Analytics.setUserProperty(
      consenti ? "true" : "false",
      forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)
    Analytics.setAnalyticsCollectionEnabled(consenti)
  }

  @objc public func loguer(_ nom: String, params: [String: Any]) {
    Analytics.logEvent(nom, parameters: params)
  }

  @objc public func definirPropriete(_ nom: String, valeur: String?) {
    Analytics.setUserProperty(valeur, forName: nom)
  }
}
