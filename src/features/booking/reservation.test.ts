import { expect, it } from "vitest";
import { validateReservation } from "./reservation";
const input = { id: "9ca8d753-51af-4b37-973a-a4e3057810cd", start: "2026-11-05T15:00:00Z", name: " Client ", email: " CLIENT@example.com ", timeZone: "America/Chicago", notes: " A project " };
it("normalizes details and rejects malformed slot timestamps and oversized fields", () => {
  expect(validateReservation(input)).toMatchObject({ name: "Client", email: "client@example.com", notes: "A project" });
  for (const patch of [{ start: "2026-02-30T15:00:00Z" }, { start: "2026-11-05T15:00:01Z" }, { start: "2026-11-05T15:00:00-06:00" }, { id: "bad" }, { name: "x" }, { email: "bad" }, { timeZone: "bad" }, { notes: "x".repeat(2001) }]) expect(validateReservation({ ...input, ...patch })).toBeNull();
});
