// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FloatingRoomOverlay } from "./FloatingRoomOverlay";

afterEach(cleanup);

describe("FloatingRoomOverlay", () => {
  it("rend la bande haute et le panneau bas", () => {
    render(
      <FloatingRoomOverlay bande={<div>BANDE</div>}>
        <div>PANNEAU</div>
      </FloatingRoomOverlay>,
    );
    expect(screen.getByText("BANDE")).toBeTruthy();
    expect(screen.getByText("PANNEAU")).toBeTruthy();
  });

  it("est un overlay fixed qui couvre la zone entre header et TabBar", () => {
    const { container } = render(
      <FloatingRoomOverlay bande={<div>B</div>}>
        <div>P</div>
      </FloatingRoomOverlay>,
    );
    const wrap = container.querySelector(
      '[data-floating-room="1"]',
    ) as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.style.position).toBe("fixed");
    expect(wrap.style.zIndex).toBe("35");
  });
});
