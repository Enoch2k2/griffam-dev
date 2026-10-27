import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/server/auth/access";
import { getDatabase } from "@/server/db";
import { readSettings } from "@/server/booking/settings";
import { AvailabilityEditor } from "@/features/booking/availability-editor";
export const metadata = { title: "Availability" };
export default function Page() { return <Suspense fallback={<p role="status">Checking owner access…</p>}><Content /></Suspense>; }
async function Content() {
  if ((await getAdminAccess(await headers())).status !== "authorized") redirect("/admin/sign-in");
  const settings = await readSettings(getDatabase());
  return <div className="shell"><main id="main"><section className="page-section"><Link href="/admin">← Administration</Link><p className="eyebrow">Booking setup</p><h1>Make room for good conversations.</h1><p className="lead">Set your weekly hours and days off. Google Calendar connection and public reservations are coming next.</p><AvailabilityEditor initial={settings} now={new Date().toISOString()} /></section></main></div>;
}
