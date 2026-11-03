import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarTest } from "./calendar-test";
it("shows a successful provider test only after an explicit owner action", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: "Calendar access works." }) });
  vi.stubGlobal("fetch", fetcher);
  render(<CalendarTest />); expect(fetcher).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Test calendar access" }));
  expect(screen.getByRole("status")).toHaveTextContent("Calendar access works.");
  expect(fetcher).toHaveBeenCalledWith("/api/admin/calendar/test", { method: "POST" });
});
it("shows recoverable connection errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<CalendarTest />);
  await userEvent.click(screen.getByRole("button", { name: "Test calendar access" }));
  expect(screen.getByRole("status")).toHaveTextContent("Could not reach the server");
  expect(screen.getByRole("button")).toBeEnabled();
});
it("displays safe provider diagnostics alongside the error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Google denied Calendar access.", diagnostic: "freebusy/403/insufficientPermissions" }) }));
  render(<CalendarTest />);
  await userEvent.click(screen.getByRole("button", { name: "Test calendar access" }));
  expect(screen.getByRole("status")).toHaveTextContent("Diagnostic: freebusy/403/insufficientPermissions");
});
