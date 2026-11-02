import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AvailabilityEditor } from "./availability-editor";
import { initialSettings } from "./availability";
afterEach(() => vi.unstubAllGlobals());
it("previews privately without saving or claiming Google availability", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<AvailabilityEditor initial={initialSettings} now="2026-10-25T00:00:00Z" />);
  expect(screen.getByLabelText("Available on Saturday")).not.toBeChecked();
  await userEvent.click(screen.getByRole("button", { name: "Preview next 7 days" }));
  expect(screen.getByRole("region", { name: "Availability preview" })).toHaveTextContent("does not check Google Calendar");
  expect(fetch).not.toHaveBeenCalled();
});
it("retains edits after a version conflict", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Changed in another tab." }) }));
  render(<AvailabilityEditor initial={initialSettings} now="2026-10-25T00:00:00Z" />);
  await userEvent.type(screen.getByLabelText("Days off"), "2026-12-25");
  await userEvent.click(screen.getByRole("button", { name: "Save availability" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Changed in another tab");
  expect(screen.getByLabelText("Days off")).toHaveValue("2026-12-25");
});
