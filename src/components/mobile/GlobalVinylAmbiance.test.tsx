// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { GlobalVinylAmbiance } from "./GlobalVinylAmbiance";
import { audioManager } from "@/lib/audio/audioManager";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GlobalVinylAmbiance", () => {
  it("route / : l'écran titre pilote lui-même — aucun étouffement", () => {
    pathname = "/";
    const vol = vi
      .spyOn(audioManager, "setVinylAmbianceVolume")
      .mockImplementation(() => {});
    render(<GlobalVinylAmbiance />);
    expect(vol).not.toHaveBeenCalled();
  });

  it("route générique (/collection) : mise à distance 0.22 / 700 Hz", () => {
    pathname = "/collection";
    const cible = vi
      .spyOn(audioManager, "setVinylTargetVolume")
      .mockImplementation(() => {});
    const vol = vi
      .spyOn(audioManager, "setVinylAmbianceVolume")
      .mockImplementation(() => {});
    const lp = vi
      .spyOn(audioManager, "setVinylAmbianceLowpass")
      .mockImplementation(() => {});
    render(<GlobalVinylAmbiance />);
    expect(cible).toHaveBeenCalledWith(1);
    expect(vol).toHaveBeenCalledWith(0.22);
    expect(lp).toHaveBeenCalledWith(700);
  });
});
