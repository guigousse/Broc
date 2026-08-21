use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Un événement Analytics. `params` est libre (nombres, booléens, chaînes
/// courtes) ; c'est le natif qui l'aplatit vers l'API Firebase.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Evenement {
    pub nom: String,
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
}
