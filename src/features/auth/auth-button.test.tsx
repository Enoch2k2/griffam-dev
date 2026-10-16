import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AuthButton } from "./auth-button";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const { social, signOut } = vi.hoisted(() => ({
  social: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("./client", () => ({ authClient: { signIn: { social }, signOut } }));
it("starts owner sign-in with fixed local destinations and prevents duplicate clicks", async () => {
  social.mockReturnValue(new Promise(() => {}));
  render(<AuthButton action="sign-in" />);
  await userEvent.click(
    screen.getByRole("button", { name: "Continue with Google" }),
  );
  expect(social).toHaveBeenCalledWith({
    provider: "google",
    callbackURL: "/admin",
    errorCallbackURL: "/admin/sign-in?error=signin",
  });
  expect(screen.getByRole("button")).toBeDisabled();
});
it("announces sign-in failures and allows retry", async () => {
  social.mockResolvedValue({ error: { message: "Internal provider detail" } });
  render(<AuthButton action="sign-in" />);
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByRole("alert")).toHaveTextContent("Please try again");
  expect(screen.getByRole("button")).toBeEnabled();
});
it("handles network failures during sign-out", async () => {
  signOut.mockRejectedValue(new Error("Offline"));
  render(<AuthButton action="sign-out" />);
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("button")).toBeEnabled();
});
