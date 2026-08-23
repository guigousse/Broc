use crate::error::{Error, Result};
use crate::fichiers;
use crate::models::Quoi;
use crate::StockageExt;
use tauri::{command, AppHandle, Manager, Runtime};

fn repertoire<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf> {
    app.path()
        .app_data_dir()
        .map_err(|e| Error::Io(e.to_string()))
}

#[command]
pub(crate) async fn lire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
) -> Result<Option<String>> {
    fichiers::lire(&repertoire(&app)?, quoi.nom_fichier())
}

#[command]
pub(crate) async fn ecrire_save<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
    contenu: String,
) -> Result<()> {
    fichiers::ecrire_atomique(&repertoire(&app)?, quoi.nom_fichier(), &contenu)
}

// Routé vers le Swift iOS (mobile.rs, `volumeAvailableCapacityForImportantUsageKey`)
// ou vers le no-op Android/bureau (desktop.rs). `None` signifie « je ne sais
// pas », jamais un chiffre faux — un statvfs sous-estimerait l'espace en
// ignorant la place purgeable, et déclencherait l'avertissement à tort.
#[command]
pub(crate) async fn espace_libre<R: Runtime>(app: AppHandle<R>) -> Result<Option<u64>> {
    app.stockage().espace_libre()
}

// Tâche 10 : l'export de sauvegarde. Routé vers le Swift iOS (mobile.rs, la
// feuille de partage système) ou vers le rejet immédiat Android/bureau
// (desktop.rs) — même schéma que `espace_libre` ci-dessus. `chemin` pointe
// TOUJOURS vers le vrai fichier du slot (app_data_dir + nom du `Quoi`) ;
// c'est le Swift qui en fait une copie avant de la présenter, jamais ce
// fichier lui-même (cf. commentaire de `StockagePlugin.swift`).
#[command]
pub(crate) async fn partager_fichier<R: Runtime>(
    app: AppHandle<R>,
    quoi: Quoi,
    nom_lisible: String,
) -> Result<()> {
    let chemin = repertoire(&app)?.join(quoi.nom_fichier());
    app.stockage().partager_fichier(&chemin, &nom_lisible)
}
