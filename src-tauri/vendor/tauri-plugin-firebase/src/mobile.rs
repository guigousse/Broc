use serde::de::DeserializeOwned;
use std::collections::HashMap;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

tauri::ios_plugin_binding!(init_plugin_firebase);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Firebase<R>> {
    let handle = api.register_ios_plugin(init_plugin_firebase)?;
    Ok(Firebase(handle))
}

pub struct Firebase<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Firebase<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("initialize", serde_json::json!({}))
            .map_err(Into::into)
    }

    pub fn log_event(
        &self,
        nom: String,
        params: HashMap<String, serde_json::Value>,
    ) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("logEvent", serde_json::json!({ "nom": nom, "params": params }))
            .map_err(Into::into)
    }

    pub fn set_user_property(&self, nom: String, valeur: Option<String>) -> crate::Result<()> {
        self.0
            .run_mobile_plugin(
                "setUserProperty",
                serde_json::json!({ "nom": nom, "valeur": valeur }),
            )
            .map_err(Into::into)
    }
}
