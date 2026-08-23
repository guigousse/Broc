use serde::de::DeserializeOwned;
use std::path::Path;
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
    // Deux commandes à passer par le pont natif : `espace_libre` (Tâche 9)
    // et `partager_fichier` (Tâche 10, ci-dessous). lire_save/ecrire_save
    // restent en Rust pur (app_data_dir, identique sur toutes les
    // plateformes) — cf. commands.rs et le commentaire de `StockageExt`.
    pub fn espace_libre(&self) -> crate::Result<Option<u64>> {
        self.0
            .run_mobile_plugin::<EspaceLibreResult>("espaceLibre", serde_json::json!({}))
            .map(|r| r.octets)
            .map_err(Into::into)
    }

    // Relaie `chemin` (le vrai fichier du slot, calculé côté commands.rs) et
    // `nom_lisible` au Swift, qui en fait une COPIE avant de présenter la
    // feuille de partage — ce pont ne touche jamais lui-même au fichier
    // source. Voir StockagePlugin.swift pour la garde iPad et la garde sur
    // un nom vide (dont PartiesModal.tsx se sert pour sonder la
    // disponibilité sans déclencher de partage réel).
    pub fn partager_fichier(&self, chemin: &Path, nom_lisible: &str) -> crate::Result<()> {
        self.0
            .run_mobile_plugin(
                "partagerFichier",
                serde_json::json!({
                    "chemin": chemin.to_string_lossy(),
                    "nomLisible": nom_lisible,
                }),
            )
            .map_err(Into::into)
    }
}
