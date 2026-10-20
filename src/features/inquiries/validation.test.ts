import { describe, expect, it } from "vitest";
import { validateInquiry } from "./validation";
const valid = { id: "00000000-0000-4000-8000-000000000001", name: " Test Person ", email: " TEST@example.com ", service: "Web application", message: "A useful description of the project." };
describe("inquiry validation", () => {
  it("normalizes names and email without altering the message contents", () => {
    expect(validateInquiry(valid)).toMatchObject({ ok: true, data: { name: "Test Person", email: "test@example.com" } });
  });
  it.each([null, [], { ...valid, message: "short" }, { ...valid, message: "x".repeat(4001) }, { ...valid, email: "invalid" }, { ...valid, service: "injected" }, { ...valid, id: "invalid" }])("rejects malformed or oversized fields", value => {
    expect(validateInquiry(value).ok).toBe(false);
  });
});
