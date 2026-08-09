import { describe, expect, it, vi } from "vitest";
import { getCoachOuvert, setCoachOuvert, subscribeCoachOuvert } from "./coachActif";

describe("coachActif", () => {
  it("publie l'état et notifie les abonnés", () => {
    const cb = vi.fn();
    const off = subscribeCoachOuvert(cb);
    expect(getCoachOuvert()).toBe(false);
    setCoachOuvert(true);
    expect(getCoachOuvert()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    setCoachOuvert(false);
    expect(cb).toHaveBeenCalledTimes(1); // désabonné
  });
  it("ne notifie pas si la valeur ne change pas", () => {
    const cb = vi.fn();
    const off = subscribeCoachOuvert(cb);
    setCoachOuvert(false);
    expect(cb).not.toHaveBeenCalled();
    off();
  });
});
