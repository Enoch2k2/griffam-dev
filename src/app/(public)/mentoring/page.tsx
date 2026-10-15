import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Mentoring" };
const content = {
  eyebrow: "Mentoring",
  title: "Learn by building.",
  description: "Paid coding mentorship is planned for a later release.",
  items: [
    "Session offerings and transparent pricing",
    "Student bookings and resources",
    "Payment and cancellation policies",
  ],
  links: [{ href: "/learn", label: "Explore learning" }],
};
export default function Page() {
  return <SectionPage {...content} />;
}
