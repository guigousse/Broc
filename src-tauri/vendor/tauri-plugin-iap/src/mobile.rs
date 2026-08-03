use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::{AchatResult, EntitlementResult, PrixResult};

tauri::ios_plugin_binding!(init_plugin_iap);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Iap<R>> {
    let handle = api.register_ios_plugin(init_plugin_iap)?;
    Ok(Iap(handle))
}

pub struct Iap<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Iap<R> {
    pub fn verifier_entitlement(&self) -> crate::Result<EntitlementResult> {
        self.0
            .run_mobile_plugin("verifierEntitlement", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn obtenir_prix(&self) -> crate::Result<PrixResult> {
        self.0
            .run_mobile_plugin("obtenirPrix", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn acheter(&self) -> crate::Result<AchatResult> {
        self.0
            .run_mobile_plugin("acheter", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn restaurer(&self) -> crate::Result<EntitlementResult> {
        self.0
            .run_mobile_plugin("restaurer", serde_json::json!({}))
            .map_err(Into::into)
    }
}
