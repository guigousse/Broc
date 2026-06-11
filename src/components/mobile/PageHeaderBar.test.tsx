// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PageHeaderBar } from "./PageHeaderBar";

afterEach(cleanup);

describe("PageHeaderBar", () => {
  it("par défaut : titre centré entre tirets, zones left/right rendues", () => {
    render(<PageHeaderBar title="Atelier" left={<i>g</i>} right={<i>d</i>} />);
    expect(screen.getByText("— ATELIER —")).toBeTruthy();
    expect(screen.getByText("g")).toBeTruthy();
    expect(screen.getByText("d")).toBeTruthy();
  });

  it("align left : titre en premier, contenu right à droite, pas de zone left", () => {
    const { container } = render(
      <PageHeaderBar title="Collection" align="left" right={<i>somme</i>} />,
    );
    const wrap = container.firstElementChild as HTMLElement;
    expect(wrap.firstElementChild?.textContent).toBe("— COLLECTION —");
    expect(wrap.lastElementChild?.textContent).toBe("somme");
    expect(wrap.style.justifyContent).toBe("space-between");
  });
});
