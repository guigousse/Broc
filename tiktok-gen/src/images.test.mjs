import { describe, expect, it } from "vitest";
import { saturerPixels } from "./images.js";

describe("saturerPixels", () => {
  it("100 % ne change rien, 0 % donne un gris de luminance Rec. 709, alpha intact", () => {
    const px = () => new Uint8ClampedArray([200, 50, 50, 128]);
    expect([...saturerPixels(px(), 100)]).toEqual([200, 50, 50, 128]);
    const gris = saturerPixels(px(), 0);
    const y = Math.round(0.2126 * 200 + 0.7152 * 50 + 0.0722 * 50);
    expect([...gris]).toEqual([y, y, y, 128]);
  });
  it("200 % écarte les couleurs de leur gris, borné à 0–255", () => {
    const out = saturerPixels(new Uint8ClampedArray([200, 50, 50, 255]), 200);
    expect(out[0]).toBe(255);
    expect(out[1]).toBeLessThan(50);
    expect(out[3]).toBe(255);
  });
});
