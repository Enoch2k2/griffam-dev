import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigation } from "@/config/site";
import { BrandLogo } from "@/components/brand-logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <BrandLogo />
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
