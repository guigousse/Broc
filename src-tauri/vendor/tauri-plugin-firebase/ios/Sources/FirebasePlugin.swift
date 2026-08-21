import SwiftRs
import Tauri
import UIKit

// Le SDK Firebase ne peut PAS être importé ici : ce paquet est compilé par
// `swift build` (swift-rs), qui n'expose pas les modules des xcframeworks
// binaires SPM (tauri#13332) — même contrainte que AdmobPlugin.swift. Tout le
// code touchant le SDK vit dans le target de l'app
// (gen/apple/Sources/app/FirebaseBridge.swift, compilé par Xcode) et est
// joint au runtime via NSClassFromString.
class FirebasePlugin: Plugin {
  private func pont() -> NSObject? {
    guard let cls = NSClassFromString("BrocFirebaseBridge") as? NSObject.Type else { return nil }
    return cls.value(forKey: "shared") as? NSObject
  }

  @objc public func initialize(_ invoke: Invoke) throws {
    // Pont absent : on résout quand même. Une mesure absente ne doit jamais
    // remonter d'erreur au jeu.
    guard let pont = pont() else {
      invoke.resolve()
      return
    }
    _ = pont.perform(NSSelectorFromString("demarrer"))
    invoke.resolve()
  }

  // `JSValue` (Tauri/JSTypes.swift) est un protocole marqueur, pas une
  // énumération, et il n'est pas Decodable : on ne peut donc pas décoder
  // `params` via un struct `Decodable` typé `[String: JSValue]` comme pour
  // `nom`/`valeur`. On passe par `invoke.getArgs()`, la même voie que Tauri
  // utilise en interne (JSTypes.coerceDictionaryToJSObject) pour produire un
  // `JSObject` ( = `[String: JSValue]`) à partir du JSON brut.
  @objc public func logEvent(_ invoke: Invoke) throws {
    guard let pont = pont(), let args = try? invoke.getArgs(), let nom = args.getString("nom")
    else {
      invoke.resolve()
      return
    }
    let params = FirebasePlugin.aplatir(args.getObject("params") ?? [:])
    _ = pont.perform(
      NSSelectorFromString("loguer:params:"), with: nom, with: params)
    invoke.resolve()
  }

  @objc public func setUserProperty(_ invoke: Invoke) throws {
    guard let pont = pont(), let args = try? invoke.getArgs(), let nom = args.getString("nom")
    else {
      invoke.resolve()
      return
    }
    _ = pont.perform(
      NSSelectorFromString("definirPropriete:valeur:"), with: nom, with: args.getString("valeur"))
    invoke.resolve()
  }

  /// Firebase n'accepte que String et NSNumber en valeur de paramètre : tout
  /// le reste est jeté plutôt que stringifié (un objet stringifié pollue les
  /// rapports sans rien apprendre). `JSValue` n'a pas de cas d'énumération à
  /// filtrer (voir la note ci-dessus) : on teste le type concret réellement
  /// porté par la valeur, dans le même ordre que `coerceToJSValue` — NSNumber
  /// avant Bool/Int/Float/Double, car c'est ce que produit systématiquement
  /// `JSONSerialization` pour un nombre ou un booléen JSON.
  private static func aplatir(_ brut: JSObject) -> [String: Any] {
    var sortie: [String: Any] = [:]
    for (cle, valeur) in brut {
      switch valeur {
      case let s as String: sortie[cle] = s
      case let n as NSNumber: sortie[cle] = n
      case let b as Bool: sortie[cle] = NSNumber(value: b)
      case let i as Int: sortie[cle] = NSNumber(value: i)
      case let f as Float: sortie[cle] = NSNumber(value: f)
      case let d as Double: sortie[cle] = NSNumber(value: d)
      default: continue
      }
    }
    return sortie
  }
}

@_cdecl("init_plugin_firebase")
func initPluginFirebase() -> Plugin {
  return FirebasePlugin()
}
