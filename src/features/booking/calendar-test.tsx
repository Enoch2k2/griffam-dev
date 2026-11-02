"use client";
import { useState } from "react";
export function CalendarTest() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function test() {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/calendar/test", { method: "POST" });
      const body = await response.json();
      setMessage(response.ok ? body.message : body.error);
    } catch { setMessage("Could not reach the server. Try again."); }
    finally { setPending(false); }
  }
  return <div><button type="button" className="button" disabled={pending} onClick={test}>{pending ? "Checking calendar…" : "Test calendar access"}</button><p role="status">{message}</p></div>;
}
