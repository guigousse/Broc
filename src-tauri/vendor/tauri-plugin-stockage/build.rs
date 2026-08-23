const COMMANDS: &[&str] = &["lire_save", "ecrire_save", "espace_libre", "partager_fichier"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
