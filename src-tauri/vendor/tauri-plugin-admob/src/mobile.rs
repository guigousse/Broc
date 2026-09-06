use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::{AdResult, OptionsConfidentialite};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.guigousse.broc.admob";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_admob);

// Enregistre la classe Kotlin (Android) ou le plugin Swift (iOS).
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Admob<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "AdmobPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_admob)?;
    Ok(Admob(handle))
}

pub struct Admob<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Admob<R> {
    pub fn initialize(&self) -> crate::Result<()> {
        // Bloque un worker async pendant toute la durée du parcours natif
        // (formulaire UMP potentiellement long) — pattern standard des
        // plugins Tauri mobiles, le pool absorbe.
        self.0
            .run_mobile_plugin("initialize", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn show_rewarded_ad(&self, emplacement: String) -> crate::Result<AdResult> {
        self.0
            .run_mobile_plugin("showRewardedAd", serde_json::json!({ "emplacement": emplacement }))
            .map_err(Into::into)
    }
    // Les deux commandes ci-dessous n'existent que dans la classe Kotlin
    // (sous-projet B, Android seul) : sur iOS l'appel échoue, et la couche TS
    // ne les invoque que sur Android.
    pub fn privacy_options_required(&self) -> crate::Result<OptionsConfidentialite> {
        self.0
            .run_mobile_plugin("privacyOptionsRequired", serde_json::json!({}))
            .map_err(Into::into)
    }
    pub fn show_privacy_options(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("showPrivacyOptions", serde_json::json!({}))
            .map_err(Into::into)
    }
}
