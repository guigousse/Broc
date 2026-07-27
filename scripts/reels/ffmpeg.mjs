/**
 * Enveloppe ffmpeg. Les constructeurs de commandes sont purs et testés ;
 * seule `executer` touche au système.
 */
import { spawn } from "node:child_process";

/** Dernière image d'un mp4 : c'est elle qui sert d'image de départ au plan 2. */
export function commandeDerniereFrame(mp4, png) {
  return ["-sseof", "-0.2", "-i", mp4, "-update", "1", "-frames:v", "1", "-y", png];
}

export function executer(binaire, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaire, args, { stdio: ["ignore", "ignore", "pipe"] });
    let erreurs = "";
    proc.stderr.on("data", (d) => {
      erreurs += d.toString();
    });
    proc.on("error", (err) => {
      reject(
        err.code === "ENOENT"
          ? new Error(`${binaire} introuvable — installe-le (brew install ffmpeg)`)
          : err,
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${binaire} a échoué (code ${code}) :\n${erreurs.slice(-2000)}`));
    });
  });
}

export async function verifierFfmpeg() {
  await executer("ffmpeg", ["-version"]);
}
