// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestReview = vi.fn(() => Promise.resolve());
vi.mock("@gbyte/tauri-plugin-in-app-review", () => ({
  requestReview: () => requestReview(),
}));

import { demanderNotation } from "./notation";

beforeEach(() => {
  requestReview.mockClear();
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("demanderNotation", () => {
  it("sous Tauri, demande la feuille native", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    await demanderNotation();
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it("hors Tauri, ne fait rien du tout", async () => {
    await demanderNotation();
    expect(requestReview).not.toHaveBeenCalled();
  });

  it("un échec du plugin ne remonte jamais à l'appelant", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    requestReview.mockRejectedValueOnce(new Error("indisponible"));
    await expect(demanderNotation()).resolves.toBeUndefined();
  });
});
