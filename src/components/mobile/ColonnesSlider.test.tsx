// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ColonnesSlider } from "./ColonnesSlider";

afterEach(cleanup);

describe("ColonnesSlider", () => {
  it("rend un range 1-5 avec la valeur courante", () => {
    render(<ColonnesSlider value={2} onChange={() => {}} />);
    const input = screen.getByLabelText("Items par ligne") as HTMLInputElement;
    expect(input.type).toBe("range");
    expect(input.min).toBe("1");
    expect(input.max).toBe("5");
    expect(input.step).toBe("1");
    expect(input.value).toBe("2");
  });

  it("remonte la nouvelle valeur en nombre", () => {
    const onChange = vi.fn();
    render(<ColonnesSlider value={3} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Items par ligne"), {
      target: { value: "1" },
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("remonte les nouvelles valeurs hautes (4, 5)", () => {
    const onChange = vi.fn();
    render(<ColonnesSlider value={2} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Items par ligne"), {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
