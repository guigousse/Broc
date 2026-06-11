import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeLocalStorageGet, safeLocalStorageSet } from "./safeLocalStorage";

/** Mock localStorage pour Node — Vitest tourne sans DOM par défaut. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: new MemoryStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeLocalStorageGet", () => {
  it("retourne le fallback si la clé est absente", () => {
    expect(safeLocalStorageGet("absent", { a: 1 })).toEqual({ a: 1 });
  });

  it("retourne la valeur parsée si JSON valide", () => {
    window.localStorage.setItem("k", JSON.stringify({ x: 42 }));
    expect(safeLocalStorageGet<{ x?: number }>("k", {})).toEqual({ x: 42 });
  });

  it("retourne le fallback si JSON invalide (corruption)", () => {
    window.localStorage.setItem("k", "not-valid-json{");
    expect(safeLocalStorageGet("k", "fallback")).toBe("fallback");
  });

  it("retourne le fallback si window est undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(safeLocalStorageGet("k", 7)).toBe(7);
  });

  it("retourne le fallback si localStorage lève une exception", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem() {
          throw new Error("SecurityError");
        },
      },
    });
    expect(safeLocalStorageGet("k", "ok")).toBe("ok");
  });
});

describe("safeLocalStorageSet", () => {
  it("écrit la valeur sérialisée et retourne true", () => {
    expect(safeLocalStorageSet("k", { y: 3 })).toBe(true);
    expect(window.localStorage.getItem("k")).toBe(JSON.stringify({ y: 3 }));
  });

  it("roundtrip set → get", () => {
    safeLocalStorageSet("k", [1, 2, 3]);
    expect(safeLocalStorageGet<number[]>("k", [])).toEqual([1, 2, 3]);
  });

  it("retourne false si window est undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(safeLocalStorageSet("k", 1)).toBe(false);
  });

  it("retourne false si l'écriture échoue (quota dépassé)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
    });
    expect(safeLocalStorageSet("k", 1)).toBe(false);
  });
});
