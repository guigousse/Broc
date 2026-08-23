use serde::de::DeserializeOwned;
use std::path::Path;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::error::Error;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Stockage<R>> {
    Ok(Stockage(app.clone()))
}

pub struct Stockage<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

// Android et bureau : aucun SDK natif équivalent à `volumeAvailableCapacity-
// ForImportantUsageKey` de branché ici. `None` signifie « je ne sais pas
// mesurer », jamais un chiffre fabriqué — un faux avertissement sur un
// appareil sain coûterait la crédibilité de toute alerte de l'app (cf.
// commentaire de `commands::espace_libre`).
impl<R: Runtime> Stockage<R> {
    pub fn espace_libre(&self) -> crate::Result<Option<u64>> {
        Ok(None)
    }

    // Android et bureau : aucune feuille de partage native branchée ici.
    // Rejette IMMÉDIATEMENT — aucun accès disque, aucune UI — c'est ce
    // zéro-effet-de-bord qui rend inoffensif le sondage de disponibilité que
    // PartiesModal.tsx fait au montage (Tâche 10).
    pub fn partager_fichier(&self, _chemin: &Path, _nom_lisible: &str) -> crate::Result<()> {
        Err(Error::Indisponible)
    }

    // Ruling R15 : constante, symétrique de mobile.rs.
    pub fn partage_disponible(&self) -> bool {
        false
    }
}
