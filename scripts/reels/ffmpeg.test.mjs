import { describe, expect, it } from "vitest";
import { commandeDerniereFrame } from "./ffmpeg.mjs";

describe("commandeDerniereFrame", () => {
  const args = commandeDerniereFrame("/tmp/p1.mp4", "/tmp/raccord.png");

  it("lit la fin du fichier et n'extrait qu'une image", () => {
    expect(args).toContain("-sseof");
    expect(args).toContain("-update");
    expect(args.join(" ")).toContain("-frames:v 1");
  });

  it("écrase sans poser de question et cible la sortie demandée", () => {
    expect(args).toContain("-y");
    expect(args[args.length - 1]).toBe("/tmp/raccord.png");
  });

  it("prend le fichier source en entrée", () => {
    expect(args[args.indexOf("-i") + 1]).toBe("/tmp/p1.mp4");
  });
});
