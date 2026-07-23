use serde::{Deserialize, Serialize};

/// Résultat d'une rewarded ad. `rewarded` n'est vrai que si la pub a été
/// visionnée jusqu'au déclenchement de la récompense côté SDK Google.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdResult {
    pub rewarded: bool,
}
