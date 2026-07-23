import SwiftRs
import Tauri
import UIKit
import WebKit

// Le SDK GoogleMobileAds ne peut PAS être importé ici : ce paquet est compilé
// par `swift build` (swift-rs), qui n'expose pas les modules des xcframeworks
// binaires SPM (tauri#13332). Tout le code touchant le SDK vit dans le target
// de l'app (gen/apple/Sources/app/AdmobBridge.swift, compilé par Xcode) et
// est joint au runtime via NSClassFromString.
class AdmobPlugin: Plugin {
  private func pont() -> NSObject? {
    guard let cls = NSClassFromString("BrocAdmobBridge") as? NSObject.Type else { return nil }
    return cls.value(forKey: "shared") as? NSObject
  }

  @objc public func initialize(_ invoke: Invoke) throws {
    guard let pont = pont() else {
      // Pont absent (ne devrait pas arriver dans l'app packagée) ; reject →
      // toast erreurPub côté jeu, symptôme diagnosticable.
      invoke.reject("Pont AdMob absent")
      return
    }
    let fin: @convention(block) () -> Void = { invoke.resolve() }
    _ = pont.perform(NSSelectorFromString("initialiser:"), with: fin)
  }

  @objc public func showRewardedAd(_ invoke: Invoke) throws {
    guard let pont = pont() else {
      // Pont absent (ne devrait pas arriver dans l'app packagée) ; reject →
      // toast erreurPub côté jeu, symptôme diagnosticable.
      invoke.reject("Pont AdMob absent")
      return
    }
    let fin: @convention(block) (Bool, String?) -> Void = { rewarded, erreur in
      if let erreur {
        invoke.reject(erreur)
      } else {
        invoke.resolve(["rewarded": rewarded])
      }
    }
    _ = pont.perform(NSSelectorFromString("montrerRewarded:"), with: fin)
  }
}

@_cdecl("init_plugin_admob")
func initPluginAdmob() -> Plugin {
  return AdmobPlugin()
}
