import Link from "next/link";
import { site } from "@/config/site";
import { OwnerPortrait } from "@/components/owner-portrait";
export const metadata = { title: "About Enoch" };
export default function About() {
  return (
    <section className="page-section about-with-portrait">
      <div>
        <p className="eyebrow">The person behind GriffamDev</p>
        <h1>Enoch Griffith.</h1>
        <p className="lead">Full Stack Software Engineer.</p>
        <p className="body-copy">
          GriffamDev is my home for software engineering, custom tools, and
          AI-powered experiences. It will also be a place to share what I learn
          through articles, coding videos, and mentoring.
        </p>
        <div className="actions">
          <Link className="button" href="/resume">
            Resume ↗
          </Link>
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn ↗
          </a>
        </div>
      </div>
      <OwnerPortrait />
    </section>
  );
}
