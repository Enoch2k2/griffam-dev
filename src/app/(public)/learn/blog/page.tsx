import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Blog" };
const content = {
  eyebrow: "Blog",
  title: "Notes from the build.",
  description: "Articles and engineering lessons will live here.",
  items: [
    "Article listings and individual posts",
    "Drafts and previews in the custom admin editor",
  ],
  links: [],
};
export default function Page() {
  return <SectionPage {...content} />;
}
