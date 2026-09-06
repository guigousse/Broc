const COMMANDS: &[&str] = &[
    "initialize",
    "show_rewarded_ad",
    "privacy_options_required",
    "show_privacy_options",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
