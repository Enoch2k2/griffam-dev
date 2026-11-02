import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { calendarConfig } from "@/server/calendar/config";
import { readConnection } from "@/server/calendar/store";
import { CalendarTest } from "@/features/booking/calendar-test";
export const metadata = { title: "Google Calendar" };
const messages: Record<string, string> = {
  connected: "Calendar connected. Test access below to verify Google Calendar is ready.",
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
    <p>{connected ? `Connected account: ${connection?.accountEmail}.` : "No calendar connected."}</p>
    {!config && <p role="status">Calendar connection is awaiting server configuration. Follow docs/google-calendar.md before connecting.</p>}
    {config && <form action="/api/admin/calendar/connect" method="post"><button className="button" type="submit">{connected ? "Reconnect Google Calendar" : "Connect Google Calendar"}</button></form>}
    {connected && <><CalendarTest /><form action="/api/admin/calendar/disconnect" method="post"><button className="button button-secondary" type="submit">Disconnect calendar</button></form>
    <p>Disconnect removes the website’s saved credential. To also revoke Google’s permission, use your Google account’s third-party connections settings. Revoking the shared app grant may also affect Google sign-in.</p></>}
    <p><Link href="/admin/availability">Manage working hours and days off →</Link></p>
  </section></main></div>;
}
