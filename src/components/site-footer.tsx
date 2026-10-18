import Link from "next/link";
import { site } from "@/config/site";
import { BrandLogo } from "@/components/brand-logo";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <BrandLogo />
        <p>
          {site.owner} · {site.title}
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/contact">Contact</Link>
        <Link href="/resume">Resume</Link>
        <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn ↗
        </a>
      </nav>
    </footer>
  );
}
