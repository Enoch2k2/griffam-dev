import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ResumeUpload } from "./resume-upload";
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => vi.unstubAllGlobals());
it("disables upload until configured", () => {
  render(<ResumeUpload enabled={false} />);
  expect(screen.getByRole("button", { name: "Upload and publish resume" })).toBeDisabled();
});
it("requires a file before sending a request", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<ResumeUpload enabled />);
  await userEvent.click(screen.getByRole("button", { name: "Upload and publish resume" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a PDF");
  expect(fetch).not.toHaveBeenCalled();
});
it("publishes the selected file and refreshes availability after success", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: "Resume published." }) });
  vi.stubGlobal("fetch", fetch);
  render(<ResumeUpload enabled />);
  const file = new File(["%PDF-1.7 test %%EOF"], "resume.pdf", { type: "application/pdf" });
  await userEvent.upload(screen.getByLabelText("Resume PDF"), file);
  await userEvent.click(screen.getByRole("button", { name: "Upload and publish resume" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Resume published");
  expect(fetch.mock.calls[0][1].body).toBe(file);
  expect(refresh).toHaveBeenCalled();
});
it("retains the chosen file and reports failure without claiming publication", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Storage unavailable." }) }));
  render(<ResumeUpload enabled />);
  const file = new File(["test"], "resume.pdf", { type: "application/pdf" });
  const input = screen.getByLabelText("Resume PDF") as HTMLInputElement;
  await userEvent.upload(input, file);
  await userEvent.click(screen.getByRole("button", { name: "Upload and publish resume" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Storage unavailable");
  expect(input.files?.[0]).toBe(file);
});
