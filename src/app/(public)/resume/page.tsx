import { Suspense } from "react";
import { connection } from "next/server";
import { resumeStatus } from "@/server/resume/storage";
import Link from "next/link";
import { site } from "@/config/site";
export const metadata = { title: "Resume" };
export default function Resume() {
  return <section className="page-section">
    <p className="eyebrow">Experience, at a glance</p><h1>Enoch Griffith.</h1>
    <p className="lead">Full Stack Software Engineer.</p>
    <Suspense fallback={<p role="status">Checking resume availability…</p>}><Download /></Suspense>
    <div className="actions"><a className="button" href={site.linkedin} target="_blank" rel="noopener noreferrer">View LinkedIn ↗</a><Link href="/contact">Get in touch</Link></div>
  </section>;
}

async function Download() {
  await connection();
  const result = await resumeStatus();
  if (result.status === "available") return <div className="actions"><a className="button" href="/api/resume">Download resume (PDF)</a></div>;
  return <p className="body-copy">{result.status === "unavailable" ? "The resume download is temporarily unavailable." : "A downloadable resume isn’t available here yet."} You can view my LinkedIn profile or get in touch to discuss an opportunity.</p>;
}
