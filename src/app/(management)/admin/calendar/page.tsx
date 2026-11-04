import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { calendarConfig } from "@/server/calendar/config";
import { readConnection } from "@/server/calendar/store";
export const metadata = { title: "Google Calendar" };
const messages: Record<string, string> = {
  connected: "Calendar connected. Your saved connection is ready to check availability.",
  disconnected: "Calendar disconnected from this website.",
  cancelled: "Google consent was cancelled. Your previous connection, if any, was kept.",
  failed: "Connection was not completed. Try again with your owner Google account and grant calendar access.",
};
type Props = { searchParams: Promise<{ result?: string }> };
export default function Page(props: Props) { return <Suspense fallback={<p role="status">Checking owner access…</p>}><Content {...props} /></Suspense>; }
async function Content({ searchParams }: Props) {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  const config = calendarConfig();
  const connection = await readConnection(getDatabase());
  const connected = Boolean(connection?.encryptedRefreshToken);
  const { result } = await searchParams;
  return <div className="shell"><main id="main"><section className="page-section">
    <Link href="/admin">← Administration</Link><p className="eyebrow">Booking setup</p><h1>Connect your calendar.</h1>
    <p className="lead">Check busy times on your GriffamDev Google account’s primary calendar.</p>
    <p>This separate connection reads busy times only. It does not read event titles, create appointments or enable public bookings.</p>
    {result && messages[result] && <p role="status">{messages[result]}</p>}
    <div className="calendar-connection">
      <div className="calendar-connection-heading">
        <h2>Google Calendar</h2>
        <span className="calendar-connection-status">{connected ? "Connected" : "Not connected"}</span>
      </div>
      <p className="calendar-account">{connected ? connection?.accountEmail : "Connect your account to check availability."}</p>
      {!config && <p role="status">Calendar connection is awaiting server configuration.</p>}
      <div className="calendar-controls">
        {config && <form action="/api/admin/calendar/connect" method="post"><button className="button" type="submit">{connected ? "Reconnect calendar" : "Connect Google Calendar"}</button></form>}
        <Link className="button secondary" href="/admin/availability">Manage availability</Link>
      </div>
      {connected && <div className="calendar-disconnect">
        <div><h3>Disconnect calendar</h3><p className="form-help">Removes this website’s saved connection. You can reconnect at any time.</p></div>
        <form action="/api/admin/calendar/disconnect" method="post"><button className="button secondary" type="submit">Disconnect</button></form>
      </div>}
    </div>
    {connected && <p className="form-help">To also revoke Google’s permission, use your Google account’s third-party connections settings. Revoking the shared app grant may also affect Google sign-in.</p>}
  </section></main></div>;
}
