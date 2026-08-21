use std::collections::HashMap;
use tauri::{command, AppHandle, Runtime};

use crate::{FirebaseExt, Result};

#[command]
pub(crate) async fn initialize<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.firebase().initialize()
}

#[command]
pub(crate) async fn log_event<R: Runtime>(
    app: AppHandle<R>,
    nom: String,
    params: HashMap<String, serde_json::Value>,
) -> Result<()> {
    app.firebase().log_event(nom, params)
}

#[command]
pub(crate) async fn set_user_property<R: Runtime>(
    app: AppHandle<R>,
    nom: String,
    valeur: Option<String>,
) -> Result<()> {
    app.firebase().set_user_property(nom, valeur)
}
