import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";

describe("BrandLogo", () => {
  it("lets visitors hide and restore animation while keeping the home link", async () => {
    const user = userEvent.setup();
    render(<BrandLogo />);
    expect(screen.getByRole("link", { name: "GriffamDev home" })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "Hide animated logo" }));
    expect(screen.getByRole("button", { name: "Show animated logo" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Show animated logo" }));
    expect(screen.getByRole("button", { name: "Hide animated logo" })).toHaveAttribute("aria-pressed", "false");
  });
});
