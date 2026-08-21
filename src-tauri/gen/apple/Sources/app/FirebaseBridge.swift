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
      // Le plist est committé et câblé dans les Resources du projet, mais
      // project.pbxproj est généré : un xcodegen relancé sur un arbre où il
      // manquerait le laisserait tomber silencieusement de la phase Resources.
      // `FirebaseApp.configure()` lève dans ce cas — une panne de mesure ne
      // doit jamais casser une partie, donc on abandonne avant plutôt que de
      // risquer un crash au lancement.
      guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
        return
      }
      if FirebaseApp.app() == nil {
        FirebaseApp.configure()
      }
      // Le verdict est réappliqué à CHAQUE lancement, pas seulement au
      // premier : `setAnalyticsCollectionEnabled` persiste entre les sessions
      // et surcharge l'Info.plist. Sans ce rejeu, une révocation ultérieure du
      // consentement ne couperait jamais la collecte.
      ConsentementBroc.shared.auVerdict { verdict in
        self.appliquerConsentement(verdict)
      }
    }
  }

  private func appliquerConsentement(_ verdict: VerdictConsentement) {
    // L'ordre compte surtout en révocation : la collecte est encore active
    // depuis le lancement précédent, donc écrire "false" avant de couper
    // garantit que la propriété est bien enregistrée pendant qu'elle a encore
    // un effet. En sens inverse (octroi), la collecte est encore éteinte au
    // moment de l'écriture et le SDK pourrait la laisser tomber — sans doute
    // sans conséquence, la personnalisation étant déjà le défaut en l'absence
    // de propriété, mais ce rejet vit dans le binaire GoogleAppMeasurement et
    // n'a pas pu être vérifié depuis les sources.
    // Deux droits distincts, deux champs distincts. Les confondre revenait à
    // déclarer à Google qu'un joueur acceptait la personnalisation alors qu'il
    // venait de la refuser (constaté en recette : `_npa = 0` après un refus
    // total).
    Analytics.setUserProperty(
      verdict.personnalisationPub ? "true" : "false",
      forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)
    Analytics.setAnalyticsCollectionEnabled(verdict.mesure)
  }

  @objc public func loguer(_ nom: String, params: [String: Any]) {
    // Même file d'attente que `demarrer()` : sans ce saut, un événement loggé
    // tôt pourrait atteindre le SDK avant que `configure()` ait fini sur le
    // main thread. L'API est thread-safe, donc pas de donnée corrompue — au
    // pire un premier événement perdu — mais autant fermer la fenêtre.
    DispatchQueue.main.async {
      Analytics.logEvent(nom, parameters: params)
    }
  }

  @objc public func definirPropriete(_ nom: String, valeur: String?) {
    DispatchQueue.main.async {
      Analytics.setUserProperty(valeur, forName: nom)
    }
  }
}
