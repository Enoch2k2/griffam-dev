import Link from "next/link";
import { CallTimes } from "@/features/booking/call-times";
export const metadata = { title: "Booking" };
export default function Page() {
  return <section className="page-section">
    <p className="eyebrow">Let’s connect</p>
    <h1>Make time for your next idea.</h1>
    <p className="lead">A free 30-minute discovery call to talk through your project, your goals, and how I can help.</p>
    <p>Calls require at least 24 hours’ notice. Times reflect my working hours and Google Calendar availability.</p>
    <div className="notice">Browse availability below. Online reservations are coming soon; viewing a time does not reserve it.</div>
    <CallTimes timeZones={Intl.supportedValuesOf("timeZone")} />
    <div className="actions"><Link className="button secondary" href="/contact">Contact me to arrange a call</Link></div>
  </section>;
}
