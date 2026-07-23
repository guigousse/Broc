// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-admob",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-admob",
      type: .static,
      targets: ["tauri-plugin-admob"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-admob",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
