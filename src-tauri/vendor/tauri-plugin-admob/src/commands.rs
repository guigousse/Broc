use tauri::{command, AppHandle, Runtime};

use crate::{models::AdResult, AdmobExt, Result};

#[command]
pub(crate) async fn initialize<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.admob().initialize()
}

#[command]
pub(crate) async fn show_rewarded_ad<R: Runtime>(app: AppHandle<R>) -> Result<AdResult> {
    app.admob().show_rewarded_ad()
}
