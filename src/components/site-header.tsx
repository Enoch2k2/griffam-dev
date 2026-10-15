import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigation, site } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="GriffamDev home">
        {site.name}
        <span aria-hidden="true">.</span>
      </Link>
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <Link href="/sign-in">Sign in</Link>
        <Link className="button small" href="/book">
          Book a call <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}
