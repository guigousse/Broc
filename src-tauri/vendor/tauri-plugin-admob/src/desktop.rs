use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::AdResult;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    Ok(Admob(app.clone()))
}

pub struct Admob<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Admob<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn show_rewarded_ad(&self) -> crate::Result<AdResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
}
