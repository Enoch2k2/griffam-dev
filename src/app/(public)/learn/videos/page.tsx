import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Videos" };
const content = {
  eyebrow: "Videos",
  title: "Code, explained.",
  description: "A home for coding tutorials and development videos.",
  items: ["Video pages with summaries", "Related code and learning resources"],
  links: [],
};
export default function Page() {
  return <SectionPage {...content} />;
}
