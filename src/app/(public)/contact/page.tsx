import { SectionPage } from "@/components/section-page";
import { site } from "@/config/site";
export const metadata = { title: "Contact" };
const content = {
  eyebrow: "Contact",
  title: "Start a conversation.",
  description:
    "You can connect with Enoch Griffith on LinkedIn while the inquiry form is being built.",
  items: ["Project inquiry form", "Email confirmation of your inquiry"],
  links: [],
};
export default function Page() {
  return (
    <>
      <SectionPage {...content} />
      <p className="contact-link">
        <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
          Connect on LinkedIn ↗
        </a>
      </p>
    </>
  );
}
