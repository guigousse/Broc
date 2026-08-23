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

  // Tâche 10 : l'export de sauvegarde. `chemin` est le chemin ABSOLU du
  // fichier source calculé côté Rust (app_data_dir + nom du `Quoi`,
  // commands.rs) ; `nomLisible` le nom sous lequel le présenter au joueur
  // (ex. "broc-partie-jour-34.json").
  private struct ArgsPartager: Decodable {
    let chemin: String
    let nomLisible: String
  }

  @objc public func partagerFichier(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ArgsPartager.self)

    // Garde générale, pas seulement pour le sondage : un nom vide ne peut
    // produire aucune copie exploitable. C'est ce rejet précoce — AVANT
    // toute copie de fichier ou présentation d'UI — dont PartiesModal.tsx se
    // sert pour sonder la disponibilité du partage au montage sans jamais
    // déclencher un partage réel.
    guard !args.nomLisible.isEmpty else {
      invoke.reject("Nom de fichier vide")
      return
    }

    let source = URL(fileURLWithPath: args.chemin)
    let destination = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent(args.nomLisible)

    do {
      // La feuille de partage reçoit toujours une COPIE, jamais `source` :
      // le fichier réel du slot n'est ni déplacé, ni renommé, ni supprimé
      // par ce code — c'est tout le sens de ce chantier. Un fichier du même
      // nom laissé par un partage précédent est écrasé.
      if FileManager.default.fileExists(atPath: destination.path) {
        try FileManager.default.removeItem(at: destination)
      }
      try FileManager.default.copyItem(at: source, to: destination)
    } catch {
      invoke.reject("Copie du fichier à partager impossible : \(error)")
      return
    }

    guard let racine = manager.viewController else {
      invoke.reject("Aucun contrôleur racine pour présenter le partage")
      return
    }

    // La présentation UIKit doit courir sur le thread principal : ce
    // handler tourne sur la file `ipcDispatchQueue` de PluginManager.
    DispatchQueue.main.async {
      let feuille = UIActivityViewController(
        activityItems: [destination], applicationActivities: nil)
      // iPad : sans `popoverPresentationController`, la présentation plante
      // (project.yml déclare les orientations iPad, donc iPad est une
      // cible réelle). `UIUtils.centerPopover` (Tauri, UiUtils.swift) pose
      // sourceView/sourceRect/permittedArrowDirections en un seul appel —
      // sans effet sur iPhone, où la feuille n'est pas un popover.
      UIUtils.centerPopover(rootViewController: racine, popoverController: feuille)
      // Ménage : la copie n'a de raison d'exister que le temps de la feuille
      // de partage. Sans ce handler elle survivrait indéfiniment dans
      // NSTemporaryDirectory() — un fichier de plus à chaque export, sur
      // l'appareil même que ce chantier essaie de désengorger. Le retrait
      // est inconditionnel : partage terminé, annulé ou en échec, la copie
      // n'a plus de raison d'être. Le `removeItem` avant la copie plus haut
      // reste la garde ceinture-et-bretelles du cas même nom.
      feuille.completionWithItemsHandler = { _, _, _, _ in
        try? FileManager.default.removeItem(at: destination)
      }
      racine.present(feuille, animated: true)
      invoke.resolve()
    }
  }
}

@_cdecl("init_plugin_stockage")
func initPluginStockage() -> Plugin {
  return StockagePlugin()
}
