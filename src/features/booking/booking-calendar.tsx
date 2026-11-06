"use client";

import { useId } from "react";
import {
  dateKeyForDay,
  fullDateLabel,
  monthGrid,
  monthKey,
  monthLabel,
  shiftMonth,
  type BookingSlot,
  type SlotsByDate,
} from "./calendar-view";
import styles from "./booking-calendar.module.css";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  slotsByDate: SlotsByDate;
  selectedDate: string | null;
  visibleMonth: string;
  timeZone: string;
  bookingEnabled: boolean;
  today: string;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: BookingSlot) => void;
  onMonthChange: (month: string) => void;
};

export function BookingCalendar({ slotsByDate, selectedDate, visibleMonth, timeZone, bookingEnabled, today, onSelectDate, onSelectSlot, onMonthChange }: Props) {
  const titleId = useId();
  const dates = Object.keys(slotsByDate).sort();
  const firstMonth = monthKey(dates[0]);
  const lastMonth = monthKey(dates.at(-1)!);
  const previousMonth = shiftMonth(visibleMonth, -1);
  const nextMonth = shiftMonth(visibleMonth, 1);
  const activeDate = selectedDate?.startsWith(`${visibleMonth}-`) && slotsByDate[selectedDate] ? selectedDate : null;
  const activeSlots = activeDate ? slotsByDate[activeDate] : [];
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const cells = monthGrid(visibleMonth);

  return <div className={styles.bookingCalendarLayout}>
    <section className={styles.bookingCalendarPanel} aria-labelledby={titleId}>
      <div className={styles.bookingMonthHeader}>
        <button className={styles.bookingMonthButton} type="button" aria-label="Show previous month" disabled={previousMonth < firstMonth} onClick={() => onMonthChange(previousMonth)}>←</button>
        <h2 id={titleId}>{monthLabel(visibleMonth)}</h2>
        <button className={styles.bookingMonthButton} type="button" aria-label="Show next month" disabled={nextMonth > lastMonth} onClick={() => onMonthChange(nextMonth)}>→</button>
      </div>
      <table className={styles.bookingCalendarTable}>
        <thead><tr>{weekdays.map(day => <th key={day} scope="col"><abbr title={day}>{day.slice(0, 3)}</abbr></th>)}</tr></thead>
        <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>
          {cells.slice(week * 7, week * 7 + 7).map((day, index) => {
            if (!day) return <td aria-hidden="true" key={`empty-${index}`} />;
            const key = dateKeyForDay(visibleMonth, day);
            const count = slotsByDate[key]?.length ?? 0;
            const label = fullDateLabel(key);
            return <td key={key}>
              <button
                type="button"
                className={styles.bookingDayButton}
                disabled={!count}
                aria-label={count ? `${label}, ${count} available ${count === 1 ? "time" : "times"}` : `${label}, unavailable`}
                aria-pressed={selectedDate === key}
                aria-current={today === key ? "date" : undefined}
                onClick={() => onSelectDate(key)}
              >
                <span>{day}</span>
                {count > 0 && <span className={styles.bookingDayMarker} aria-hidden="true">•</span>}
              </button>
            </td>;
          })}
        </tr>)}</tbody>
      </table>
      <div className={styles.bookingCalendarLegend} aria-label="Calendar legend">
        <span><span className={styles.bookingLegendMarker} aria-hidden="true">•</span> Available</span>
        <span><span className={styles.bookingSelectedSwatch} aria-hidden="true" /> Selected</span>
      </div>
    </section>

    <section className={styles.bookingTimesPanel} aria-label="Available times">
      {activeDate ? <>
        <p className={styles.bookingPanelKicker}>Selected day</p>
        <h2>{fullDateLabel(activeDate)}</h2>
        <p className={styles.bookingTimeZone}>Times in {timeZone.replaceAll("_", " ")} · Free · 30 minutes · Zoom</p>
        <p className={styles.bookingSelectionStatus} role="status" aria-live="polite">{activeSlots.length} available {activeSlots.length === 1 ? "time" : "times"}.</p>
        <ul className={styles.bookingTimeList}>{activeSlots.map(slot => {
          const start = time.format(new Date(slot.start));
          const end = time.format(new Date(slot.end));
          return <li key={slot.start}>{bookingEnabled ? <button className={styles.bookingTimeButton} type="button" aria-label={`Book ${fullDateLabel(activeDate)}, ${start} to ${end} in ${timeZone.replaceAll("_", " ")}`} onClick={() => onSelectSlot(slot)}>{start}<span aria-hidden="true"> – </span>{end}</button> : <span className={styles.bookingBrowseTime}><time dateTime={slot.start}>{start}</time><span aria-hidden="true"> – </span><time dateTime={slot.end}>{end}</time></span>}</li>;
        })}</ul>
      </> : <div className={styles.bookingEmptySelection}>
        <p className={styles.bookingPanelKicker}>Available times</p>
        <h2>Choose an available day.</h2>
        <p>Select a highlighted date on the calendar to see its call times.</p>
      </div>}
    </section>
  </div>;
}
