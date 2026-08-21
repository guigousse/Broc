use serde::de::DeserializeOwned;
use std::collections::HashMap;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Firebase<R>> {
    Ok(Firebase(app.clone()))
}

pub struct Firebase<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

// Hors iOS il n'y a pas de SDK : les trois commandes sont des no-op qui
// réussissent. Contrairement à AdMob (où l'absence de pub prive le joueur de
// sa récompense et mérite une erreur), une mesure absente ne doit rien changer
// au déroulement du jeu — ni erreur, ni toast, ni trace.
impl<R: Runtime> Firebase<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn log_event(
        &self,
        _nom: String,
        _params: HashMap<String, serde_json::Value>,
    ) -> crate::Result<()> {
        Ok(())
    }
    pub fn set_user_property(&self, _nom: String, _valeur: Option<String>) -> crate::Result<()> {
        Ok(())
    }
}
