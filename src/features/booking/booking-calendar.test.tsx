import { useState } from "react";
import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingCalendar } from "./booking-calendar";
import type { BookingSlot, SlotsByDate } from "./calendar-view";

const january = { start: "2027-01-31T15:00:00Z", end: "2027-01-31T15:30:00Z" };
const february = { start: "2027-02-02T15:00:00Z", end: "2027-02-02T15:30:00Z" };
const groups: SlotsByDate = { "2027-01-31": [january], "2027-02-02": [february] };

function StatefulCalendar({ bookingEnabled = true, onSelectSlot = vi.fn() }: { bookingEnabled?: boolean; onSelectSlot?: (slot: BookingSlot) => void }) {
  const [date, setDate] = useState<string | null>("2027-01-31");
  const [month, setMonth] = useState("2027-01");
  return <BookingCalendar slotsByDate={groups} selectedDate={date} visibleMonth={month} timeZone="UTC" bookingEnabled={bookingEnabled} today="2027-01-31" onSelectDate={setDate} onSelectSlot={onSelectSlot} onMonthChange={setMonth} />;
}

it("shows one selected day, marks today, and navigates within availability bounds", async () => {
  render(<StatefulCalendar />);
  const selected = screen.getByRole("button", { name: "Sunday, January 31, 2027, 1 available time" });
  expect(selected).toHaveAttribute("aria-pressed", "true");
  expect(selected).toHaveAttribute("aria-current", "date");
  expect(screen.getByRole("button", { name: "Show previous month" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Book Sunday, January 31.*3:00 PM UTC/ })).toBeInTheDocument();
  expect(screen.queryByText("Tuesday, February 2, 2027")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Show next month" }));
  expect(screen.getByRole("heading", { name: "February 2027" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Choose an available day." })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show next month" })).toBeDisabled();

  const nextDay = screen.getByRole("button", { name: "Tuesday, February 2, 2027, 1 available time" });
  nextDay.focus();
  await userEvent.keyboard("{Enter}");
  expect(nextDay).toHaveFocus();
  expect(nextDay).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("status")).toHaveTextContent("1 available time");
});

it("keeps browse-only times informational", () => {
  render(<StatefulCalendar bookingEnabled={false} />);
  expect(screen.getByText("3:00 PM UTC")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Book Sunday/ })).not.toBeInTheDocument();
});

it("distinguishes repeated local times across the daylight-saving fallback", () => {
  const repeated: SlotsByDate = { "2026-11-01": [
    { start: "2026-11-01T05:30:00Z", end: "2026-11-01T06:00:00Z" },
    { start: "2026-11-01T06:30:00Z", end: "2026-11-01T07:00:00Z" },
  ] };
  render(<BookingCalendar slotsByDate={repeated} selectedDate="2026-11-01" visibleMonth="2026-11" timeZone="America/New_York" bookingEnabled={false} today="2026-11-02" onSelectDate={vi.fn()} onSelectSlot={vi.fn()} onMonthChange={vi.fn()} />);
  expect(screen.getByText("1:30 AM EDT")).toBeInTheDocument();
  expect(screen.getByText("1:30 AM EST")).toBeInTheDocument();
});
