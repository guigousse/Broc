use serde::{Deserialize, Serialize};

/// Cible d'une lecture/écriture. Volontairement un énuméré et non un chemin :
/// une commande Tauri est appelable depuis n'importe quel JS de la webview, et
/// une chaîne libre ouvrirait une traversée de répertoire sur le conteneur.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Quoi {
    #[serde(rename = "index")]
    Index,
    #[serde(rename = "slot_1")]
    Slot1,
    #[serde(rename = "slot_2")]
    Slot2,
    #[serde(rename = "slot_3")]
    Slot3,
}

impl Quoi {
    pub fn nom_fichier(self) -> &'static str {
        match self {
            Quoi::Index => "slots.json",
            Quoi::Slot1 => "slot-1.json",
            Quoi::Slot2 => "slot-2.json",
            Quoi::Slot3 => "slot-3.json",
        }
    }
}

/// Réponse du plugin Swift iOS. `octets` est `None` quand la mesure n'a pas
/// pu être obtenue (clé de ressource absente, valeur négative) — jamais un
/// chiffre fabriqué (cf. commentaire de `commands::espace_libre`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EspaceLibreResult {
    pub octets: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aucune_cible_ne_peut_sortir_du_repertoire() {
        for q in [Quoi::Index, Quoi::Slot1, Quoi::Slot2, Quoi::Slot3] {
            let n = q.nom_fichier();
            assert!(!n.contains('/'), "{n} contient un séparateur");
            assert!(!n.contains('\\'), "{n} contient un séparateur");
            assert!(!n.contains(".."), "{n} permet de remonter");
        }
    }
}
