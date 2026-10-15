import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

let media: MediaQueryList;

beforeEach(() => {
  const events = new EventTarget();
  media = {
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  document.documentElement.dataset.theme = "light";
});

function changeSystemTheme(dark: boolean) {
  Object.defineProperty(media, "matches", { value: dark, configurable: true });
  act(() => {
    media.dispatchEvent(new Event("change"));
  });
}

describe("ThemeToggle", () => {
  it("changes its action label in both directions and persists the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toHaveTextContent("Light mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "cyberpunk");
    expect(localStorage.getItem("griffamdev-theme")).toBe("cyberpunk");
    await user.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toHaveTextContent("Dark mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("griffamdev-theme")).toBe("light");
  });

  it("uses the theme restored before hydration", () => {
    document.documentElement.dataset.theme = "cyberpunk";
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();
  });

  it("supports keyboard activation", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toHaveFocus();
  });

  it("still switches when persistence is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "cyberpunk");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();
  });

  it("follows the system only when no explicit preference is saved", () => {
    render(<ThemeToggle />);
    changeSystemTheme(true);
    expect(document.documentElement).toHaveAttribute("data-theme", "cyberpunk");
    localStorage.setItem("griffamdev-theme", "light");
    changeSystemTheme(true);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("syncs preferences changed or cleared in another tab", () => {
    render(<ThemeToggle />);
    localStorage.setItem("griffamdev-theme", "cyberpunk");
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "griffamdev-theme" }),
      );
    });
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeVisible();
  });

  it("removes listeners on unmount", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeMedia = vi.spyOn(media, "removeEventListener");
    const { unmount } = render(<ThemeToggle />);
    unmount();
    expect(removeWindow).toHaveBeenCalledWith("storage", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith(
      "griffamdev-theme-change",
      expect.any(Function),
    );
    expect(removeMedia).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
