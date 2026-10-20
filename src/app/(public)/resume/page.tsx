import Link from "next/link";
import { site } from "@/config/site";
export const metadata = { title: "Resume" };
export default function Resume() {
  return <section className="page-section">
    <p className="eyebrow">Experience, at a glance</p><h1>Enoch Griffith.</h1>
    <p className="lead">Full Stack Software Engineer.</p>
    <p className="body-copy">A downloadable resume isn’t available here yet. You can view my LinkedIn profile or get in touch to discuss an opportunity.</p>
    <div className="actions"><a className="button" href={site.linkedin} target="_blank" rel="noopener noreferrer">View LinkedIn ↗</a><Link href="/contact">Get in touch</Link></div>
  </section>;
}
