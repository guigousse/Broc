import SwiftRs
import Tauri
import UIKit
import WebKit

// Tâche 9 : l'avertissement d'espace disque. Ce plugin ne fait QUE mesurer —
// le seuil (50 Mo, `SEUIL_ESPACE_LIBRE_OCTETS`) et la décision d'avertir
// vivent côté TS (AvertissementEspace.tsx), pas ici.
//
// `volumeAvailableCapacityForImportantUsageKey` et PAS `statvfs`/
// `NSFileSystemFreeSize` : ces derniers ignorent la place purgeable qu'iOS
// rendra au besoin (caches système, snapshots de sauvegarde), sous-estiment
// donc l'espace réellement disponible, et déclencheraient l'avertissement à
// tort sur un téléphone en bonne santé — exactement le bruit qu'on cherche à
// éviter (une fausse alerte discrédite aussi le bandeau de la Tâche 8).
// Apple documente cette clé de ressource comme la mesure correcte pour un
// usage « important » (par opposition à opportuniste) de l'espace disque.
class StockagePlugin: Plugin {
  private func mesurer() -> UInt64? {
    let url = URL(fileURLWithPath: NSHomeDirectory())
    guard let v = try? url.resourceValues(
      forKeys: [.volumeAvailableCapacityForImportantUsageKey]
    ), let o = v.volumeAvailableCapacityForImportantUsage else { return nil }
    return o < 0 ? nil : UInt64(o)
  }

  @objc public func espaceLibre(_ invoke: Invoke) throws {
    if let o = mesurer() {
      invoke.resolve(["octets": o])
    } else {
      // `nil` traversé tel quel plutôt qu'une erreur : côté Rust (mobile.rs)
      // comme côté TS, l'absence de mesure n'est pas un échec de la commande.
      invoke.resolve(["octets": NSNull()])
    }
  }
}

@_cdecl("init_plugin_stockage")
func initPluginStockage() -> Plugin {
  return StockagePlugin()
}
