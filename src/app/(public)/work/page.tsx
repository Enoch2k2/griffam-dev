import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Selected work" };
const content = {
  eyebrow: "Selected work",
  title: "Software with a purpose.",
  description:
    "Case studies will explore the problems, decisions, and results behind my projects.",
  items: [
    "Project case studies with verified outcomes",
    "AI chess demo available at launch",
  ],
  links: [{ href: "/work/chess", label: "AI chess demo" }],
};
export default function Page() {
  return <SectionPage {...content} />;
}
