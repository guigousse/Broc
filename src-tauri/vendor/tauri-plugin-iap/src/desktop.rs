use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::{AchatResult, EntitlementResult, PrixResult};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Iap<R>> {
    Ok(Iap(app.clone()))
}

pub struct Iap<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> Iap<R> {
    pub fn verifier_entitlement(&self) -> crate::Result<EntitlementResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn obtenir_prix(&self) -> crate::Result<PrixResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn acheter(&self) -> crate::Result<AchatResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
    pub fn restaurer(&self) -> crate::Result<EntitlementResult> {
        Err(crate::Error::UnsupportedPlatform)
    }
}
