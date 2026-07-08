// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCALES,
  detecterLocale,
  persisterLocale,
} from "@/lib/i18n/locales";

const CLE = "projet-broc:langue:v1";

describe("locales — détection et persistance", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("expose exactement fr/en/es", () => {
    expect([...LOCALES]).toEqual(["fr", "en", "es"]);
  });

  it("préférence persistée prioritaire sur la langue du navigateur", () => {
    localStorage.setItem(CLE, JSON.stringify({ locale: "es" }));
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("es");
  });

  it("sans préférence : langue du navigateur si fr/es, sinon anglais", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("fr");
    vi.stubGlobal("navigator", { language: "es-419" });
    expect(detecterLocale()).toBe("es");
    vi.stubGlobal("navigator", { language: "de-DE" });
    expect(detecterLocale()).toBe("en");
    vi.stubGlobal("navigator", { language: "en-GB" });
    expect(detecterLocale()).toBe("en");
  });

  it("une préférence corrompue retombe sur la détection navigateur", () => {
    localStorage.setItem(CLE, JSON.stringify({ locale: "klingon" }));
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detecterLocale()).toBe("fr");
  });

  it("persisterLocale écrit la préférence relue par detecterLocale", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    persisterLocale("en");
    expect(detecterLocale()).toBe("en");
  });
});
