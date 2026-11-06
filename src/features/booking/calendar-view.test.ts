import { describe, expect, it } from "vitest";
import { dateKeyForInstant, groupSlotsByDate, monthGrid, shiftMonth } from "./calendar-view";

describe("booking calendar date helpers", () => {
  it("groups and sorts slots by the selected display time zone", () => {
    const later = { start: "2026-11-05T02:00:00Z", end: "2026-11-05T02:30:00Z" };
    const earlier = { start: "2026-11-05T01:00:00Z", end: "2026-11-05T01:30:00Z" };
    expect(dateKeyForInstant(earlier.start, "America/Chicago")).toBe("2026-11-04");
    expect(dateKeyForInstant(earlier.start, "Asia/Tokyo")).toBe("2026-11-05");
    expect(groupSlotsByDate([later, earlier], "America/Chicago")).toEqual({ "2026-11-04": [earlier, later] });
  });

  it("builds complete Sunday-first month rows including leap day", () => {
    const cells = monthGrid("2028-02");
    expect(cells).toHaveLength(35);
    expect(cells.slice(0, 3)).toEqual([null, null, 1]);
    expect(cells).toContain(29);
    expect(cells.at(-1)).toBeNull();
  });

  it("moves across year boundaries without host-local date math", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});
