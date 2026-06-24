// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  notificationsDisponibles,
  assurerPermission,
  planifierPleinEnergie,
  annulerPleinEnergie,
} from "./energieNotif";

// En environnement de test, `window.__TAURI_INTERNALS__` est absent → hors Tauri.
describe("energieNotif hors Tauri", () => {
  it("notificationsDisponibles() est false sans runtime Tauri", () => {
    expect(notificationsDisponibles()).toBe(false);
  });

  it("assurerPermission() renvoie false sans lever", async () => {
    await expect(assurerPermission()).resolves.toBe(false);
  });

  it("planifier/annuler sont des no-op sans lever", async () => {
    await expect(planifierPleinEnergie(Date.now() + 1000)).resolves.toBeUndefined();
    await expect(annulerPleinEnergie()).resolves.toBeUndefined();
  });
});
