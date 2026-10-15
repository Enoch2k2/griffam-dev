import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell page-section">
      <p className="eyebrow">404</p>
      <h1>That page isn’t here.</h1>
      <p className="lead">Try the homepage to find your way back.</p>
      <Link className="button" href="/">
        Back to GriffamDev
      </Link>
    </main>
  );
}
