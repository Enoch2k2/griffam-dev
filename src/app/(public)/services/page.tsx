import Link from "next/link";
export const metadata = { title: "Services", description: "Full-stack web applications, integrations, custom tools, and AI features by Enoch Griffith." };
const services = [
  { title: "Web applications", text: "Interfaces, backend services, and databases designed to work together. Bring a new idea or an existing application you want to improve.", details: "Responsive interfaces · APIs · Data modeling" },
  { title: "Integrations & custom tools", text: "Connect the systems you use and turn repetitive tasks into practical workflows. Start with the manual process that is taking up your time.", details: "Third-party integrations · Internal tools · Workflow automation" },
  { title: "AI-powered features", text: "Explore where AI can help within a real product, with clear boundaries for user data, usage, and behavior when a provider is unavailable.", details: "Conversational features · API integration · Evaluation and safeguards" },
];
export default function Services() {
  return <section className="page-section">
    <p className="eyebrow">Full-stack engineering</p>
    <h1>From idea to working software.</h1>
    <p className="lead">I build across the interface, server, and database. GriffamDev is for small businesses, startups, and engineering teams looking for a hands-on software engineer.</p>
    <div className="cards service-cards">{services.map(service => <article className="feature" key={service.title}>
      <h2>{service.title}</h2><p>{service.text}</p><p className="service-details">{service.details}</p>
    </article>)}</div>
    <section className="content-section" aria-labelledby="process-title">
      <p className="eyebrow">How we can work together</p><h2 id="process-title">Understand. Scope. Build.</h2>
      <ol className="process-list">
        <li><strong>Understand the need.</strong> We discuss the problem, who will use the software, and what success would mean.</li>
        <li><strong>Agree on scope.</strong> We identify priorities, constraints, and a practical first milestone before committing to the work.</li>
        <li><strong>Build and review.</strong> Work progresses in reviewable steps, with testing and feedback along the way.</li>
      </ol>
      <p className="body-copy">Pricing and timing depend on the scope. The initial project discovery call is free and lasts 30 minutes; online scheduling is still in development.</p>
      <div className="actions"><Link className="button" href="/contact">Discuss your project ↗</Link><Link href="/work">Explore my work</Link></div>
    </section>
  </section>;
}
