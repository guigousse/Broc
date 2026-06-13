// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ScenePlaque } from "./ScenePlaque";

afterEach(cleanup);

describe("ScenePlaque", () => {
  it("rend le tier 1 avec une étoile", () => {
    render(<ScenePlaque tier={1} />);
    expect(screen.getByLabelText("Rang : 1 étoile")).toBeTruthy();
    expect(screen.getByText("★")).toBeTruthy();
  });

  it("rend le tier 2 avec deux étoiles", () => {
    render(<ScenePlaque tier={2} />);
    expect(screen.getByText("★★")).toBeTruthy();
  });

  it("rend le tier 3 avec trois étoiles", () => {
    render(<ScenePlaque tier={3} />);
    expect(screen.getByText("★★★")).toBeTruthy();
  });

  it("rend le tier 4 avec la mention salon des antiquaires", () => {
    render(<ScenePlaque tier={4} />);
    expect(screen.getByText("★★★★")).toBeTruthy();
    expect(screen.getByText(/salon des antiquaires/i)).toBeTruthy();
  });
});
