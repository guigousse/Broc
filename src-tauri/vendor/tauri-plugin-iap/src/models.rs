use serde::{Deserialize, Serialize};

/// Possession du non-consommable « Énergie infinie » (StoreKit 2,
/// entitlement vérifié on-device, remboursements exclus).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitlementResult {
    pub energie_infinie: bool,
}

/// Prix localisé formaté par StoreKit (`displayPrice`) — jamais codé en dur.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrixResult {
    pub prix: String,
}

/// Résultat d'achat. `annule` = fermeture volontaire (pas un échec) ;
/// `pending` = Ask to Buy / approbation parentale différée.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchatResult {
    pub statut: String,
}
