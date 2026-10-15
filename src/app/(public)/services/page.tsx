import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Services" };
const content = {
  eyebrow: "Services",
  title: "From idea to working software.",
  description: "Full-stack engineering through GriffamDev.",
  items: [
    "Custom web applications",
    "Integrations and business tools",
    "AI-powered experiences",
  ],
  links: [
    { href: "/book", label: "Consultation booking" },
    { href: "/mentoring", label: "Coding mentorship" },
  ],
};
export default function Page() {
  return <SectionPage {...content} />;
}
