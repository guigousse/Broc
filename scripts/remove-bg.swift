// Détourage par Vision (même moteur que l'Action Rapide Finder « Supprimer l'arrière-plan »).
// Usage : remove-bg <fichier.png>…  → écrit « <nom> avec arrière-plan supprimé.png » à côté.
import Foundation
import Vision
import CoreImage

let files = CommandLine.arguments.dropFirst()
if files.isEmpty { fputs("usage: remove-bg <png>…\n", stderr); exit(2) }
let context = CIContext()
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
var failures = 0
for path in files {
  let url = URL(fileURLWithPath: path)
  guard let image = CIImage(contentsOf: url) else { fputs("✗ lecture impossible : \(path)\n", stderr); failures += 1; continue }
  let request = VNGenerateForegroundInstanceMaskRequest()
  let handler = VNImageRequestHandler(ciImage: image, options: [:])
  do {
    try handler.perform([request])
    guard let result = request.results?.first else { fputs("✗ aucun premier plan : \(path)\n", stderr); failures += 1; continue }
    let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
    let out = CIImage(cvPixelBuffer: buffer)
    let base = url.deletingPathExtension().lastPathComponent
    let outURL = url.deletingLastPathComponent().appendingPathComponent("\(base) avec arrière-plan supprimé.png")
    try context.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: colorSpace, options: [:])
    print("✓ \(outURL.lastPathComponent) (\(result.allInstances.count) instance(s))")
  } catch {
    fputs("✗ \(path) : \(error)\n", stderr); failures += 1
  }
}
exit(failures == 0 ? 0 : 1)
