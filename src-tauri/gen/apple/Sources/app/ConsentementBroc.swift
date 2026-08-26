import Foundation

/// Verdict de consentement, décliné par usage. Un seul booléen ne suffit pas :
/// mesurer et personnaliser une publicité sont deux traitements distincts, que
/// le formulaire TCF autorise séparément.
public struct VerdictConsentement {
  /// Droit de mesurer l'audience (Firebase Analytics).
  public let mesure: Bool
  /// Droit de personnaliser les publicités (propriété `_npa` côté Google).
  public let personnalisationPub: Bool
  /// Droit de demander une publicité, personnalisée ou non.
  public let publicite: Bool
}

/// Publication du verdict de consentement UMP, pour que plusieurs
/// consommateurs (Firebase aujourd'hui, d'autres demain) s'y branchent sans
/// que le parcours lui-même — délicat, recetté sur appareil — ait à les
/// connaître. AdmobBridge appelle `resoudre` en fin de `parcoursConsentement`.
///
/// Tout se passe sur le main thread : les callbacks du SDK UMP y arrivent, et
/// les abonnés sont rappelés là aussi. Pas de synchronisation additionnelle.
@objc(BrocConsentement) public class ConsentementBroc: NSObject {
  @objc public static let shared = ConsentementBroc()

  private var verdict: VerdictConsentement?
  private var abonnes: [(VerdictConsentement) -> Void] = []

  // MARK: - Lecture de la chaîne TCF

  /// Le CMP (ici l'UMP de Google) publie le détail des choix de l'utilisateur
  /// dans `NSUserDefaults` sous les clés normalisées `IABTCF_*` — c'est le
  /// contrat public du Transparency & Consent Framework de l'IAB, pas une
  /// clé interne d'un SDK. `IABTCF_PurposeConsents` est une chaîne de '0'/'1',
  /// un caractère par finalité, la finalité N à l'index N-1.
  private static func finaliteAccordee(_ numero: Int) -> Bool {
    guard let chaine = UserDefaults.standard.string(forKey: "IABTCF_PurposeConsents"),
          numero >= 1, chaine.count >= numero
    else { return false }
    return Array(chaine)[numero - 1] == "1"
  }

  /// Hors périmètre RGPD (ou avant tout passage du CMP), la clé vaut 0 ou est
  /// absente : `integer(forKey:)` rend 0 dans les deux cas, ce qui est le
  /// comportement voulu — pas de gating là où il ne s'applique pas.
  private static var rgpdSApplique: Bool {
    UserDefaults.standard.integer(forKey: "IABTCF_gdprApplies") == 1
  }

  /// RECETTE 2026-08-21 : le gating reposait sur `canRequestAds`, qui reste
  /// VRAI après un refus total du formulaire — Google autorisant encore les
  /// publicités non personnalisées. Résultat : un joueur ayant tout refusé
  /// était mesuré quand même, alors que les pages de confidentialité en
  /// quatre langues affirment le contraire. `canRequestAds` répond à « puis-je
  /// servir une pub ? », pas à « ai-je le droit de mesurer ? ».
  ///
  /// Le raisonnement qui fonde le nouveau gating ne dépend d'aucune table de
  /// correspondance : Firebase Analytics écrit un identifiant d'installation
  /// sur l'appareil et le relit, ce qui EST la finalité 1 (« stocker et/ou
  /// accéder à des informations sur un appareil »). La finalité 8 s'y ajoute
  /// parce que nos pages de confidentialité conditionnent *la mesure* — pas
  /// seulement le stockage — au formulaire.
  static func verdictDepuisTCF(canRequestAds: Bool) -> VerdictConsentement {
    guard rgpdSApplique else {
      // Hors UE : le formulaire n'est pas requis, l'UMP n'écrit pas les
      // clés IABTCF. On s'en remet au verdict publicitaire, comme avant.
      return VerdictConsentement(
        mesure: canRequestAds, personnalisationPub: canRequestAds, publicite: canRequestAds)
    }
    return VerdictConsentement(
      mesure: finaliteAccordee(1) && finaliteAccordee(8),
      // Finalités 3 (« créer un profil publicitaire personnalisé ») et 4
      // (« sélectionner des publicités personnalisées ») : la correspondance
      // documentée par Google pour `ad_personalization`.
      personnalisationPub: finaliteAccordee(3) && finaliteAccordee(4),
      publicite: canRequestAds)
  }

  // MARK: - Publication

  /// Appelé une fois par lancement, à la fin du parcours UMP/ATT.
  @objc public func resoudre(canRequestAds: Bool) {
    DispatchQueue.main.async {
      // Lu ICI et pas au moment de l'abonnement : les clés IABTCF ne sont
      // écrites par l'UMP qu'une fois le formulaire répondu.
      let verdict = ConsentementBroc.verdictDepuisTCF(canRequestAds: canRequestAds)
      self.verdict = verdict
      let aPrevenir = self.abonnes
      // Abonnement à usage unique : un second `resoudre` dans la même session
      // ne reprévient personne — à revoir le jour où un point d'entrée
      // « gérer mon consentement » rendra ce cas possible.
      self.abonnes.removeAll()
      for cb in aPrevenir { cb(verdict) }
    }
  }

  /// Rappelle immédiatement si le verdict est déjà tombé, sinon met en file.
  /// Le verdict n'arrivant jamais (UMP hors-ligne) laisse l'abonné en attente
  /// sans rien publier : l'état persisté de `setAnalyticsCollectionEnabled`
  /// reste tel quel — le défaut de l'Info.plist (éteint) au tout premier
  /// lancement, ou sinon le dernier verdict connu, qui reste en vigueur.
  func auVerdict(_ cb: @escaping (VerdictConsentement) -> Void) {
    DispatchQueue.main.async {
      if let verdict = self.verdict {
        cb(verdict)
      } else {
        self.abonnes.append(cb)
      }
    }
  }
}
