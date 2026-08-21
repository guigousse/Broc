const COMMANDS: &[&str] = &["initialize", "log_event", "set_user_property"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .build();
}
