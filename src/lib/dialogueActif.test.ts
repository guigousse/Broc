import { describe, expect, it, vi } from "vitest";
import { getDialogueActif, setDialogueActif, subscribeDialogueActif } from "./dialogueActif";

describe("dialogueActif", () => {
  it("publie l'état et notifie les abonnés", () => {
    const cb = vi.fn();
    const off = subscribeDialogueActif(cb);
    expect(getDialogueActif()).toBe(false);
    setDialogueActif(true);
    expect(getDialogueActif()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    setDialogueActif(false);
    expect(cb).toHaveBeenCalledTimes(1); // désabonné
  });
  it("ne notifie pas si la valeur ne change pas", () => {
    const cb = vi.fn();
    const off = subscribeDialogueActif(cb);
    setDialogueActif(false);
    expect(cb).not.toHaveBeenCalled();
    off();
  });
});
