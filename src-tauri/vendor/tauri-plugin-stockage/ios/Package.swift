// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-stockage",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-stockage",
      type: .static,
      targets: ["tauri-plugin-stockage"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-stockage",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
