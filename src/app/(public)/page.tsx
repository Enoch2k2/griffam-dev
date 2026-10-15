import Link from "next/link";
import { site } from "@/config/site";
const areas = [
  {
    number: "01",
    title: "Engineering",
    text: "Web applications and custom tools, from interface to database.",
    href: "/services",
    label: "Explore services",
  },
  {
    number: "02",
    title: "AI, in practice",
    text: "A chess opponent you can talk to. An interactive AI demo, planned for launch.",
    href: "/work/chess",
    label: "Explore the chess demo",
  },
  {
    number: "03",
    title: "Learn together",
    text: "Articles, coding videos, and a future home for one-to-one mentorship.",
    href: "/learn",
    label: "Explore learning",
  },
];
export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">
          {site.owner} / {site.title}
        </p>
        <h1>
          Thoughtful software.
          <br />
          <span>Built from end to end.</span>
        </h1>
        <p className="lead">
          I’m Enoch, the engineer behind GriffamDev. I build web applications,
          custom tools, and AI-powered experiences.
        </p>
        <div className="actions">
          <Link className="button" href="/work">
            Explore my work <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/about">
            Meet the engineer →
          </Link>
        </div>
        <p className="preview-note">
          The foundation is taking shape. Projects, booking, and learning
          experiences are in development.
        </p>
      </section>
      <section className="overview" aria-labelledby="overview-title">
        <div className="section-heading">
          <p className="eyebrow">Inside GriffamDev</p>
          <h2 id="overview-title">Build. Explore. Learn.</h2>
        </div>
        <div className="cards">
          {areas.map((area) => (
            <article className="feature" key={area.number}>
              <span className="number">{area.number}</span>
              <h3>{area.title}</h3>
              <p>{area.text}</p>
              <Link href={area.href}>
                {area.label} <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="closing">
        <div>
          <p className="eyebrow">Let’s connect</p>
          <h2>Have something in mind?</h2>
        </div>
        <Link className="button secondary" href="/contact">
          Get in touch ↗
        </Link>
      </section>
    </>
  );
}
