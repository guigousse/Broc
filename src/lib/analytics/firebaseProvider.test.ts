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

  it("avale les rejets d'invoke sans provoquer d'unhandled rejection", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockRejectedValue(new Error("network error"));

    const unhandledRejections: unknown[] = [];
    const handler = (reason: unknown) => unhandledRejections.push(reason);
    process.on("unhandledRejection", handler);

    try {
      const p = new FirebaseAnalyticsProvider();

      // Ne doit rien lever de façon synchrone
      expect(() => {
        p.logEvent("test_event");
        p.setUserProperty("test_property", "value");
      }).not.toThrow();

      // Vide la file de microtâches pour laisser les IIFE async s'exécuter
      await new Promise((r) => setImmediate(r));

      // Aucun rejet non géré ne doit s'être produit
      expect(unhandledRejections).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", handler);
    }
  });
});
