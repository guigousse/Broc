import Foundation

/// Publication du verdict de consentement UMP, pour que plusieurs
/// consommateurs (Firebase aujourd'hui, d'autres demain) s'y branchent sans
/// que le parcours lui-même — délicat, recetté sur appareil — ait à les
/// connaître. AdmobBridge appelle `resoudre` en fin de `parcoursConsentement`.
///
/// Tout se passe sur le main thread : les callbacks du SDK UMP y arrivent, et
/// les abonnés sont rappelés là aussi. Pas de synchronisation additionnelle.
@objc(BrocConsentement) public class ConsentementBroc: NSObject {
  @objc public static let shared = ConsentementBroc()

  private var verdict: Bool?
  private var abonnes: [(Bool) -> Void] = []

  /// Appelé une fois par lancement, à la fin du parcours UMP/ATT.
  @objc public func resoudre(canRequestAds: Bool) {
    DispatchQueue.main.async {
      self.verdict = canRequestAds
      let aPrevenir = self.abonnes
      // Abonnement à usage unique : un second `resoudre` dans la même session
      // ne reprévient personne — à revoir le jour où un point d'entrée
      // « gérer mon consentement » rendra ce cas possible.
      self.abonnes.removeAll()
      for cb in aPrevenir { cb(canRequestAds) }
    }
  }

  /// Rappelle immédiatement si le verdict est déjà tombé, sinon met en file.
  /// Le verdict n'arrivant jamais (UMP hors-ligne) laisse l'abonné en attente
  /// sans rien publier : l'état persisté de `setAnalyticsCollectionEnabled`
  /// reste tel quel — le défaut de l'Info.plist (éteint) au tout premier
  /// lancement, ou sinon le dernier verdict connu, qui reste en vigueur.
  @objc public func auVerdict(_ cb: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      if let verdict = self.verdict {
        cb(verdict)
      } else {
        self.abonnes.append(cb)
      }
    }
  }
}
