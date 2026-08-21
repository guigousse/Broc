// swift-tools-version:5.5
import PackageDescription

let package = Package(
  name: "tauri-plugin-firebase",
  platforms: [
    .iOS(.v13)
  ],
  products: [
    .library(
      name: "tauri-plugin-firebase",
      type: .static,
      targets: ["tauri-plugin-firebase"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-firebase",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
