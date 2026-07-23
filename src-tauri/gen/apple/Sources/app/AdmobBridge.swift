import Foundation
import GoogleMobileAds
import UserMessagingPlatform

// Pont AdMob côté app : SEUL endroit autorisé à importer le SDK Google
// (compilé par Xcode, qui résout le xcframework SPM — le paquet swift-rs du
// plugin vendoré ne le peut pas, cf. AdmobPlugin.swift). Joint au runtime par
// le plugin via NSClassFromString("BrocAdmobBridge").
@objc(BrocAdmobBridge) public class BrocAdmobBridge: NSObject {
  @objc public static let shared = BrocAdmobBridge()

  // Squelette du spike CI : la référence à MobileAds prouve le link du SDK.
  // Logique réelle (UMP + ATT + rewarded) dans une tâche ultérieure.
  @objc public func initialiser(_ fin: @escaping () -> Void) {
    _ = MobileAds.shared
    fin()
  }

  @objc public func montrerRewarded(_ fin: @escaping (Bool, String?) -> Void) {
    fin(false, nil)
  }
}
