import { expect, it, vi } from "vitest";
const { getAuth } = vi.hoisted(() => ({ getAuth: vi.fn() }));
vi.mock("@/server/auth", () => ({ getAuth }));
import { GET, POST } from "@/app/api/auth/[...all]/route";
it("fails closed when auth is not configured", async () => {
  getAuth.mockReturnValue(null);
  for (const handler of [GET, POST]) {
    const response = await handler(
      new Request("http://localhost/api/auth/get-session"),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
});
it("delegates requests to the auth library without consuming request bodies", async () => {
  const response = new Response("test");
  const handler = vi.fn().mockResolvedValue(response);
  getAuth.mockReturnValue({ handler });
  const request = new Request("http://localhost/api/auth/sign-out", {
    method: "POST",
  });
  expect(await POST(request)).toBe(response);
  expect(handler).toHaveBeenCalledWith(request);
});
