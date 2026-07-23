use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::AdResult;

tauri::ios_plugin_binding!(init_plugin_admob);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    let handle = api.register_ios_plugin(init_plugin_admob)?;
    Ok(Admob(handle))
}

pub struct Admob<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Admob<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("initialize", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn show_rewarded_ad(&self) -> crate::Result<AdResult> {
        self.0
            .run_mobile_plugin("showRewardedAd", serde_json::json!({}))
            .map_err(Into::into)
    }
}
