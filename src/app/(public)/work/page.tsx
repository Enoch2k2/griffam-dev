import Link from "next/link";
export const metadata = { title: "Selected work", description: "Explore Enoch Griffith’s full-stack projects: a Flask project generator, Griffam Finance, and GriffamDev." };
export default function Work() {
  return <section className="page-section">
    <p className="eyebrow">Selected work</p><h1>Software with a purpose.</h1>
    <p className="lead">Tools that help people get started, stay organized, and bring their ideas to life.</p>
    <article className="project-card">
      <p className="eyebrow">Developer tooling</p><h2>Flatiron School Flask Project Generator</h2>
      <p className="body-copy">A starting point for students building their final projects, so they can focus on their ideas instead of setting up an application from scratch.</p>
      <dl className="project-facts">
        <div><dt>My role</dt><dd>Creator</dd></div>
        <div><dt>What it does</dt><dd>Generates a barebones React application with a Flask backend and PostgreSQL database, with a head start on deployment to Render.</dd></div>
        <div><dt>Result</dt><dd>Students used the generator to start their final projects. I provided it to Flatiron School for future use.</dd></div>
        <div><dt>Technology</dt><dd>React, Flask, and PostgreSQL.</dd></div>
      </dl>
      <div className="actions"><a href="https://github.com/Enoch2k2/flatiron-flask-project-generator" target="_blank" rel="noopener noreferrer">Explore the repository ↗</a></div>
    </article>
    <article className="project-card">
      <p className="eyebrow">Personal finance application</p><h2>Griffam Finance</h2>
      <p className="body-copy">A place to track finances across multiple accounts and plan toward long-term financial goals.</p>
      <dl className="project-facts">
        <div><dt>My role</dt><dd>Owner</dd></div>
        <div><dt>What it does</dt><dd>Brings financial tracking and future planning into one application.</dd></div>
        <div><dt>Purpose</dt><dd>Help people understand their finances across accounts and make plans for the future.</dd></div>
      </dl>
      <div className="actions"><a href="https://griffam-finance.onrender.com/" target="_blank" rel="noopener noreferrer">Visit Griffam Finance ↗</a></div>
    </article>
    <article className="project-card">
      <p className="eyebrow">Personal project · In development</p><h2>GriffamDev</h2>
      <p className="body-copy">This website is an ongoing full-stack project: a public home for my work, backed by custom tooling for running a freelance business.</p>
      <dl className="project-facts">
        <div><dt>My role</dt><dd>Full Stack Software Engineer</dd></div>
        <div><dt>Built so far</dt><dd>Responsive public pages, light and dark themes, Google owner authentication, and a PostgreSQL foundation.</dd></div>
        <div><dt>Technology</dt><dd>Next.js, React, TypeScript, PostgreSQL, Drizzle, Better Auth, Render, and Neon.</dd></div>
        <div><dt>Coming next</dt><dd>Custom publishing, Google Calendar booking, and playable chess with AI conversation.</dd></div>
      </dl>
      <div className="actions"><a href="https://github.com/Enoch2k2/griffam-dev" target="_blank" rel="noopener noreferrer">Explore the repository ↗</a><Link href="/work/chess">About the planned chess demo</Link></div>
    </article>
    <div className="actions"><Link className="button" href="/contact">Have a project in mind? ↗</Link></div>
  </section>;
}
