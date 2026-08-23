use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

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
}
