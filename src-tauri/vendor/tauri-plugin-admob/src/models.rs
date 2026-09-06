use serde::{Deserialize, Serialize};

/// Résultat d'une rewarded ad. `rewarded` n'est vrai que si la pub a été
/// visionnée jusqu'au déclenchement de la récompense côté SDK Google.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdResult {
    pub rewarded: bool,
}

/// Réponse de `privacy_options_required` : vrai quand UMP exige (UE) un point
/// d'entrée permettant de rouvrir le formulaire de consentement.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptionsConfidentialite {
    pub requis: bool,
}
