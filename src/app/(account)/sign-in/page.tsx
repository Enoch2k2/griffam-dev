import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Sign-In" };
export default function Page() {
  return (
    <div className="shell">
      <main id="main">
        <SectionPage
          eyebrow="GriffamDev / sign-in"
          title="Accounts are on the way."
          description="Client and student sign-in is not enabled yet."
        />
      </main>
    </div>
  );
}
