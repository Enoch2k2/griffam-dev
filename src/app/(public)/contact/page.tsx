import { InquiryForm } from "@/features/inquiries/inquiry-form";
import { site } from "@/config/site";
export const metadata = { title: "Contact", description: "Tell Enoch Griffith about your web application, integration, or AI project." };
export default function Contact() {
  return (
    <section className="page-section">
      <p className="eyebrow">Let’s connect</p>
      <h1>Start with the problem.</h1>
      <p className="lead">Have an idea, a workflow to improve, or an application that needs attention? Tell me what you have in mind and we can discuss whether we’re a good fit.</p>
      <InquiryForm />
      <p className="body-copy">Prefer another way to connect? <a href={site.linkedin} target="_blank" rel="noopener noreferrer">Message me on LinkedIn ↗</a></p>
    </section>
  );
}
