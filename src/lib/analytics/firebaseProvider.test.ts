import { describe, it, expect } from "vitest";
import { firebaseDisponible, FirebaseAnalyticsProvider } from "./firebaseProvider";

describe("firebaseDisponible", () => {
  it("est faux hors runtime Tauri (jsdom)", () => {
    expect(firebaseDisponible()).toBe(false);
  });
});

describe("FirebaseAnalyticsProvider", () => {
  it("logEvent n'explose pas quand l'API Tauri est absente", () => {
    const p = new FirebaseAnalyticsProvider();
    expect(() => p.logEvent("tuto_termine")).not.toThrow();
    expect(() => p.setUserProperty("langue", "fr")).not.toThrow();
  });
});
