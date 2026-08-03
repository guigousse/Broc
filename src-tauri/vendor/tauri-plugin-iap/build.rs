const COMMANDS: &[&str] = &["verifier_entitlement", "obtenir_prix", "acheter", "restaurer"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
