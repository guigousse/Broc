// @vitest-environment jsdom
/**
 * `programmer()` sous runtime Tauri : le verrou d'obsolescence est relu JUSTE
 * avant l'envoi, après tous les `await` (imports dynamiques, IPC d'annulation),
 * car c'est pendant ces await qu'une échéance plus récente peut arriver.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const sendNotification = vi.fn();
const cancel = vi.fn(async () => {});

vi.mock("@tauri-apps/plugin-notification", () => ({
  sendNotification,
  cancel,
  Schedule: {
    at: (date: Date, repeating: boolean, allowWhileIdle: boolean) => ({
      date,
      repeating,
      allowWhileIdle,
    }),
  },
}));

const { programmer } = await import("./index");

beforeEach(() => {
  sendNotification.mockClear();
  cancel.mockClear();
  window.localStorage.clear();
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
});

describe("programmer() — verrou d'obsolescence", () => {
  it("envoie la notif quand l'échéance est toujours d'actualité", async () => {
    await programmer({
      id: 1,
      title: "t",
      body: "b",
      atMs: 1_700_000_000_000,
      estObsolete: () => false,
    });
    expect(cancel).toHaveBeenCalledWith([1]);
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("n'envoie rien si l'échéance est devenue obsolète pendant les await", async () => {
    let obsolete = false;
    cancel.mockImplementation(async () => {
      // Une planification plus récente a pris la main pendant l'IPC.
      obsolete = true;
    });
    await programmer({
      id: 1,
      title: "t",
      body: "b",
      atMs: 1_700_000_000_000,
      estObsolete: () => obsolete,
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sans verrou, le comportement est inchangé", async () => {
    await programmer({ id: 1, title: "t", body: "b", atMs: 1_700_000_000_000 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});
