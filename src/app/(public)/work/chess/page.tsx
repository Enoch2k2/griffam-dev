import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Interactive demo" };
const content = {
  eyebrow: "Interactive demo",
  title: "A thinking opponent. A conversation.",
  description:
    "Chess with a conversational AI is part of the launch plan. The game is not playable yet.",
  items: [
    "Custom board and move history",
    "Engine-backed legal moves and difficulty levels",
    "Position-aware AI chat and optional coaching",
    "Guest play and usage limits",
  ],
  links: [],
};
export default function Page() {
  return <SectionPage {...content} />;
}
