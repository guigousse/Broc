// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

afterEach(cleanup);

describe("BottomSheet — bottomOffset", () => {
  it("sans offset : collée en bas (comportement historique)", () => {
    render(
      <BottomSheet open onClose={() => {}}>
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe("0px");
  });

  it("avec offset : la sheet s'arrête au-dessus du dock", () => {
    render(
      <BottomSheet open onClose={() => {}} bottomOffset="calc(71px + var(--safe-bottom))">
        contenu
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog").style.bottom).toBe(
      "calc(71px + var(--safe-bottom))",
    );
  });
});
