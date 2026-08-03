import SwiftRs
import Tauri
import UIKit
import WebKit
import StoreKit

// StoreKit est un framework SYSTÈME : importable ici, sous `swift build`
// (contrairement au SDK Google, cf. AdmobPlugin.swift — pas besoin du détour
// NSClassFromString/gen-apple pour ce plugin-ci).
// Produit non-consommable « Énergie infinie » (App Store Connect).
private let PRODUCT_ID = "com.guigousse.broc.energie_infinie"

class IapPlugin: Plugin {
  // Écouteur de fond : transactions abouties hors du flux d'achat (Ask to Buy
  // approuvé plus tard, achat interrompu, restauration système). On se
  // contente de finish() — l'état est relu par verifierEntitlement au prochain
  // boot / à l'ouverture de la machine à énergie.
  private var ecouteur: Any?

  public override func load(webview: WKWebView) {
    if #available(iOS 15.0, *) {
      ecouteur = Task.detached {
        for await maj in Transaction.updates {
          if case .verified(let transaction) = maj {
            await transaction.finish()
          }
        }
      }
    }
  }

  @available(iOS 15.0, *)
  private func entitlementActuel() async -> Bool {
    for await res in Transaction.currentEntitlements {
      if case .verified(let t) = res, t.productID == PRODUCT_ID, t.revocationDate == nil {
        return true
      }
    }
    return false
  }

  @objc public func verifierEntitlement(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.resolve(["energieInfinie": false])
      return
    }
    Task {
      invoke.resolve(["energieInfinie": await self.entitlementActuel()])
    }
  }

  @objc public func obtenirPrix(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.reject("iOS 15 requis")
      return
    }
    Task {
      do {
        guard let produit = try await Product.products(for: [PRODUCT_ID]).first else {
          invoke.reject("Produit introuvable")
          return
        }
        invoke.resolve(["prix": produit.displayPrice])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func acheter(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.reject("iOS 15 requis")
      return
    }
    Task { @MainActor in
      do {
        guard let produit = try await Product.products(for: [PRODUCT_ID]).first else {
          invoke.reject("Produit introuvable")
          return
        }
        switch try await produit.purchase() {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            await transaction.finish()
            invoke.resolve(["statut": "achete"])
          case .unverified:
            invoke.reject("Transaction non vérifiée")
          }
        case .userCancelled:
          invoke.resolve(["statut": "annule"])
        case .pending:
          invoke.resolve(["statut": "pending"])
        @unknown default:
          invoke.reject("Résultat d'achat inconnu")
        }
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func restaurer(_ invoke: Invoke) throws {
    guard #available(iOS 15.0, *) else {
      invoke.resolve(["energieInfinie": false])
      return
    }
    Task {
      do {
        try await AppStore.sync()
      } catch {
        // Sync annulée/échouée (mot de passe refusé, hors-ligne) : on relit
        // quand même les entitlements locaux plutôt que d'échouer sec.
      }
      invoke.resolve(["energieInfinie": await self.entitlementActuel()])
    }
  }
}

@_cdecl("init_plugin_iap")
func initPluginIap() -> Plugin {
  return IapPlugin()
}
