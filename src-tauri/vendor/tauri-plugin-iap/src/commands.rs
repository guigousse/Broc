use tauri::{command, AppHandle, Runtime};

use crate::{models::{AchatResult, EntitlementResult, PrixResult}, IapExt, Result};

#[command]
pub(crate) async fn verifier_entitlement<R: Runtime>(app: AppHandle<R>) -> Result<EntitlementResult> {
    app.iap().verifier_entitlement()
}

#[command]
pub(crate) async fn obtenir_prix<R: Runtime>(app: AppHandle<R>) -> Result<PrixResult> {
    app.iap().obtenir_prix()
}

#[command]
pub(crate) async fn acheter<R: Runtime>(app: AppHandle<R>) -> Result<AchatResult> {
    app.iap().acheter()
}

#[command]
pub(crate) async fn restaurer<R: Runtime>(app: AppHandle<R>) -> Result<EntitlementResult> {
    app.iap().restaurer()
}
