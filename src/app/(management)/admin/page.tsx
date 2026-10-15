import { SectionPage } from "@/components/section-page";
export const metadata = { title: "Admin" };
export default function Page() {
  return (
    <div className="shell">
      <main id="main">
        <SectionPage
          eyebrow="GriffamDev / admin"
          title="Administration is not enabled."
          description="This placeholder contains no private data or management actions. Authentication and authorization must be implemented before admin features are added."
        />
      </main>
    </div>
  );
}
