// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notificationsDisponibles,
  permissionAccordee,
  demanderPermission,
  programmer,
  annuler,
} from "./index";

// En test, `window.__TAURI_INTERNALS__` est absent → hors Tauri : tout est no-op.
describe("notifications/index hors Tauri", () => {
  it("notificationsDisponibles() est false sans runtime Tauri", () => {
    expect(notificationsDisponibles()).toBe(false);
  });

  it("permissionAccordee() renvoie false sans lever", async () => {
    await expect(permissionAccordee()).resolves.toBe(false);
  });

  it("demanderPermission() renvoie false sans lever", async () => {
    await expect(demanderPermission()).resolves.toBe(false);
  });

  it("programmer() est un no-op sans lever", async () => {
    await expect(
      programmer({ id: 1, title: "t", body: "b", atMs: Date.now() + 1000 }),
    ).resolves.toBeUndefined();
  });

  it("annuler() est un no-op sans lever", async () => {
    await expect(annuler([1, 2])).resolves.toBeUndefined();
  });
});
