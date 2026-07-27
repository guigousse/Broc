import { describe, expect, it } from "vitest";
import { parserArgs } from "./cli.mjs";

describe("parserArgs", () => {
  it("prend lite 720p par défaut", () => {
    const a = parserArgs([]);
    expect(a.palier).toBe("lite");
    expect(a.definition).toBe("720p");
  });

  it("passe en 1080p avec --hd", () => {
    expect(parserArgs(["--hd"]).definition).toBe("1080p");
  });

  it("lit le palier", () => {
    expect(parserArgs(["--model=fast"]).palier).toBe("fast");
  });

  it("collecte les identifiants d'épisodes", () => {
    expect(parserArgs(["ep01", "--hd", "ep02"]).ids).toEqual(["ep01", "ep02"]);
  });

  it("déduit les étapes des drapeaux d'étape", () => {
    expect(parserArgs(["--frame", "ep01"]).etapes).toEqual(["frame"]);
    expect(parserArgs(["--video", "--montage", "ep01"]).etapes).toEqual(["video", "montage"]);
  });

  it("enchaîne les trois étapes quand aucune n'est demandée", () => {
    expect(parserArgs(["ep01"]).etapes).toEqual(["frame", "video", "montage"]);
  });

  it("reconnaît l'étape master, qui ne prend pas d'épisode", () => {
    expect(parserArgs(["--master"]).etapes).toEqual(["master"]);
  });

  it("lit les drapeaux booléens", () => {
    const a = parserArgs(["--force", "--yes", "--dry-run", "--verbose"]);
    expect(a).toMatchObject({ force: true, yes: true, dryRun: true, verbose: true });
  });

  it("lit le plan ciblé et les prises à monter", () => {
    const a = parserArgs(["--plan=2", "--take1=3", "--take2=1"]);
    expect(a.plan).toBe(2);
    expect(a.take1).toBe(3);
    expect(a.take2).toBe(1);
  });

  it("refuse un plan autre que 1 ou 2", () => {
    expect(() => parserArgs(["--plan=3"])).toThrow(/plan/i);
  });
});
