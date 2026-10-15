import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Booking" };
const content = {
  eyebrow: "Booking",
  title: "Let’s make time to talk.",
  description:
    "Custom consultation scheduling is being built around the GriffamDev Google Calendar.",
  items: [
    "Available times in your time zone",
    "Google Calendar synchronization",
    "Confirmation emails and reminders",
    "Cancellation and rescheduling",
  ],
  links: [{ href: "/contact", label: "Contact information" }],
};
export default function Page() {
  return <SectionPage {...content} />;
}
