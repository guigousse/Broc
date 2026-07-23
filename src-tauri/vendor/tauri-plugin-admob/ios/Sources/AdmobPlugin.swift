import SwiftRs
import Tauri
import UIKit
import WebKit
import GoogleMobileAds
import UserMessagingPlatform

// Squelette du spike CI : les imports GoogleMobileAds/UserMessagingPlatform
// suffisent à prouver que le SDK est résolu et linké des deux côtés
// (Package.swift du plugin + project.yml de l'app). Logique réelle en Task 6.
class AdmobPlugin: Plugin {
  @objc public func initialize(_ invoke: Invoke) throws {
    invoke.resolve()
  }

  @objc public func showRewardedAd(_ invoke: Invoke) throws {
    invoke.resolve(["rewarded": false])
  }
}

@_cdecl("init_plugin_admob")
func initPluginAdmob() -> Plugin {
  return AdmobPlugin()
}
