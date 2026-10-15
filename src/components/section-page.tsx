import Link from "next/link";
type Props = {
  eyebrow: string;
  title: string;
  description: string;
  items?: readonly string[];
  links?: readonly { href: string; label: string }[];
};
export function SectionPage({
  eyebrow,
  title,
  description,
  items = [],
  links = [],
}: Props) {
  return (
    <section className="page-section">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">{description}</p>
      <div className="notice">
        <span className="status-dot" aria-hidden="true" /> In development — this
        feature is not available yet.
      </div>
      {items.length > 0 && (
        <div className="planned">
          <h2>What’s planned</h2>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions">
        {links.map((link) => (
          <Link className="button secondary" key={link.href} href={link.href}>
            {link.label} <span aria-hidden="true">↗</span>
          </Link>
        ))}
        <Link href="/">Back to home</Link>
      </div>
    </section>
  );
}
