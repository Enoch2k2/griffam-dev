import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Dashboard" };
export default function Page() {
  return (
    <div className="shell">
      <main id="main">
        <SectionPage
          eyebrow="GriffamDev / dashboard"
          title="Your future dashboard."
          description="Appointments and mentoring resources will appear here after authentication is implemented."
        />
      </main>
    </div>
  );
}
