import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Learn" };
const content = {
  eyebrow: "Learn",
  title: "A place to stay curious.",
  description: "Explore the learning areas taking shape at GriffamDev.",
  items: [
    "Technical articles",
    "Coding videos and resources",
    "One-to-one mentoring",
  ],
  links: [
    { href: "/learn/blog", label: "Blog" },
    { href: "/learn/videos", label: "Videos" },
    { href: "/mentoring", label: "Mentoring" },
  ],
};
export default function Page() {
  return <SectionPage {...content} />;
}
