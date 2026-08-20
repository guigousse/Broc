import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core");

import { firebaseDisponible, FirebaseAnalyticsProvider } from "./firebaseProvider";

describe("firebaseDisponible", () => {
  it("est faux hors runtime Tauri (jsdom)", () => {
    expect(firebaseDisponible()).toBe(false);
  });
});

describe("FirebaseAnalyticsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("swallows rejecting invoke calls without unhandled rejection", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("network error"));

    const unhandledRejections: unknown[] = [];
    const handler = (reason: unknown) => unhandledRejections.push(reason);
    process.on("unhandledRejection", handler);

    try {
      const p = new FirebaseAnalyticsProvider();

      // These should not throw synchronously
      expect(() => {
        p.logEvent("test_event");
        p.setUserProperty("test_property", "value");
      }).not.toThrow();

      // Flush microtasks to allow async IIFEs to execute
      await new Promise((r) => setImmediate(r));

      // No unhandled rejection should have occurred
      expect(unhandledRejections).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", handler);
    }
  });
});
