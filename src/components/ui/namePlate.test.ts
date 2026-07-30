import { describe, expect, it } from "vitest";
import { namePlateStyle } from "./namePlate";

describe("namePlateStyle", () => {
  it("applique le rayon demandé", () => {
    expect(namePlateStyle("12px 12px 0 0").borderRadius).toBe("12px 12px 0 0");
    expect(namePlateStyle("0").borderRadius).toBe("0");
  });

  it("porte le dégradé laiton et les capitales espacées", () => {
    const style = namePlateStyle("0");
    expect(style.background).toContain("var(--brass-500)");
    expect(style.borderBottom).toBe("2px solid var(--brass-700)");
    expect(style.textTransform).toBe("uppercase");
    expect(style.letterSpacing).toBe("0.18em");
    expect(style.fontFamily).toBe("var(--font-display)");
  });
});
