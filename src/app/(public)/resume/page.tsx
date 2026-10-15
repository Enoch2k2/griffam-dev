import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Resume" };
const content = {
  eyebrow: "Resume",
  title: "Experience, at a glance.",
  description:
    "Enoch Griffith · Full Stack Software Engineer. A resume has not been uploaded yet.",
  items: [
    "Public PDF preview and download",
    "Resume replacement through the admin area",
  ],
  links: [{ href: "/about", label: "About Enoch" }],
};
export default function Page() {
  return <SectionPage {...content} />;
}
