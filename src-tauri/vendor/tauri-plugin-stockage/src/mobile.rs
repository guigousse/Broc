use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::EspaceLibreResult;

tauri::ios_plugin_binding!(init_plugin_stockage);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Stockage<R>> {
    let handle = api.register_ios_plugin(init_plugin_stockage)?;
    Ok(Stockage(handle))
}

pub struct Stockage<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Stockage<R> {
    // Seule commande à passer par le pont natif : lire_save/ecrire_save/
    // partager_fichier restent en Rust pur (app_data_dir, identique sur
    // toutes les plateformes) — cf. commandes.rs et le commentaire de
    // `StockageExt`.
    pub fn espace_libre(&self) -> crate::Result<Option<u64>> {
        self.0
            .run_mobile_plugin::<EspaceLibreResult>("espaceLibre", serde_json::json!({}))
            .map(|r| r.octets)
            .map_err(Into::into)
    }
}
